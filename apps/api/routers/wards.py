import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from apps.api.database import get_db
from apps.api.models import Ward, GreenSpace, CitizenReport
from apps.api.schemas import WardResponse
from apps.api.services.priority_service import PriorityService
from apps.api.services.gis_service import GISService

router = APIRouter(prefix="/wards", tags=["Wards"])

@router.get("", response_model=List[WardResponse])
def get_wards(db: Session = Depends(get_db)):
    wards = db.query(Ward).order_by(Ward.ward_number.asc()).all()
    result = []
    for ward in wards:
        gspaces = db.query(GreenSpace).filter(GreenSpace.ward_id == ward.id).all()
        green_area_km2 = sum(gs.area_m2 for gs in gspaces) / 1_000_000.0
        coverage_pct = round((green_area_km2 / ward.area_km2) * 100.0, 2) if ward.area_km2 > 0 else 0.0
        
        avg_health = round(sum(gs.health_score for gs in gspaces) / len(gspaces), 1) if gspaces else 0.0
        open_reports = db.query(CitizenReport).filter(CitizenReport.ward_id == ward.id, CitizenReport.status.in_(["Submitted", "Under Review", "In Progress"])).count()
        
        priority_data = PriorityService.calculate_ward_priority_score(
            green_coverage_pct=coverage_pct,
            target_coverage_pct=ward.target_green_coverage_pct,
            avg_health_score=avg_health,
            open_report_count=open_reports,
            accessibility_300m_pct=min(95.0, 45.0 + len(gspaces) * 6)
        )

        result.append(WardResponse(
            id=ward.id,
            ward_number=ward.ward_number,
            name=ward.name,
            code=ward.code,
            geometry=ward.geometry,
            area_km2=ward.area_km2,
            population=ward.population,
            target_green_coverage_pct=ward.target_green_coverage_pct,
            current_green_coverage_pct=coverage_pct,
            green_space_count=len(gspaces),
            health_score=avg_health,
            priority_score=priority_data["priority_score"]
        ))
    return result

@router.get("/geojson")
def get_wards_geojson(db: Session = Depends(get_db)):
    wards = db.query(Ward).all()
    features = []
    for ward in wards:
        gspaces = db.query(GreenSpace).filter(GreenSpace.ward_id == ward.id).all()
        green_area_km2 = sum(gs.area_m2 for gs in gspaces) / 1_000_000.0
        coverage_pct = round((green_area_km2 / ward.area_km2) * 100.0, 2) if ward.area_km2 > 0 else 0.0
        avg_health = round(sum(gs.health_score for gs in gspaces) / len(gspaces), 1) if gspaces else 0.0
        
        geom = json.loads(ward.geometry)
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "id": ward.id,
                "ward_number": ward.ward_number,
                "name": ward.name,
                "code": ward.code,
                "area_km2": ward.area_km2,
                "population": ward.population,
                "coverage_pct": coverage_pct,
                "green_space_count": len(gspaces),
                "avg_health_score": avg_health
            }
        })
    return GISService.build_feature_collection(features)

@router.get("/{ward_id}", response_model=WardResponse)
def get_ward_by_id(ward_id: str, db: Session = Depends(get_db)):
    ward = db.query(Ward).filter(Ward.id == ward_id).first()
    if not ward:
        raise HTTPException(status_code=404, detail="Ward not found")
    
    gspaces = db.query(GreenSpace).filter(GreenSpace.ward_id == ward.id).all()
    green_area_km2 = sum(gs.area_m2 for gs in gspaces) / 1_000_000.0
    coverage_pct = round((green_area_km2 / ward.area_km2) * 100.0, 2) if ward.area_km2 > 0 else 0.0
    avg_health = round(sum(gs.health_score for gs in gspaces) / len(gspaces), 1) if gspaces else 0.0
    
    open_reports = db.query(CitizenReport).filter(CitizenReport.ward_id == ward.id, CitizenReport.status.in_(["Submitted", "Under Review", "In Progress"])).count()
    priority_data = PriorityService.calculate_ward_priority_score(
        green_coverage_pct=coverage_pct,
        target_coverage_pct=ward.target_green_coverage_pct,
        avg_health_score=avg_health,
        open_report_count=open_reports,
        accessibility_300m_pct=min(95.0, 45.0 + len(gspaces) * 6)
    )

    return WardResponse(
        id=ward.id,
        ward_number=ward.ward_number,
        name=ward.name,
        code=ward.code,
        geometry=ward.geometry,
        area_km2=ward.area_km2,
        population=ward.population,
        target_green_coverage_pct=ward.target_green_coverage_pct,
        current_green_coverage_pct=coverage_pct,
        green_space_count=len(gspaces),
        health_score=avg_health,
        priority_score=priority_data["priority_score"]
    )
