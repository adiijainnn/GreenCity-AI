import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from apps.api.database import get_db
from apps.api.models import MaintenanceTask, User
from apps.api.schemas import MaintenanceTaskCreate, MaintenanceTaskUpdate, MaintenanceTaskResponse
from apps.api.dependencies import require_roles, create_audit_log

router = APIRouter(prefix="/maintenance", tags=["Maintenance Management"])

@router.get("", response_model=List[MaintenanceTaskResponse])
def get_maintenance_tasks(
    status: Optional[str] = None,
    green_space_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(MaintenanceTask)
    if status:
        query = query.filter(MaintenanceTask.status == status)
    if green_space_id:
        query = query.filter(MaintenanceTask.green_space_id == green_space_id)
    
    return query.order_by(MaintenanceTask.scheduled_date.asc()).all()

@router.post("", response_model=MaintenanceTaskResponse)
def create_maintenance_task(
    payload: MaintenanceTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["OFFICER", "ADMIN"]))
):
    task = MaintenanceTask(
        green_space_id=payload.green_space_id,
        report_id=payload.report_id,
        task_type=payload.task_type,
        description=payload.description,
        priority=payload.priority or "Medium",
        assigned_to=payload.assigned_to,
        scheduled_date=payload.scheduled_date or datetime.datetime.utcnow(),
        due_date=payload.due_date or (datetime.datetime.utcnow() + datetime.timedelta(days=7)),
        status="Assigned" if payload.assigned_to else "Planned"
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    create_audit_log(db, action="MAINTENANCE_TASK_CREATED", resource="maintenance_task", resource_id=task.id, actor=current_user)
    return task

@router.patch("/{task_id}", response_model=MaintenanceTaskResponse)
def update_maintenance_task(
    task_id: str,
    payload: MaintenanceTaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["OFFICER", "ADMIN"]))
):
    task = db.query(MaintenanceTask).filter(MaintenanceTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Maintenance task not found")
    
    task.status = payload.status
    if payload.notes:
        task.notes = payload.notes
    if payload.after_images:
        task.after_images = payload.after_images
    
    task.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(task)

    create_audit_log(db, action="MAINTENANCE_TASK_UPDATED", resource="maintenance_task", resource_id=task.id, actor=current_user)
    return task
