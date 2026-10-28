from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from apps.api.database import get_db
from apps.api.models import Ward, GreenSpace, CitizenReport, Tree, MaintenanceTask
from apps.api.services.ecosystem_service import EcosystemService
from apps.api.services.priority_service import PriorityService

router = APIRouter(prefix="/analytics", tags=["Urban Planning Analytics"])

@router.get("/city")
def get_city_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    wards = db.query(Ward).all()
    green_spaces = db.query(GreenSpace).all()
    reports = db.query(CitizenReport).all()
    trees = db.query(Tree).all()
    maintenance = db.query(MaintenanceTask).all()

    total_city_area_km2 = sum(w.area_km2 for w in wards) or 100.0
    total_green_area_m2 = sum(gs.area_m2 for gs in green_spaces)
    total_green_area_km2 = total_green_area_m2 / 1_000_000.0

    city_green_coverage_pct = round((total_green_area_km2 / total_city_area_km2) * 100.0, 2)
    total_tree_count = sum(gs.tree_count for gs in green_spaces) + len(trees)

    avg_health_score = round(sum(gs.health_score for gs in green_spaces) / len(green_spaces), 1) if green_spaces else 0.0
    total_carbon_estimate = round(sum(gs.carbon_estimate for gs in green_spaces), 1)

    open_reports = len([r for r in reports if r.status in ["Submitted", "Under Review", "In Progress"]])
    resolved_reports = len([r for r in reports if r.status in ["Resolved", "Closed"]])

    # Breakdown by category
    categories_breakdown = {}
    for gs in green_spaces:
        categories_breakdown[gs.category] = categories_breakdown.get(gs.category, 0) + 1

    # Breakdown by ward
    ward_summaries = []
    for w in wards:
        w_gspaces = [gs for gs in green_spaces if gs.ward_id == w.id]
        w_area_km2 = sum(gs.area_m2 for gs in w_gspaces) / 1_000_000.0
        w_coverage = round((w_area_km2 / w.area_km2) * 100.0, 2) if w.area_km2 > 0 else 0.0
        w_health = round(sum(gs.health_score for gs in w_gspaces) / len(w_gspaces), 1) if w_gspaces else 0.0
        w_open_reports = len([r for r in reports if r.ward_id == w.id and r.status in ["Submitted", "Under Review", "In Progress"]])

        priority_res = PriorityService.calculate_ward_priority_score(
            green_coverage_pct=w_coverage,
            target_coverage_pct=w.target_green_coverage_pct,
            avg_health_score=w_health,
            open_report_count=w_open_reports,
            accessibility_300m_pct=min(95.0, 45.0 + len(w_gspaces) * 6)
        )

        ward_summaries.append({
            "ward_id": w.id,
            "ward_number": w.ward_number,
            "name": w.name,
            "area_km2": w.area_km2,
            "population": w.population,
            "green_coverage_pct": w_coverage,
            "target_coverage_pct": w.target_green_coverage_pct,
            "green_space_count": len(w_gspaces),
            "average_health_score": w_health,
            "open_reports_count": w_open_reports,
            "priority_score": priority_res["priority_score"],
            "priority_level": priority_res["level"]
        })

    # Sort ward priority
    ward_summaries.sort(key=lambda x: x["priority_score"], reverse=True)

    return {
        "summary": {
            "total_wards": len(wards),
            "total_green_spaces": len(green_spaces),
            "total_city_area_km2": total_city_area_km2,
            "total_green_area_m2": total_green_area_m2,
            "city_green_coverage_pct": city_green_coverage_pct,
            "total_estimated_trees": total_tree_count,
            "average_health_score": avg_health_score,
            "total_carbon_stored_ton": total_carbon_estimate,
            "open_reports_count": open_reports,
            "resolved_reports_count": resolved_reports,
            "pending_maintenance_tasks": len([m for m in maintenance if m.status != "Completed"])
        },
        "categories_breakdown": categories_breakdown,
        "ward_summaries": ward_summaries
    }

@router.get("/compare")
def compare_wards(
    ward_a_id: str,
    ward_b_id: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    ward_a = db.query(Ward).filter(Ward.id == ward_a_id).first()
    ward_b = db.query(Ward).filter(Ward.id == ward_b_id).first()
    if not ward_a or not ward_b:
        raise HTTPException(status_code=404, detail="One or both wards were not found")

    def build_ward_metrics(w: Ward):
        gspaces = db.query(GreenSpace).filter(GreenSpace.ward_id == w.id).all()
        reports = db.query(CitizenReport).filter(CitizenReport.ward_id == w.id).all()
        green_area_m2 = sum(gs.area_m2 for gs in gspaces)
        coverage_pct = round(((green_area_m2 / 1_000_000.0) / w.area_km2) * 100.0, 2) if w.area_km2 > 0 else 0.0
        avg_health = round(sum(gs.health_score for gs in gspaces) / len(gspaces), 1) if gspaces else 0.0
        tree_cnt = sum(gs.tree_count for gs in gspaces)
        carbon_tot = round(sum(gs.carbon_estimate for gs in gspaces), 1)

        access_metrics = EcosystemService.calculate_accessibility_buffers([
            {"area_m2": gs.area_m2} for gs in gspaces
        ], w.area_km2)

        return {
            "id": w.id,
            "ward_number": w.ward_number,
            "name": w.name,
            "area_km2": w.area_km2,
            "population": w.population,
            "green_coverage_pct": coverage_pct,
            "target_coverage_pct": w.target_green_coverage_pct,
            "green_space_count": len(gspaces),
            "average_health_score": avg_health,
            "tree_count": tree_cnt,
            "carbon_stored_ton": carbon_tot,
            "reports_count": len(reports),
            "accessibility_300m_pct": access_metrics["accessibility_300m_pct"],
            "accessibility_500m_pct": access_metrics["accessibility_500m_pct"]
        }

    return {
        "ward_a": build_ward_metrics(ward_a),
        "ward_b": build_ward_metrics(ward_b)
    }
