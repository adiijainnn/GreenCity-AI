import uuid
import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from apps.api.database import get_db
from apps.api.models import CitizenReport, ReportImage, ReportStatusHistory, User
from apps.api.schemas import ReportCreate, ReportStatusUpdate, ReportResponse
from apps.api.dependencies import get_current_user, require_current_user, require_roles, create_audit_log

router = APIRouter(prefix="/reports", tags=["Citizen Reports"])

@router.get("", response_model=List[ReportResponse])
def get_reports(
    ward_id: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    mine_only: bool = False,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    query = db.query(CitizenReport)
    if mine_only:
        if not current_user:
            raise HTTPException(status_code=401, detail="Authentication required for personal reports")
        query = query.filter(CitizenReport.reported_by == current_user.id)
    if ward_id:
        query = query.filter(CitizenReport.ward_id == ward_id)
    if category:
        query = query.filter(CitizenReport.category == category)
    if status:
        query = query.filter(CitizenReport.status == status)
    if priority:
        query = query.filter(CitizenReport.priority == priority)

    reports = query.order_by(CitizenReport.created_at.desc()).all()
    
    # Format response with image dict list
    result = []
    for r in reports:
        report_dict = ReportResponse.from_orm(r)
        report_dict.images = [{"id": img.id, "image_url": img.image_url} for img in r.images]
        result.append(report_dict)

    return result

@router.post("", response_model=ReportResponse)
def submit_report(
    payload: ReportCreate,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    report_num = f"REP-{datetime.datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    
    report = CitizenReport(
        report_number=report_num,
        category=payload.category,
        title=payload.title,
        description=payload.description,
        ward_id=payload.ward_id,
        green_space_id=payload.green_space_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        status="Submitted",
        priority="Medium",
        reported_by=current_user.id if current_user else None
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Attach images
    if payload.images:
        for img_url in payload.images:
            db.add(ReportImage(report_id=report.id, image_url=img_url))
        db.commit()

    # Track initial history
    history = ReportStatusHistory(
        report_id=report.id,
        changed_by=current_user.id if current_user else None,
        old_status="None",
        new_status="Submitted",
        notes="Citizen report created and submitted to municipal system."
    )
    db.add(history)
    db.commit()

    create_audit_log(db, action="REPORT_SUBMITTED", resource="citizen_report", resource_id=report.id, actor=current_user)

    db.refresh(report)
    res = ReportResponse.from_orm(report)
    res.images = [{"id": img.id, "image_url": img.image_url} for img in report.images]
    return res

@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    r = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Citizen report not found")
    
    res = ReportResponse.from_orm(r)
    res.images = [{"id": img.id, "image_url": img.image_url} for img in r.images]
    return res

@router.patch("/{report_id}/status", response_model=ReportResponse)
def update_report_status(
    report_id: str,
    payload: ReportStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["OFFICER", "ADMIN"]))
):
    r = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Citizen report not found")

    old_status = r.status
    r.status = payload.status
    if payload.assigned_to:
        r.assigned_to = payload.assigned_to
    if payload.priority:
        r.priority = payload.priority
    if payload.public_response:
        r.public_response = payload.public_response
    if payload.internal_notes:
        r.internal_notes = payload.internal_notes
    if payload.resolution_evidence_url:
        r.resolution_evidence_url = payload.resolution_evidence_url

    r.updated_at = datetime.datetime.utcnow()

    # Write status transition history
    history = ReportStatusHistory(
        report_id=r.id,
        changed_by=current_user.id,
        old_status=old_status,
        new_status=payload.status,
        notes=payload.internal_notes or f"Status updated from {old_status} to {payload.status} by Officer."
    )
    db.add(history)
    db.commit()
    db.refresh(r)

    create_audit_log(db, action="REPORT_STATUS_CHANGED", resource="citizen_report", resource_id=r.id, actor=current_user, metadata={"old": old_status, "new": payload.status})

    res = ReportResponse.from_orm(r)
    res.images = [{"id": img.id, "image_url": img.image_url} for img in r.images]
    return res
