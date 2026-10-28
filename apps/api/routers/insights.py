from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from apps.api.database import get_db
from apps.api.models import Ward, GreenSpace, CitizenReport, AIRecommendation
from apps.api.schemas import AIRecommendationResponse
from apps.api.services.ai_service import AIService

router = APIRouter(prefix="/insights", tags=["AI Insights"])

@router.get("", response_model=List[AIRecommendationResponse])
def get_insights(
    ward_id: Optional[str] = None,
    priority: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AIRecommendation)
    if ward_id:
        query = query.filter(AIRecommendation.ward_id == ward_id)
    if priority:
        query = query.filter(AIRecommendation.priority == priority)

    insights = query.order_by(AIRecommendation.generated_at.desc()).all()

    # If database has no recommendations pre-seeded, generate on the fly
    if not insights:
        wards = db.query(Ward).all()
        for w in wards:
            gspaces = db.query(GreenSpace).filter(GreenSpace.ward_id == w.id).all()
            green_area_km2 = sum(gs.area_m2 for gs in gspaces) / 1_000_000.0
            coverage_pct = round((green_area_km2 / w.area_km2) * 100.0, 2) if w.area_km2 > 0 else 0.0
            avg_health = round(sum(gs.health_score for gs in gspaces) / len(gspaces), 1) if gspaces else 0.0
            open_reports = db.query(CitizenReport).filter(CitizenReport.ward_id == w.id, CitizenReport.status.in_(["Submitted", "Under Review", "In Progress"])).count()

            recs = AIService.generate_recommendations_for_ward(
                ward_id=w.id,
                ward_name=w.name,
                green_coverage_pct=coverage_pct,
                target_coverage_pct=w.target_green_coverage_pct,
                avg_health_score=avg_health,
                open_report_count=open_reports,
                green_spaces=[{"name": gs.name, "health_score": gs.health_score} for gs in gspaces]
            )

            for rec in recs:
                db_rec = AIRecommendation(
                    ward_id=w.id,
                    title=rec["title"],
                    description=rec["description"],
                    reason=rec["reason"],
                    priority=rec["priority"],
                    affected_area=rec["affected_area"],
                    supporting_metrics=rec["supporting_metrics"],
                    confidence=rec["confidence"]
                )
                db.add(db_rec)
        db.commit()
        insights = db.query(AIRecommendation).order_by(AIRecommendation.generated_at.desc()).all()

    return insights

@router.post("/generate")
def trigger_ai_insights_generation(db: Session = Depends(get_db)):
    # Clear existing and regenerate fresh insights
    db.query(AIRecommendation).delete()
    db.commit()

    wards = db.query(Ward).all()
    count = 0
    for w in wards:
        gspaces = db.query(GreenSpace).filter(GreenSpace.ward_id == w.id).all()
        green_area_km2 = sum(gs.area_m2 for gs in gspaces) / 1_000_000.0
        coverage_pct = round((green_area_km2 / w.area_km2) * 100.0, 2) if w.area_km2 > 0 else 0.0
        avg_health = round(sum(gs.health_score for gs in gspaces) / len(gspaces), 1) if gspaces else 0.0
        open_reports = db.query(CitizenReport).filter(CitizenReport.ward_id == w.id, CitizenReport.status.in_(["Submitted", "Under Review", "In Progress"])).count()

        recs = AIService.generate_recommendations_for_ward(
            ward_id=w.id,
            ward_name=w.name,
            green_coverage_pct=coverage_pct,
            target_coverage_pct=w.target_green_coverage_pct,
            avg_health_score=avg_health,
            open_report_count=open_reports,
            green_spaces=[{"name": gs.name, "health_score": gs.health_score} for gs in gspaces]
        )

        for rec in recs:
            db_rec = AIRecommendation(
                ward_id=w.id,
                title=rec["title"],
                description=rec["description"],
                reason=rec["reason"],
                priority=rec["priority"],
                affected_area=rec["affected_area"],
                supporting_metrics=rec["supporting_metrics"],
                confidence=rec["confidence"]
            )
            db.add(db_rec)
            count += 1

    db.commit()
    return {"status": "SUCCESS", "message": f"Generated {count} explainable AI recommendations across {len(wards)} wards."}
