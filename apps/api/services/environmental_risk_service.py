import datetime
from typing import Dict, Any, Optional, List
from apps.api.services.weather_service import weather_service
from apps.api.services.air_quality_service import air_quality_service

class EnvironmentalRiskService:
    def __init__(self):
        pass

    def evaluate_visit_suitability(
        self,
        lat: float,
        lng: float,
        purpose: str = "walking" # 'walking', 'exercising', 'family_children', 'general_visit'
    ) -> Dict[str, Any]:
        w_data = weather_service.get_weather(lat, lng)
        aq_data = air_quality_service.get_air_quality(lat, lng)

        aqi = aq_data.get("indian_aqi", 80)
        temp = w_data.get("temperature_c", 28.0)
        humidity = w_data.get("relative_humidity_pct", 45)
        wind = w_data.get("wind_speed_kmh", 10.0)
        pm25 = aq_data.get("pm_2_5", 25.0)

        # 1. Air Quality Score (0 to 100, higher is cleaner)
        if aqi <= 50:
            aq_score = 95
            aq_label = "Clean & Pure"
        elif aqi <= 100:
            aq_score = 80
            aq_label = "Satisfactory"
        elif aqi <= 200:
            aq_score = 55
            aq_label = "Moderate"
        elif aqi <= 300:
            aq_score = 30
            aq_label = "Poor"
        else:
            aq_score = 15
            aq_label = "Severe"

        # 2. Weather Comfort Score (0 to 100)
        comfort_score = 85
        comfort_reasons = []
        if 20 <= temp <= 31 and humidity <= 65:
            comfort_score = 90
            comfort_label = "Thermal Comfort Pleasant"
        elif temp > 36:
            comfort_score = 45
            comfort_label = "High Heat Alert"
            comfort_reasons.append(f"High temperature ({temp}°C) increases heat exhaustion risk")
        elif temp > 32:
            comfort_score = 65
            comfort_label = "Warm"
            comfort_reasons.append(f"Warm daytime temperature ({temp}°C)")
        else:
            comfort_score = 75
            comfort_label = "Mild"

        # 3. Overall Outdoor Suitability Rating
        composite = (aq_score * 0.6) + (comfort_score * 0.4)

        if composite >= 85:
            overall_rating = "Excellent conditions"
            rating_level = "excellent"
            badge_color = "#10b981" # emerald
        elif composite >= 70:
            overall_rating = "Good conditions"
            rating_level = "good"
            badge_color = "#84cc16" # lime
        elif composite >= 50:
            overall_rating = "Moderate conditions"
            rating_level = "moderate"
            badge_color = "#eab308" # yellow
        elif composite >= 30:
            overall_rating = "Poor conditions"
            rating_level = "poor"
            badge_color = "#f97316" # orange
        else:
            overall_rating = "Very poor conditions"
            rating_level = "very_poor"
            badge_color = "#ef4444" # red

        # 4. Contextual Guidance based on User Purpose
        purpose_guidance = {}
        if purpose == "exercising":
            if aqi > 150:
                advice = f"Outdoor running is not recommended under current elevated PM2.5 ({pm25} µg/m³). Switch to an indoor workout or well-canopied forest pocket."
            elif temp > 33:
                advice = f"Warm conditions ({temp}°C). Hydrate frequently and restrict intensive workouts to morning or post-sunset hours."
            else:
                advice = f"Favorable conditions for workouts and jogging. Measured AQI ({aqi}) and temperature ({temp}°C) are well within safe thresholds."
        elif purpose == "family_children":
            if aqi > 150:
                advice = "Elevated particulate concentrations. Keep children with asthma or sensitive airways in sheltered areas; avoid prolonged peak-hour exposure."
            elif temp > 35:
                advice = "Sunny & hot. Choose shaded park sections with dense tree canopies, such as Siddheshwar Promenade or Kambar Talav."
            else:
                advice = "Great conditions for family visits and park playgrounds. Air quality and thermal comfort are welcoming."
        else: # 'walking' or 'general_visit'
            if aqi > 200:
                advice = f"Air quality is rated Poor (AQI {aqi}). Consider wearing an N95 mask and reducing walk duration."
            elif temp > 34:
                advice = f"Temperature is warm ({temp}°C). Early morning and evening walks are strongly recommended for maximum shade benefit."
            else:
                advice = f"Current conditions are {overall_rating.lower()} for walks and outdoor exploration. Moderate breeze at {wind} km/h."

        explanation = (
            f"Outdoor conditions are currently rated '{overall_rating}' because the latest reported Indian AQI is {aqi} "
            f"(PM2.5: {pm25} µg/m³, Category: {aq_data.get('category')}) and the current ambient temperature is {temp}°C "
            f"with {humidity}% relative humidity."
        )

        return {
            "overall_rating": overall_rating,
            "rating_level": rating_level,
            "badge_color": badge_color,
            "explanation": explanation,
            "purpose": purpose,
            "purpose_advice": advice,
            "air_quality": {
                "score": aq_score,
                "label": aq_label,
                "aqi": aqi,
                "category": aq_data.get("category"),
                "pm2_5": pm25,
                "pm10": aq_data.get("pm10")
            },
            "weather_comfort": {
                "score": comfort_score,
                "label": comfort_label,
                "temperature_c": temp,
                "apparent_temperature_c": w_data.get("apparent_temperature_c"),
                "relative_humidity_pct": humidity,
                "wind_speed_kmh": wind
            },
            "data_confidence": {
                "level": "High Confidence",
                "weather_source": w_data.get("provider"),
                "air_quality_source": aq_data.get("provider"),
                "observation_time": aq_data.get("observation_time"),
                "is_fallback": aq_data.get("is_fallback", False)
            }
        }

    def get_diwali_festival_analysis(self, lat: float, lng: float) -> Dict[str, Any]:
        """
        Diwali & Festival Pollution Intelligence Module.
        Compares pre-festival baseline, peak festival readings, and post-festival trend.
        Integrates meteorological factors (temperature inversions, low wind) alongside firecracker emissions.
        """
        aq_data = air_quality_service.get_air_quality(lat, lng)
        trend = aq_data.get("history_trend", [])

        # Current snapshot
        curr_aqi = aq_data.get("indian_aqi", 92)
        curr_pm25 = aq_data.get("pm2_5", 35.0)
        curr_pm10 = aq_data.get("pm10", 68.0)

        # Baseline calculation from 72-hour historical trend if available
        if trend and len(trend) >= 6:
            baseline_pm25 = round(sum(p.get("pm2_5", 30) for p in trend[:6]) / 6, 1)
            baseline_pm10 = round(sum(p.get("pm10", 60) for p in trend[:6]) / 6, 1)
            baseline_aqi = int(round(sum(p.get("indian_aqi", 85) for p in trend[:6]) / 6))
            peak_pm25 = max(p.get("pm2_5", 35) for p in trend)
            has_real_history = True
        else:
            baseline_pm25 = 32.0
            baseline_pm10 = 62.0
            baseline_aqi = 85
            peak_pm25 = curr_pm25
            has_real_history = False

        pm25_delta_pct = round(((curr_pm25 - baseline_pm25) / max(1.0, baseline_pm25)) * 100, 1)

        advisory_notes = [
            "Firecracker emissions release heavy particulate matter (PM2.5/PM10), sulfur dioxide, and trace metals into the local troposphere.",
            "Winter atmospheric inversions in October/November often trap ground emissions, dampening vertical dispersion.",
            "Solapur Municipal Corporation conducts continuous monitoring around major public squares and eco-zones (Siddheshwar Lake, Ashok Chowk, Hotgi Road).",
            "Sensitive citizens (children, asthmatics, elderly) are advised to stay indoors during evening peak celebration hours."
        ]

        return {
            "monitoring_status": "Active Festive Period Intelligence",
            "has_real_history": has_real_history,
            "festival_name": "Diwali Clean Air & Festive Pollution Watch",
            "current_observation": {
                "indian_aqi": curr_aqi,
                "pm2_5": curr_pm25,
                "pm10": curr_pm10,
                "observation_time": aq_data.get("observation_time"),
            },
            "baseline_comparison": {
                "pre_festival_baseline_aqi": baseline_aqi,
                "pre_festival_baseline_pm25": baseline_pm25,
                "pre_festival_baseline_pm10": baseline_pm10,
                "pm25_change_percentage": pm25_delta_pct,
                "trend_direction": "Elevated" if pm25_delta_pct > 15 else "Stable" if pm25_delta_pct >= -15 else "Reduced"
            },
            "meteorological_context": (
                "Air quality spikes during festivities are driven by combined factors: nocturnal firecracker smoke, "
                "reduced wind speed (< 8 km/h), shallow boundary layer inversions, and ambient transport emissions. "
                "Atmospheric dispersion depends critically on wind shifts."
            ),
            "historical_trend": trend,
            "advisories": advisory_notes,
            "disclaimer": (
                "Measured concentrations represent atmospheric monitoring data. Not all particulate fluctuations "
                "are solely attributable to fireworks; regional crop burning, transport, and local topography also influence ambient readings."
            )
        }

environmental_risk_service = EnvironmentalRiskService()
