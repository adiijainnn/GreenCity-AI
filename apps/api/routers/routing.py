from fastapi import APIRouter, Query, HTTPException
from apps.api.services.routing_service import routing_service

router = APIRouter(prefix="/routing", tags=["Live Navigation & Routing"])

@router.get("/directions")
def get_directions(
    start_lat: float = Query(..., ge=-90, le=90, description="Start point latitude"),
    start_lng: float = Query(..., ge=-180, le=180, description="Start point longitude"),
    dest_lat: float = Query(..., ge=-90, le=90, description="Destination latitude"),
    dest_lng: float = Query(..., ge=-180, le=180, description="Destination longitude"),
    mode: str = Query("driving", pattern="^(driving|walking)$", description="Travel mode: driving or walking"),
    alternatives: bool = Query(True, description="Request alternative routes"),
):
    """
    Computes a road-based navigation route.

    Provider priority (auto-selected by the service):
      1. Google Maps Routes API  — set GOOGLE_MAPS_API_KEY env var
      2. OpenRouteService        — set ORS_API_KEY env var (walking only)
      3. OSRM public demo server — always available, no key required
      4. Haversine estimate      — fallback when all providers fail (is_fallback=True)

    Returns coordinates as [[lat, lng], ...] (Leaflet convention).
    """
    # Reject trivially identical points that produce 0-distance routes
    if abs(start_lat - dest_lat) < 1e-6 and abs(start_lng - dest_lng) < 1e-6:
        raise HTTPException(status_code=400, detail="Origin and destination are the same location.")

    try:
        route = routing_service.get_route(
            start_lat=start_lat,
            start_lng=start_lng,
            dest_lat=dest_lat,
            dest_lng=dest_lng,
            mode=mode,
            alternatives=alternatives,
        )
        return route
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Routing service error: {str(exc)}")

