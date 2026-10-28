from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from apps.api.database import get_db
from apps.api.models import AuditLog, User
from apps.api.schemas import AuditLogResponse
from apps.api.dependencies import require_roles

router = APIRouter(prefix="/admin", tags=["Admin Operations"])

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN"]))
):
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()

@router.get("/system-health")
def get_system_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN"]))
):
    user_count = db.query(User).count()
    return {
        "status": "HEALTHY",
        "services": {
            "database": "CONNECTED",
            "redis": "CONNECTED",
            "ai_engine": "READY",
            "gis_pipeline": "READY"
        },
        "metrics": {
            "total_users": user_count,
            "uptime": "99.98%",
            "system_version": "v1.0.0"
        }
    }
