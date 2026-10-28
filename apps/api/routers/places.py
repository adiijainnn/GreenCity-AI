from fastapi import APIRouter, Query, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from apps.api.database import get_db
from apps.api.services.place_search_service import place_search_service
from apps.api.services.air_quality_service import air_quality_service
from apps.api.services.weather_service import weather_service

router = APIRouter(prefix="/places", tags=["Places & Discovery"])

@router.get("/search")
def search_places(
    q: str = Query(..., min_length=1, description="Search query for area, landmark, or street"),
    limit: int = Query(10, ge=1, le=25),
    lat: Optional[float] = Query(None, description="Optional center/user latitude for distance calculation"),
    lng: Optional[float] = Query(None, description="Optional center/user longitude for distance calculation"),
    db: Session = Depends(get_db)
):
    """
    Searches municipal green spaces, landmarks, and live geocoded OpenStreetMap areas.
    """
    try:
        results = place_search_service.search_places(
            q,
            db=db,
            limit=limit,
            center_lat=lat,
            center_lng=lng
        )
        return results
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Place search error: {str(exc)}")

@router.get("/nearby")
def get_nearby_places(
    lat: float = Query(..., description="Center latitude"),
    lng: float = Query(..., description="Center longitude"),
    radius_km: float = Query(3.0, ge=0.5, le=10.0, description="Discovery radius in kilometers"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    db: Session = Depends(get_db)
):
    """
    Discovers green spaces, public parks, and amenities within a configurable radius.
    """
    try:
        nearby = place_search_service.get_nearby_places(
            lat=lat,
            lng=lng,
            radius_km=radius_km,
            category=category,
            db=db
        )
        return nearby
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Nearby discovery error: {str(exc)}")

@router.post("/compare")
def compare_places(
    places: List[Dict[str, Any]] = Body(..., description="List of places with id, name, latitude, longitude"),
    db: Session = Depends(get_db)
):
    """
    Compares multiple locations side-by-side with live environmental intelligence,
    tree canopy metrics, and activity suitability.
    """
    try:
        comparison_results = []
        for p in places[:5]: # Cap comparison to 5 places
            lat = p.get("latitude")
            lng = p.get("longitude")
            if lat is None or lng is None:
                continue

            aq = air_quality_service.get_air_quality(lat, lng)
            w = weather_service.get_weather(lat, lng)

            comparison_results.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "category": p.get("category", "Green Space"),
                "latitude": lat,
                "longitude": lng,
                "health_score": p.get("health_score", 75.0),
                "canopy_percentage": p.get("canopy_percentage", 40.0),
                "tree_count": p.get("tree_count", 150),
                "walking_distance_km": p.get("walking_distance_km"),
                "walking_duration_minutes": p.get("walking_duration_minutes"),
                "amenities": p.get("amenities", ["Tree Shade", "Walking Path"]),
                "indian_aqi": aq.get("indian_aqi"),
                "aqi_category": aq.get("category"),
                "pm2_5": aq.get("pm2_5"),
                "pm10": aq.get("pm10"),
                "temperature_c": w.get("temperature_c"),
                "humidity_pct": w.get("relative_humidity_pct"),
                "observation_time": aq.get("observation_time"),
                "data_freshness": aq.get("data_freshness")
            })

        return comparison_results
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Place comparison error: {str(exc)}")
