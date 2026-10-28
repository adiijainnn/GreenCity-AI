"""
GreenCity AI — Park Visit Time & Environmental Suitability Engine
Calculates optimal visit times for parks and urban green spaces in Solapur,
factoring in Open-Meteo hourly weather, Indian CPCB NAQI air quality forecasts,
apparent temperature, solar exposure, and activity-specific health thresholds.
"""

import time
import datetime
from zoneinfo import ZoneInfo
import certifi
import ssl
import httpx
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from apps.api.models import GreenSpace
from apps.api.services.air_quality_service import compute_indian_naqi
from apps.api.services.weather_service import WMO_CODE_MAP

SOLAPUR_TZ = ZoneInfo("Asia/Kolkata")

# Solapur fallback default location (Siddheshwar Temple Lake Promenade)
DEFAULT_SOLAPUR_LAT = 17.6710
DEFAULT_SOLAPUR_LNG = 75.9080

class ParkVisitTimeService:
    def __init__(self, cache_ttl_seconds: int = 900):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = cache_ttl_seconds
        self.ca_file = certifi.where()

    def _get_cache_key(self, identifier: str, date_str: str) -> str:
        return f"{identifier}_{date_str}"

    def resolve_park(
        self,
        park_id: Optional[str],
        lat: Optional[float],
        lng: Optional[float],
        db: Optional[Session]
    ) -> Dict[str, Any]:
        """
        Resolves park identity, canonical coordinates, canopy coverage,
        and amenities from DB or curated Solapur places.
        """
        # 1. Try DB lookup by UUID or name
        if park_id and db:
            gs = db.query(GreenSpace).filter(GreenSpace.id == park_id).first()
            if not gs:
                # Try search by cleaned keyword
                clean_term = park_id.replace("landmark-", "").replace("-", " ").strip()
                gs = db.query(GreenSpace).filter(GreenSpace.name.ilike(f"%{clean_term}%")).first()
            if gs:
                return {
                    "id": str(gs.id),
                    "name": gs.name,
                    "category": gs.category,
                    "latitude": float(gs.latitude),
                    "longitude": float(gs.longitude),
                    "canopy_percentage": float(gs.canopy_percentage or 40.0),
                    "tree_count": int(gs.tree_count or 100),
                    "area_m2": float(gs.area_m2 or 10000.0),
                    "source": "database_greenspace"
                }

        # 2. Try Canonical Solapur places from place_search_service
        from apps.api.services.place_search_service import SOLAPUR_GAZETTEER
        if park_id:
            pid_clean = park_id.lower().replace("landmark-", "").replace("-", " ").strip()
            for p in SOLAPUR_GAZETTEER:
                p_aliases = [a.lower() for a in p.get("aliases", [])]
                p_name_lower = p.get("name", "").lower()
                p_id_lower = p.get("id", "").lower()
                if (p.get("id") == park_id or
                    p_name_lower == park_id.lower() or
                    pid_clean in p_name_lower or
                    pid_clean in p_id_lower or
                    any(pid_clean in a or a in pid_clean for a in p_aliases)):
                    return {
                        "id": p.get("id"),
                        "name": p.get("name"),
                        "category": p.get("category", "Public Park"),
                        "latitude": float(p.get("latitude")),
                        "longitude": float(p.get("longitude")),
                        "canopy_percentage": 50.0 if p.get("is_green_space") else 25.0,
                        "tree_count": 250 if p.get("is_green_space") else 40,
                        "area_m2": 25000.0,
                        "source": "canonical_registry"
                    }

        # 3. Explicit lat/lng provided
        if lat is not None and lng is not None:
            return {
                "id": f"custom_{round(lat, 4)}_{round(lng, 4)}",
                "name": "Custom Location",
                "category": "Green Space",
                "latitude": float(lat),
                "longitude": float(lng),
                "canopy_percentage": 35.0,
                "tree_count": 50,
                "area_m2": 5000.0,
                "source": "custom_coordinates"
            }

        # 4. Default: First green space from DB or Siddheshwar Lake
        if db:
            first_gs = db.query(GreenSpace).first()
            if first_gs:
                return {
                    "id": str(first_gs.id),
                    "name": first_gs.name,
                    "category": first_gs.category,
                    "latitude": float(first_gs.latitude),
                    "longitude": float(first_gs.longitude),
                    "canopy_percentage": float(first_gs.canopy_percentage or 40.0),
                    "tree_count": int(first_gs.tree_count or 100),
                    "area_m2": float(first_gs.area_m2 or 10000.0),
                    "source": "database_greenspace"
                }

        return {
            "id": "landmark-siddheshwar-lake",
            "name": "Siddheshwar Temple Lake & Sacred Promenade",
            "category": "Historic Wetland & Sacred Lake",
            "latitude": DEFAULT_SOLAPUR_LAT,
            "longitude": DEFAULT_SOLAPUR_LNG,
            "canopy_percentage": 55.0,
            "tree_count": 450,
            "area_m2": 150000.0,
            "source": "solapur_default"
        }

    def fetch_weather_and_air_forecast(
        self,
        lat: float,
        lng: float
    ) -> Tuple[Dict[str, Any], Dict[str, Any], bool]:
        """
        Queries Open-Meteo Weather and Air Quality APIs with SSL verification
        and request timeouts. Returns (weather_payload, air_quality_payload, is_fallback).
        """
        weather_payload: Dict[str, Any] = {}
        aq_payload: Dict[str, Any] = {}
        is_fallback = False

        ssl_ctx = ssl.create_default_context(cafile=self.ca_file)

        # 1. Weather API (extended to 14 days forecast + 7 days history to support user-chosen dates)
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m"
            f"&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m"
            f"&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min"
            f"&forecast_days=14"
            f"&past_days=7"
            f"&timezone=Asia%2FKolkata"
        )

        # 2. Air Quality API (7 days forecast + 7 days history)
        aq_url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality"
            f"?latitude={lat}&longitude={lng}"
            f"&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi"
            f"&hourly=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone,us_aqi"
            f"&forecast_days=7"
            f"&past_days=7"
            f"&timezone=Asia%2FKolkata"
        )

        try:
            with httpx.Client(verify=ssl_ctx, timeout=8.0) as client:
                w_res = client.get(weather_url, headers={"User-Agent": "GreenCityAI/1.0"})
                w_res.raise_for_status()
                weather_payload = w_res.json()

                aq_res = client.get(aq_url, headers={"User-Agent": "GreenCityAI/1.0"})
                aq_res.raise_for_status()
                aq_payload = aq_res.json()
        except Exception:
            is_fallback = True
            # Build deterministic Solapur climatological baseline
            now_dt = datetime.datetime.now(SOLAPUR_TZ)
            today_str = now_dt.strftime("%Y-%m-%d")
            tomorrow_str = (now_dt + datetime.timedelta(days=1)).strftime("%Y-%m-%d")

            weather_payload = {
                "current": {
                    "time": now_dt.strftime("%Y-%m-%dT%H:00"),
                    "temperature_2m": 28.5,
                    "apparent_temperature": 29.5,
                    "relative_humidity_2m": 48,
                    "precipitation": 0.0,
                    "weather_code": 1,
                    "wind_speed_10m": 11.0,
                    "wind_direction_10m": 85
                },
                "daily": {
                    "time": [today_str, tomorrow_str],
                    "sunrise": [f"{today_str}T06:19", f"{tomorrow_str}T06:19"],
                    "sunset": [f"{today_str}T18:05", f"{tomorrow_str}T18:04"],
                    "temperature_2m_max": [33.5, 34.0],
                    "temperature_2m_min": [21.0, 20.5]
                },
                "hourly": {
                    "time": [f"{today_str}T{h:02d}:00" for h in range(24)],
                    "temperature_2m": [22 + (12 * (1 - abs(h - 14) / 10)) if 4 <= h <= 20 else 22 for h in range(24)],
                    "apparent_temperature": [23 + (13 * (1 - abs(h - 14) / 10)) if 4 <= h <= 20 else 23 for h in range(24)],
                    "relative_humidity_2m": [70 - (35 * (1 - abs(h - 14) / 10)) if 4 <= h <= 20 else 65 for h in range(24)],
                    "precipitation_probability": [0] * 24,
                    "precipitation": [0.0] * 24,
                    "weather_code": [0 if 6 <= h <= 18 else 1 for h in range(24)],
                    "wind_speed_10m": [8.0 if h < 10 else 14.0 for h in range(24)]
                }
            }

            aq_payload = {
                "current": {
                    "time": now_dt.strftime("%Y-%m-%dT%H:00"),
                    "pm2_5": 38.0,
                    "pm10": 68.0,
                    "carbon_monoxide": 240.0,
                    "nitrogen_dioxide": 18.0,
                    "ozone": 52.0
                },
                "hourly": {
                    "time": [f"{today_str}T{h:02d}:00" for h in range(24)],
                    # Solapur diurnal curve: morning & evening peak, cleaner afternoon
                    "pm2_5": [45 if (7 <= h <= 10 or 19 <= h <= 22) else 30 for h in range(24)],
                    "pm10": [80 if (7 <= h <= 10 or 19 <= h <= 22) else 55 for h in range(24)],
                    "carbon_monoxide": [280] * 24,
                    "nitrogen_dioxide": [22] * 24,
                    "ozone": [65 if 12 <= h <= 16 else 35 for h in range(24)]
                }
            }

        return weather_payload, aq_payload, is_fallback

    def evaluate_hour(
        self,
        hour_data: Dict[str, Any],
        canopy_percentage: float = 40.0
    ) -> Dict[str, Any]:
        """
        Deterministic scoring algorithm evaluating an individual forecast hour.
        Produces 0-100 suitability scores, Indian CPCB AQI, limiting factors,
        and activity-specific ratings.
        """
        temp = hour_data.get("temperature_c", 28.0)
        app_temp = hour_data.get("apparent_temperature_c", temp)
        humidity = hour_data.get("humidity_pct", 50)
        wind_kmh = hour_data.get("wind_speed_kmh", 10.0)
        precip_prob = hour_data.get("precip_prob_pct", 0)
        precip_mm = hour_data.get("precip_mm", 0.0)
        w_code = hour_data.get("weather_code", 0)

        pm25 = hour_data.get("pm2_5", 35.0)
        pm10 = hour_data.get("pm10", 60.0)

        # 1. Air Quality calculation (Indian CPCB standard)
        naqi_result = compute_indian_naqi(pm25, pm10)
        aqi = naqi_result["aqi"]
        aqi_category = naqi_result["category"]

        # AQ Score (0 to 100)
        if aqi <= 50:
            aq_score = 100
        elif aqi <= 100:
            aq_score = 85
        elif aqi <= 200:
            aq_score = 55
        elif aqi <= 300:
            aq_score = 25
        elif aqi <= 400:
            aq_score = 10
        else:
            aq_score = 0

        # 2. Thermal Comfort Score (0 to 100)
        # Tree canopy bonus: mitigates up to 2.5°C of heat stress in warm hours
        effective_temp = temp - (canopy_percentage * 0.025 if temp > 30 else 0)

        if 18.0 <= effective_temp <= 26.0:
            thermal_score = 100
        elif 26.0 < effective_temp <= 29.0:
            thermal_score = 88
        elif 29.0 < effective_temp <= 32.0:
            thermal_score = 70
        elif 32.0 < effective_temp <= 35.0:
            thermal_score = 45
        elif 35.0 < effective_temp <= 38.0:
            thermal_score = 20
        elif effective_temp > 38.0:
            thermal_score = 5
        elif 13.0 <= effective_temp < 18.0:
            thermal_score = 85
        else: # < 13°C
            thermal_score = 65

        # Humidity heat index penalty if apparent temperature is much higher
        if app_temp - temp >= 3.0 and temp >= 30.0:
            thermal_score = max(0, thermal_score - 12)

        # 3. Precipitation Score (0 to 100)
        if precip_prob < 15 and precip_mm < 0.1:
            precip_score = 100
        elif precip_prob < 35:
            precip_score = 75
        elif precip_prob < 60 or w_code in (51, 61, 80): # Light rain / drizzle
            precip_score = 45
        elif precip_prob >= 60 or w_code in (53, 63, 81): # Moderate rain
            precip_score = 20
        else: # Heavy rain / thunderstorm
            precip_score = 0

        # 4. Wind Score (0 to 100)
        if 3.0 <= wind_kmh <= 18.0:
            wind_score = 100
        elif 18.0 < wind_kmh <= 28.0:
            wind_score = 85
        elif 28.0 < wind_kmh <= 40.0:
            wind_score = 50
        elif wind_kmh > 40.0:
            wind_score = 15
        else: # Dead calm under heat
            wind_score = 80 if temp < 30 else 60

        # 5. Composite Base Score
        base_score = (
            (aq_score * 0.40) +
            (thermal_score * 0.35) +
            (precip_score * 0.15) +
            (wind_score * 0.10)
        )

        # -------------------------------------------------------------
        # CRITICAL SAFETY OVERRIDES
        # High pollution or extreme weather must never be masked by good factors
        # -------------------------------------------------------------
        score = base_score
        limiting_factors: List[str] = []

        if aqi > 400: # Severe
            score = 0
            limiting_factors.append(f"Severe CPCB air quality hazard (AQI {aqi})")
        elif aqi > 300: # Very Poor
            score = min(score, 15)
            limiting_factors.append(f"Very poor air quality (AQI {aqi}, PM2.5: {round(pm25, 1)} µg/m³)")
        elif aqi > 200: # Poor
            score = min(score, 35)
            limiting_factors.append(f"Poor air quality (AQI {aqi}, PM2.5: {round(pm25, 1)} µg/m³)")
        elif aqi > 120:
            limiting_factors.append(f"Moderate particulate pollution (AQI {aqi})")

        if temp >= 37.0:
            score = min(score, 20)
            limiting_factors.append(f"Extreme midday heat ({temp}°C, feels like {app_temp}°C)")
        elif temp >= 33.0:
            score = min(score, 50)
            limiting_factors.append(f"High daytime temperature ({temp}°C)")

        if w_code in (65, 82, 95, 96): # Heavy rain or thunderstorm
            score = min(score, 10)
            limiting_factors.append("Thunderstorm or heavy rain shower")
        elif precip_prob >= 50 or precip_mm >= 1.0:
            score = min(score, 40)
            limiting_factors.append(f"Elevated rain probability ({precip_prob}%)")

        if wind_kmh > 35.0:
            limiting_factors.append(f"Strong gusty winds ({round(wind_kmh, 1)} km/h)")

        score = max(0, min(100, int(round(score))))

        # Rating categorization
        if score >= 80:
            category = "Excellent"
            color = "#10b981" # emerald
        elif score >= 65:
            category = "Good"
            color = "#84cc16" # lime
        elif score >= 45:
            category = "Moderate"
            color = "#eab308" # yellow
        elif score >= 25:
            category = "Poor"
            color = "#f97316" # orange
        else:
            category = "Unfavorable"
            color = "#ef4444" # red

        # -------------------------------------------------------------
        # 6. Activity-Specific Ratings & Criteria
        # -------------------------------------------------------------
        # Walking
        walk_score = (aq_score * 0.35) + (thermal_score * 0.40) + (precip_score * 0.15) + (wind_score * 0.10)
        if aqi > 200: walk_score = min(walk_score, 30)
        if temp > 36: walk_score = min(walk_score, 35)
        walk_score = max(0, min(100, int(round(walk_score))))

        # Jogging
        jog_score = (aq_score * 0.50) + (thermal_score * 0.35) + (precip_score * 0.10) + (wind_score * 0.05)
        if aqi > 100: jog_score = min(jog_score, 45) # Joggers inhale 3x more air volume
        if aqi > 200: jog_score = min(jog_score, 20)
        if temp > 31: jog_score = min(jog_score, 40)
        jog_score = max(0, min(100, int(round(jog_score))))

        # Intensive Exercise
        exercise_score = (aq_score * 0.55) + (thermal_score * 0.35) + (precip_score * 0.05) + (wind_score * 0.05)
        if aqi > 100: exercise_score = min(exercise_score, 35)
        if aqi > 200: exercise_score = min(exercise_score, 10)
        if temp > 30: exercise_score = min(exercise_score, 30)
        exercise_score = max(0, min(100, int(round(exercise_score))))

        # Family Outings (picnic, children, elderly)
        family_score = (aq_score * 0.40) + (thermal_score * 0.30) + (precip_score * 0.20) + (wind_score * 0.10)
        if aqi > 150: family_score = min(family_score, 35) # Sensitive airways in kids/seniors
        if temp > 34: family_score = min(family_score, 30)
        if precip_prob > 40: family_score = min(family_score, 30)
        family_score = max(0, min(100, int(round(family_score))))

        # General Park Visits (sitting, relaxation, photography)
        general_score = (aq_score * 0.35) + (thermal_score * 0.35) + (precip_score * 0.15) + (wind_score * 0.15)
        if aqi > 200: general_score = min(general_score, 35)
        if temp > 37: general_score = min(general_score, 25)
        general_score = max(0, min(100, int(round(general_score))))

        def to_status(s: int) -> Tuple[str, bool, str]:
            if s >= 75:
                return "Recommended", True, "Comfortable conditions for this activity."
            if s >= 55:
                return "Suitable with Caution", True, "Acceptable conditions; take breaks and stay hydrated."
            if s >= 35:
                return "Suboptimal", False, "Conditions are uncomfortably hot or air quality is compromised."
            return "Not Recommended", False, "Environmental conditions exceed healthy safety thresholds."

        w_cat, w_suit, w_adv = to_status(walk_score)
        j_cat, j_suit, j_adv = to_status(jog_score)
        e_cat, e_suit, e_adv = to_status(exercise_score)
        f_cat, f_suit, f_adv = to_status(family_score)
        g_cat, g_suit, g_adv = to_status(general_score)

        condition_text, condition_icon = WMO_CODE_MAP.get(w_code, ("Clear sky", "sunny"))

        return {
            "time": hour_data.get("time"),
            "hour_int": hour_data.get("hour_int"),
            "formatted_time": hour_data.get("formatted_time"),
            "temperature_c": temp,
            "apparent_temperature_c": app_temp,
            "humidity_pct": humidity,
            "wind_speed_kmh": wind_kmh,
            "precip_prob_pct": precip_prob,
            "precip_mm": precip_mm,
            "weather_code": w_code,
            "condition_text": condition_text,
            "condition_icon": condition_icon,
            "pm2_5": pm25,
            "pm10": pm10,
            "indian_aqi": aqi,
            "aqi_category": aqi_category,
            "aqi_color": naqi_result["color"],
            "suitability_score": score,
            "suitability_category": category,
            "suitability_color": color,
            "limiting_factors": limiting_factors,
            "activities": {
                "walking": {"score": walk_score, "category": w_cat, "suitable": w_suit, "advisory": w_adv},
                "jogging": {"score": jog_score, "category": j_cat, "suitable": j_suit, "advisory": j_adv},
                "intensive_exercise": {"score": exercise_score, "category": e_cat, "suitable": e_suit, "advisory": e_adv},
                "family_outing": {"score": family_score, "category": f_cat, "suitable": f_suit, "advisory": f_adv},
                "general_visit": {"score": general_score, "category": g_cat, "suitable": g_suit, "advisory": g_adv},
            }
        }

    def aggregate_visit_windows(
        self,
        evaluated_hours: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Combines hourly evaluations into actionable morning vs evening recommendations,
        detects optimal visit windows, and summarizes main limiting factors.
        """
        # Focus on visiting hours: 05:00 to 21:00
        visiting_hours = [h for h in evaluated_hours if 5 <= h["hour_int"] <= 21]

        # Morning block: 05:00 to 10:00
        morning_hours = [h for h in evaluated_hours if 5 <= h["hour_int"] <= 10]
        # Evening block: 16:00 to 20:00
        evening_hours = [h for h in evaluated_hours if 16 <= h["hour_int"] <= 20]
        # Midday block (often to avoid): 11:00 to 15:00
        midday_hours = [h for h in evaluated_hours if 11 <= h["hour_int"] <= 15]

        avg_m_score = sum(h["suitability_score"] for h in morning_hours) / len(morning_hours) if morning_hours else 0
        avg_e_score = sum(h["suitability_score"] for h in evening_hours) / len(evening_hours) if evening_hours else 0
        avg_m_temp = sum(h["temperature_c"] for h in morning_hours) / len(morning_hours) if morning_hours else 24
        avg_e_temp = sum(h["temperature_c"] for h in evening_hours) / len(evening_hours) if evening_hours else 29
        avg_m_aqi = sum(h["indian_aqi"] for h in morning_hours) / len(morning_hours) if morning_hours else 60
        avg_e_aqi = sum(h["indian_aqi"] for h in evening_hours) / len(evening_hours) if evening_hours else 75

        # Determine morning vs evening comparison
        if avg_m_score >= avg_e_score + 5:
            comparison_verdict = "morning"
            comparison_explanation = (
                f"Morning hours are noticeably better today ({round(avg_m_score)}/100 vs {round(avg_e_score)}/100). "
                f"Ambient temperatures are ~{round(avg_e_temp - avg_m_temp)}°C cooler ({round(avg_m_temp)}°C) "
                f"with cleaner air before evening traffic accumulation."
            )
        elif avg_e_score >= avg_m_score + 5:
            comparison_verdict = "evening"
            comparison_explanation = (
                f"Evening hours are better today ({round(avg_e_score)}/100 vs {round(avg_m_score)}/100). "
                f"The sun sets around dusk with comfortable breezes and favorable dispersion."
            )
        else:
            comparison_verdict = "similar"
            comparison_explanation = (
                f"Both morning ({round(avg_m_score)}/100) and evening ({round(avg_e_score)}/100) offer "
                f"comparable visit quality. Choose morning for cooler temperatures or evening for sunset walks."
            )

        # Find best consecutive 2-3 hour window in visiting hours
        best_window = None
        best_window_score = -1

        for window_size in (2, 3):
            for i in range(len(visiting_hours) - window_size + 1):
                chunk = visiting_hours[i:i + window_size]
                chunk_score = sum(h["suitability_score"] for h in chunk) / window_size
                if chunk_score > best_window_score:
                    best_window_score = chunk_score
                    start_time = chunk[0]["formatted_time"]
                    end_time = chunk[-1]["formatted_time"]
                    # End time label: next hour e.g. 7:00 AM to 9:00 AM
                    end_hour_int = (chunk[-1]["hour_int"] + 1) % 24
                    end_label = datetime.time(end_hour_int, 0).strftime("%I:%M %p").lstrip("0")

                    avg_chunk_temp = round(sum(h["temperature_c"] for h in chunk) / window_size, 1)
                    avg_chunk_aqi = int(round(sum(h["indian_aqi"] for h in chunk) / window_size))

                    best_window = {
                        "start_time": start_time,
                        "end_time": end_label,
                        "window_label": f"{start_time} – {end_label}",
                        "average_score": int(round(chunk_score)),
                        "average_temperature_c": avg_chunk_temp,
                        "average_aqi": avg_chunk_aqi,
                        "hours": [h["formatted_time"] for h in chunk]
                    }

        if not best_window:
            best_window = {
                "start_time": "6:30 AM",
                "end_time": "8:30 AM",
                "window_label": "6:30 AM – 8:30 AM",
                "average_score": 75,
                "average_temperature_c": 23.5,
                "average_aqi": 65,
                "hours": ["6:00 AM", "7:00 AM", "8:00 AM"]
            }

        # Determine best window rating category
        b_score = best_window["average_score"]
        if b_score >= 80:
            rec_cat = "Excellent"
            rec_color = "#10b981"
        elif b_score >= 65:
            rec_cat = "Good"
            rec_color = "#84cc16"
        elif b_score >= 45:
            rec_cat = "Moderate"
            rec_color = "#eab308"
        elif b_score >= 25:
            rec_cat = "Poor"
            rec_color = "#f97316"
        else:
            rec_cat = "Unfavorable"
            rec_color = "#ef4444"

        # Suggested activities for the best window
        suggested_activities = []
        if b_score >= 60:
            suggested_activities.append("Walking & Nature Trail")
            suggested_activities.append("Family Outing & Picnics")
        if b_score >= 70:
            suggested_activities.append("Jogging & Aerobic Run")
        if b_score >= 80:
            suggested_activities.append("Intensive Outdoor Exercise")
        if not suggested_activities:
            suggested_activities.append("Gentle Shaded Walk Only")

        # Period to avoid (lowest scoring consecutive window during daytime)
        avoid_window = None
        if midday_hours:
            worst_midday_temp = max(h["temperature_c"] for h in midday_hours)
            worst_midday_score = min(h["suitability_score"] for h in midday_hours)
            if worst_midday_temp >= 33.0 or worst_midday_score < 50:
                avoid_window = {
                    "window_label": "12:00 PM – 4:00 PM",
                    "reason": f"Peak daytime solar exposure and elevated ambient heat ({round(worst_midday_temp)}°C). High risk of dehydration.",
                    "severity": "high" if worst_midday_temp >= 36 else "moderate"
                }

        # Aggregate limiting factors
        all_limiters = set()
        for h in visiting_hours:
            for lim in h["limiting_factors"]:
                all_limiters.add(lim)

        return {
            "best_window": {
                **best_window,
                "category": rec_cat,
                "color": rec_color,
                "suggested_activities": suggested_activities,
                "explanation": (
                    f"Recommended period offers optimal thermal comfort ({best_window['average_temperature_c']}°C) "
                    f"with compliant Indian CPCB air quality (AQI {best_window['average_aqi']})."
                )
            },
            "morning_vs_evening": {
                "winner": comparison_verdict,
                "morning_score": int(round(avg_m_score)),
                "evening_score": int(round(avg_e_score)),
                "explanation": comparison_explanation
            },
            "avoid_window": avoid_window,
            "limiting_factors": sorted(list(all_limiters))[:4]
        }

    def get_park_visit_times(
        self,
        park_id: Optional[str] = None,
        lat: Optional[float] = None,
        lng: Optional[float] = None,
        date_str: Optional[str] = None,
        db: Optional[Session] = None,
        force_refresh: bool = False
    ) -> Dict[str, Any]:
        """
        Main entry point for park visit time recommendation.
        Returns complete structured response with park metadata, current conditions,
        hourly forecast, best time recommendation, activity suitability, and provenance.
        """
        # Resolve park entity
        park = self.resolve_park(park_id, lat, lng, db)
        p_lat = park["latitude"]
        p_lng = park["longitude"]

        # Local date in Solapur
        now_dt = datetime.datetime.now(SOLAPUR_TZ)
        today_iso = now_dt.strftime("%Y-%m-%d")

        if not date_str:
            target_date_str = today_iso
        else:
            try:
                datetime.date.fromisoformat(date_str)
                target_date_str = date_str
            except ValueError:
                target_date_str = today_iso

        cache_key = self._get_cache_key(str(park["id"]), target_date_str)
        now_ts = time.time()

        if not force_refresh and cache_key in self.cache:
            entry = self.cache[cache_key]
            if now_ts - entry["timestamp"] < self.cache_ttl:
                cached_data = dict(entry["data"])
                cached_data["data_freshness"] = "cached"
                cached_data["cached_age_seconds"] = int(now_ts - entry["timestamp"])
                return cached_data

        # Fetch forecasts
        w_payload, aq_payload, is_fallback = self.fetch_weather_and_air_forecast(p_lat, p_lng)

        # Sunrise & sunset for target date
        daily = w_payload.get("daily", {})
        daily_times = daily.get("time", [])
        daily_sunrises = daily.get("sunrise", [])
        daily_sunsets = daily.get("sunset", [])

        sunrise_str = "06:19 AM"
        sunset_str = "06:05 PM"

        if target_date_str in daily_times:
            idx = daily_times.index(target_date_str)
            if idx < len(daily_sunrises):
                raw_sr = daily_sunrises[idx] # e.g. "2026-10-15T06:19"
                try:
                    sr_dt = datetime.datetime.fromisoformat(raw_sr)
                    sunrise_str = sr_dt.strftime("%I:%M %p").lstrip("0")
                except Exception:
                    pass
            if idx < len(daily_sunsets):
                raw_ss = daily_sunsets[idx]
                try:
                    ss_dt = datetime.datetime.fromisoformat(raw_ss)
                    sunset_str = ss_dt.strftime("%I:%M %p").lstrip("0")
                except Exception:
                    pass

        # Hourly data alignment
        w_hourly = w_payload.get("hourly", {})
        aq_hourly = aq_payload.get("hourly", {})

        w_times = w_hourly.get("time", [])
        w_temps = w_hourly.get("temperature_2m", [])
        w_app_temps = w_hourly.get("apparent_temperature", [])
        w_humids = w_hourly.get("relative_humidity_2m", [])
        w_precip_probs = w_hourly.get("precipitation_probability", [])
        w_precips = w_hourly.get("precipitation", [])
        w_codes = w_hourly.get("weather_code", [])
        w_winds = w_hourly.get("wind_speed_10m", [])

        aq_times = aq_hourly.get("time", [])
        aq_pm25 = aq_hourly.get("pm2_5", [])
        aq_pm10 = aq_hourly.get("pm10", [])

        # Filter to the requested date (or next 24 hours if target date is today)
        matching_indices = []
        for i, t_str in enumerate(w_times):
            if t_str.startswith(target_date_str):
                matching_indices.append(i)

        if not matching_indices:
            matching_indices = list(range(min(24, len(w_times))))

        evaluated_hours = []
        for idx in matching_indices:
            t_str = w_times[idx]
            try:
                dt_obj = datetime.datetime.fromisoformat(t_str)
                h_int = dt_obj.hour
                fmt_time = dt_obj.strftime("%I:%M %p").lstrip("0")
            except Exception:
                h_int = idx % 24
                fmt_time = f"{h_int}:00"

            # Align air quality index
            aq_idx = idx if idx < len(aq_times) else -1
            p25_val = aq_pm25[aq_idx] if (aq_idx >= 0 and aq_idx < len(aq_pm25) and aq_pm25[aq_idx] is not None) else 35.0
            p10_val = aq_pm10[aq_idx] if (aq_idx >= 0 and aq_idx < len(aq_pm10) and aq_pm10[aq_idx] is not None) else 65.0

            hour_dict = {
                "time": t_str,
                "hour_int": h_int,
                "formatted_time": fmt_time,
                "temperature_c": float(w_temps[idx]) if idx < len(w_temps) else 28.0,
                "apparent_temperature_c": float(w_app_temps[idx]) if idx < len(w_app_temps) else 28.0,
                "humidity_pct": int(w_humids[idx]) if idx < len(w_humids) else 50,
                "precip_prob_pct": int(w_precip_probs[idx]) if idx < len(w_precip_probs) else 0,
                "precip_mm": float(w_precips[idx]) if idx < len(w_precips) else 0.0,
                "weather_code": int(w_codes[idx]) if idx < len(w_codes) else 0,
                "wind_speed_kmh": float(w_winds[idx]) if idx < len(w_winds) else 10.0,
                "pm2_5": float(p25_val),
                "pm10": float(p10_val)
            }

            eval_res = self.evaluate_hour(hour_dict, canopy_percentage=park["canopy_percentage"])
            evaluated_hours.append(eval_res)

        # Aggregate recommendations & visit windows
        aggregated = self.aggregate_visit_windows(evaluated_hours)

        # Current conditions snapshot
        w_cur = w_payload.get("current", {})
        aq_cur = aq_payload.get("current", {})

        cur_pm25 = float(aq_cur.get("pm2_5", 32.0) or 32.0)
        cur_pm10 = float(aq_cur.get("pm10", 58.0) or 58.0)
        cur_naqi = compute_indian_naqi(cur_pm25, cur_pm10)
        cur_w_code = int(w_cur.get("weather_code", 0) or 0)
        cur_cond_text, cur_cond_icon = WMO_CODE_MAP.get(cur_w_code, ("Clear sky", "sunny"))

        current_conditions = {
            "temperature_c": float(w_cur.get("temperature_2m", 28.0)),
            "apparent_temperature_c": float(w_cur.get("apparent_temperature", w_cur.get("temperature_2m", 28.0))),
            "humidity_pct": int(w_cur.get("relative_humidity_2m", 48)),
            "wind_speed_kmh": float(w_cur.get("wind_speed_10m", 10.0)),
            "wind_direction_deg": int(w_cur.get("wind_direction_10m", 85)),
            "precipitation_mm": float(w_cur.get("precipitation", 0.0)),
            "weather_code": cur_w_code,
            "condition_text": cur_cond_text,
            "condition_icon": cur_cond_icon,
            "pm2_5": cur_pm25,
            "pm10": cur_pm10,
            "indian_aqi": cur_naqi["aqi"],
            "aqi_category": cur_naqi["category"],
            "aqi_color": cur_naqi["color"],
            "aqi_health_advisory": cur_naqi["health_advisory"],
            "observation_time": w_cur.get("time", now_dt.isoformat())
        }

        # Activity suitability rollup (evaluates across the entire visiting window)
        activity_rollup = {
            "walking": {
                "name": "Walking",
                "recommended_window": aggregated["best_window"]["window_label"],
                "suitability_level": "High" if aggregated["best_window"]["average_score"] >= 65 else "Moderate",
                "score": int(round(sum(h["activities"]["walking"]["score"] for h in evaluated_hours if 5 <= h["hour_int"] <= 21) / max(1, len([h for h in evaluated_hours if 5 <= h["hour_int"] <= 21])))),
                "criteria": "Comfortable up to 32°C and AQI 150. Dense tree canopy provides thermal shade."
            },
            "jogging": {
                "name": "Jogging",
                "recommended_window": f"{sunrise_str} – 8:30 AM",
                "suitability_level": "High" if aggregated["morning_vs_evening"]["morning_score"] >= 70 else "Moderate",
                "score": int(round(sum(h["activities"]["jogging"]["score"] for h in evaluated_hours if 5 <= h["hour_int"] <= 21) / max(1, len([h for h in evaluated_hours if 5 <= h["hour_int"] <= 21])))),
                "criteria": "High ventilation rate; restricted when AQI > 100 or apparent temperature > 31°C."
            },
            "intensive_exercise": {
                "name": "Intensive Outdoor Exercise",
                "recommended_window": f"{sunrise_str} – 8:00 AM",
                "suitability_level": "High" if aggregated["morning_vs_evening"]["morning_score"] >= 75 else "Moderate with caution",
                "score": int(round(sum(h["activities"]["intensive_exercise"]["score"] for h in evaluated_hours if 5 <= h["hour_int"] <= 21) / max(1, len([h for h in evaluated_hours if 5 <= h["hour_int"] <= 21])))),
                "criteria": "Strenuous cardiovascular exertion requires pure air (AQI < 100) and low thermal stress."
            },
            "family_outing": {
                "name": "Family Outing & Children",
                "recommended_window": "4:30 PM – 7:00 PM" if aggregated["morning_vs_evening"]["evening_score"] >= 60 else aggregated["best_window"]["window_label"],
                "suitability_level": "High" if aggregated["best_window"]["average_score"] >= 60 else "Moderate",
                "score": int(round(sum(h["activities"]["family_outing"]["score"] for h in evaluated_hours if 5 <= h["hour_int"] <= 21) / max(1, len([h for h in evaluated_hours if 5 <= h["hour_int"] <= 21])))),
                "criteria": "Sensitive to midday solar UV radiation, precipitation, and evening traffic pollution."
            },
            "general_visit": {
                "name": "General Park Visit & Relaxation",
                "recommended_window": aggregated["best_window"]["window_label"],
                "suitability_level": "High" if aggregated["best_window"]["average_score"] >= 50 else "Moderate",
                "score": int(round(sum(h["activities"]["general_visit"]["score"] for h in evaluated_hours if 5 <= h["hour_int"] <= 21) / max(1, len([h for h in evaluated_hours if 5 <= h["hour_int"] <= 21])))),
                "criteria": "Bench seating and passive strolling; tolerant to broader temperature windows under shade."
            }
        }

        confidence = "low" if is_fallback else ("high" if target_date_str == today_iso else "medium")

        result = {
            "status": "success",
            "park": park,
            "target_date": target_date_str,
            "timezone": "Asia/Kolkata",
            "current_conditions": current_conditions,
            "astronomy": {
                "sunrise": sunrise_str,
                "sunset": sunset_str,
                "timezone": "Asia/Kolkata"
            },
            "best_time_recommendation": aggregated["best_window"],
            "morning_vs_evening": aggregated["morning_vs_evening"],
            "avoid_window": aggregated["avoid_window"],
            "limiting_factors": aggregated["limiting_factors"],
            "activity_suitability": activity_rollup,
            "hourly_forecast": evaluated_hours,
            "provenance": {
                "weather_provider": "Open-Meteo Numerical Weather Prediction",
                "air_quality_provider": "Open-Meteo Copernicus Atmosphere Monitoring Service (CAMS)",
                "standard": "Indian CPCB National Air Quality Index (NAQI) Breakpoint Standard",
                "data_freshness": "fallback_estimate" if is_fallback else "live_forecast",
                "confidence": confidence,
                "is_fallback": is_fallback
            },
            "disclaimer": "This recommendation is an automated environmental decision-support estimate based on atmospheric and air quality numerical models. It is not medical advice. Individuals with cardiovascular, respiratory, or chronic ailments should consult their healthcare provider."
        }

        self.cache[cache_key] = {"data": result, "timestamp": now_ts}
        return result

park_visit_time_service = ParkVisitTimeService()
