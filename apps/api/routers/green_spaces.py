import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from apps.api.database import get_db
from apps.api.models import GreenSpace, User
from apps.api.schemas import GreenSpaceCreate, GreenSpaceResponse
from apps.api.services.gis_service import GISService
from apps.api.services.ecosystem_service import EcosystemService
from apps.api.dependencies import require_roles, create_audit_log, get_current_user

router = APIRouter(prefix="/green-spaces", tags=["Green Spaces"])

@router.get("", response_model=List[GreenSpaceResponse])
def get_green_spaces(
    category: Optional[str] = None,
    ward_id: Optional[str] = None,
    min_health: Optional[float] = None,
    bbox: Optional[str] = Query(None, description="min_lng,min_lat,max_lng,max_lat"),
    db: Session = Depends(get_db)
):
    query = db.query(GreenSpace)
    if category:
        query = query.filter(GreenSpace.category == category)
    if ward_id:
        query = query.filter(GreenSpace.ward_id == ward_id)
    if min_health is not None:
        query = query.filter(GreenSpace.health_score >= min_health)
    
    green_spaces = query.order_by(GreenSpace.name.asc()).all()

    if bbox:
        try:
            bounds = [float(x) for x in bbox.split(",")]
            green_spaces = [
                gs for gs in green_spaces 
                if GISService.is_point_within_bbox(gs.latitude, gs.longitude, bounds)
            ]
        except Exception:
            pass

    return green_spaces

@router.get("/geojson")
def get_green_spaces_geojson(
    ward_id: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(GreenSpace)
    if ward_id:
        query = query.filter(GreenSpace.ward_id == ward_id)
    if category:
        query = query.filter(GreenSpace.category == category)
    
    spaces = query.all()
    features = []
    for gs in spaces:
        geom = json.loads(gs.geometry)
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "id": gs.id,
                "name": gs.name,
                "category": gs.category,
                "area_m2": gs.area_m2,
                "ward_id": gs.ward_id,
                "health_score": gs.health_score,
                "canopy_percentage": gs.canopy_percentage,
                "tree_count": gs.tree_count,
                "carbon_estimate": gs.carbon_estimate,
                "latitude": gs.latitude,
                "longitude": gs.longitude
            }
        })
    return GISService.build_feature_collection(features)

@router.get("/{space_id}", response_model=GreenSpaceResponse)
def get_green_space(space_id: str, db: Session = Depends(get_db)):
    gs = db.query(GreenSpace).filter(GreenSpace.id == space_id).first()
    if not gs:
        raise HTTPException(status_code=404, detail="Green space not found")
    return gs

@router.post("", response_model=GreenSpaceResponse)
def create_green_space(
    payload: GreenSpaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["OFFICER", "PLANNER", "ADMIN"]))
):
    # Calculate carbon & area dynamically via GIS & Ecosystem Services
    area_m2 = payload.area_m2 or GISService.calculate_area_m2(payload.geometry)
    carbon_metrics = EcosystemService.calculate_carbon_metrics(
        area_m2=area_m2,
        tree_count=payload.tree_count or 50,
        canopy_pct=payload.canopy_percentage or 45.0,
        vegetation_density=0.7
    )

    gs = GreenSpace(
        name=payload.name,
        description=payload.description,
        category=payload.category,
        geometry=payload.geometry,
        latitude=payload.latitude,
        longitude=payload.longitude,
        area_m2=area_m2,
        ward_id=payload.ward_id,
        ownership_type=payload.ownership_type or "Municipal",
        tree_count=payload.tree_count or 50,
        canopy_percentage=payload.canopy_percentage or 45.0,
        health_score=payload.health_score or 75.0,
        carbon_estimate=carbon_metrics["carbon_stored_ton"]
    )
    db.add(gs)
    db.commit()
    db.refresh(gs)

    create_audit_log(db, action="GREEN_SPACE_CREATED", resource="green_space", resource_id=gs.id, actor=current_user)

    return gs
