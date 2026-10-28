from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.services.weather_service import weather_service
from apps.api.services.air_quality_service import air_quality_service
from apps.api.services.environmental_risk_service import environmental_risk_service
from apps.api.services.park_visit_time_service import park_visit_time_service

router = APIRouter(prefix="/environment", tags=["Environmental Intelligence"])

@router.get("/live")
def get_live_environment(
    lat: float = Query(17.6599, description="Latitude (default Solapur)"),
    lng: float = Query(75.9064, description="Longitude (default Solapur)"),
    force_refresh: bool = Query(False, description="Bypass cache and query live sensor/provider API")
):
    """
    Returns real-time integrated environmental intelligence:
    Air Quality Index (Indian CPCB standard, PM2.5, PM10), temperature, humidity, wind, and data freshness.
    """
    try:
        weather = weather_service.get_weather(lat, lng, force_refresh=force_refresh)
        air_quality = air_quality_service.get_air_quality(lat, lng, force_refresh=force_refresh)
        return {
            "status": "success",
            "coordinates": {"latitude": lat, "longitude": lng},
            "weather": weather,
            "air_quality": air_quality
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Environmental data retrieval error: {str(exc)}")

@router.get("/history")
def get_environmental_history(
    lat: float = Query(17.6599, description="Latitude"),
    lng: float = Query(75.9064, description="Longitude")
):
    """
    Returns verified historical observations and hourly trends for the past 72 hours.
    """
    try:
        air_quality = air_quality_service.get_air_quality(lat, lng)
        weather = weather_service.get_weather(lat, lng)
        return {
            "status": "success",
            "coordinates": {"latitude": lat, "longitude": lng},
            "history_trend": air_quality.get("history_trend", []),
            "hourly_forecast": weather.get("hourly_forecast", []),
            "provider": air_quality.get("provider")
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Historical data retrieval error: {str(exc)}")

@router.get("/suitability")
def get_visit_suitability(
    lat: float = Query(17.6599, description="Latitude"),
    lng: float = Query(75.9064, description="Longitude"),
    purpose: str = Query("walking", description="Activity purpose: walking, exercising, family_children, general_visit")
):
    """
    Evaluates outdoor environmental suitability for citizens based on verified AQI and thermal comfort.
    """
    try:
        assessment = environmental_risk_service.evaluate_visit_suitability(lat, lng, purpose=purpose)
        return assessment
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Suitability assessment error: {str(exc)}")

@router.get("/festival")
def get_festival_pollution_intelligence(
    lat: float = Query(17.6599, description="Latitude"),
    lng: float = Query(75.9064, description="Longitude")
):
    """
    Festival & Diwali Pollution Intelligence:
    Compares baseline with festival period observations, highlighting meteorological context.
    """
    try:
        analysis = environmental_risk_service.get_diwali_festival_analysis(lat, lng)
        return analysis
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Festival intelligence error: {str(exc)}")


@router.get("/park-visit-times")
def get_park_visit_times(
    park_id: Optional[str] = Query(None, description="Park UUID from database or canonical landmark ID"),
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Optional custom latitude"),
    lng: Optional[float] = Query(None, ge=-180, le=180, description="Optional custom longitude"),
    date: Optional[str] = Query(None, description="Local date YYYY-MM-DD (defaults to current date in Asia/Kolkata)"),
    force_refresh: bool = Query(False, description="Bypass cache and query live provider APIs"),
    db: Session = Depends(get_db)
):
    """
    Best Time to Visit a Park:
    Evaluates hour-by-hour weather comfort (temperature, feels-like, humidity, wind, precipitation)
    and Indian CPCB NAQI air quality (PM2.5, PM10) to determine optimal visit windows,
    activity-specific suitability, sunrise/sunset, and environmental constraints.
    """
    try:
        data = park_visit_time_service.get_park_visit_times(
            park_id=park_id,
            lat=lat,
            lng=lng,
            date_str=date,
            db=db,
            force_refresh=force_refresh
        )
        return data
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Park visit times calculation error: {str(exc)}")

