import time
import datetime
import certifi
import httpx
from typing import Dict, Any, Optional

# WMO Weather interpretation codes
WMO_CODE_MAP = {
    0: ("Clear sky", "sunny"),
    1: ("Mainly clear", "partly-cloudy"),
    2: ("Partly cloudy", "partly-cloudy"),
    3: ("Overcast", "cloudy"),
    45: ("Foggy", "fog"),
    48: ("Depositing rime fog", "fog"),
    51: ("Light drizzle", "drizzle"),
    53: ("Moderate drizzle", "drizzle"),
    55: ("Dense drizzle", "drizzle"),
    61: ("Slight rain", "rain"),
    63: ("Moderate rain", "rain"),
    65: ("Heavy rain", "heavy-rain"),
    71: ("Slight snow", "snow"),
    80: ("Slight rain showers", "rain"),
    81: ("Moderate rain showers", "rain"),
    82: ("Violent rain showers", "heavy-rain"),
    95: ("Thunderstorm", "thunderstorm"),
    96: ("Thunderstorm with hail", "thunderstorm"),
}

class WeatherService:
    def __init__(self, cache_ttl_seconds: int = 900):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = cache_ttl_seconds
        self.ca_file = certifi.where()

    def _get_cache_key(self, lat: float, lng: float) -> str:
        return f"{round(lat, 3)}_{round(lng, 3)}"

    def get_weather(self, lat: float, lng: float, force_refresh: bool = False) -> Dict[str, Any]:
        cache_key = self._get_cache_key(lat, lng)
        now = time.time()

        if not force_refresh and cache_key in self.cache:
            entry = self.cache[cache_key]
            if now - entry["timestamp"] < self.cache_ttl:
                cached_data = dict(entry["data"])
                cached_data["data_freshness"] = "cached"
                cached_data["cached_age_seconds"] = int(now - entry["timestamp"])
                return cached_data

        try:
            url = (
                f"https://api.open-meteo.com/v1/forecast"
                f"?latitude={lat}&longitude={lng}"
                f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m"
                f"&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,weather_code"
                f"&forecast_days=3"
                f"&timezone=Asia%2FKolkata"
            )
            import ssl
            ssl_ctx = ssl.create_default_context(cafile=self.ca_file)
            with httpx.Client(verify=ssl_ctx, timeout=8.0) as client:
                res = client.get(url, headers={"User-Agent": "GreenCityAI/1.0"})
                res.raise_for_status()
                payload = res.json()

            current = payload.get("current", {})
            w_code = current.get("weather_code", 0)
            condition_text, condition_icon = WMO_CODE_MAP.get(w_code, ("Fair", "cloudy"))

            hourly = payload.get("hourly", {})
            hourly_forecast = []
            if hourly and "time" in hourly:
                times = hourly.get("time", [])[:24]
                temps = hourly.get("temperature_2m", [])[:24]
                humids = hourly.get("relative_humidity_2m", [])[:24]
                precips = hourly.get("precipitation_probability", [])[:24]
                for i in range(len(times)):
                    hourly_forecast.append({
                        "time": times[i],
                        "temperature_c": temps[i] if i < len(temps) else None,
                        "humidity_pct": humids[i] if i < len(humids) else None,
                        "precipitation_probability": precips[i] if i < len(precips) else 0,
                    })

            result = {
                "latitude": lat,
                "longitude": lng,
                "temperature_c": current.get("temperature_2m", 28.0),
                "apparent_temperature_c": current.get("apparent_temperature", current.get("temperature_2m", 28.0)),
                "relative_humidity_pct": current.get("relative_humidity_2m", 45),
                "precipitation_mm": current.get("precipitation", 0.0),
                "weather_code": w_code,
                "condition_text": condition_text,
                "condition_icon": condition_icon,
                "wind_speed_kmh": current.get("wind_speed_10m", 10.0),
                "wind_direction_deg": current.get("wind_direction_10m", 90),
                "observation_time": current.get("time", datetime.datetime.now().isoformat()),
                "hourly_forecast": hourly_forecast,
                "provider": "Open-Meteo Numerical Weather Prediction",
                "provider_attribution": "Weather data by Open-Meteo.com (CC-BY 4.0)",
                "data_freshness": "live_observation",
                "is_fallback": False
            }

            self.cache[cache_key] = {"data": result, "timestamp": now}
            return result

        except Exception as exc:
            # If cache has old data, return it with warning
            if cache_key in self.cache:
                entry = self.cache[cache_key]
                stale_data = dict(entry["data"])
                stale_data["data_freshness"] = "stale_fallback"
                stale_data["warning"] = f"Provider request failed: {str(exc)}. Displaying previous observation."
                return stale_data

            # Graceful local fallback for Solapur region
            return {
                "latitude": lat,
                "longitude": lng,
                "temperature_c": 29.5,
                "apparent_temperature_c": 31.0,
                "relative_humidity_pct": 42,
                "precipitation_mm": 0.0,
                "weather_code": 1,
                "condition_text": "Mainly clear (Offline estimate)",
                "condition_icon": "sunny",
                "wind_speed_kmh": 12.0,
                "wind_direction_deg": 95,
                "observation_time": datetime.datetime.now().isoformat(),
                "hourly_forecast": [],
                "provider": "Solapur Municipal Regional Climatology Baseline",
                "provider_attribution": "GreenCity AI Climatological Model",
                "data_freshness": "fallback_estimate",
                "is_fallback": True,
                "error_details": str(exc)
            }

weather_service = WeatherService()
