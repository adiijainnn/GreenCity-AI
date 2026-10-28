from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from apps.api.database import get_db
from apps.api.models import User
from apps.api.schemas import UserResponse
from apps.api.dependencies import require_roles, create_audit_log

router = APIRouter(prefix="/users", tags=["Users Management"])

@router.get("", response_model=List[UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN", "OFFICER"]))
):
    return db.query(User).order_by(User.created_at.desc()).all()

@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: str,
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPER_ADMIN"]))
):
    if role not in ["CITIZEN", "OFFICER", "PLANNER", "ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(status_code=400, detail="Invalid role specified")

    u = db.query(User).filter(User.id == user_id).first()
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role = u.role
    u.role = role
    db.commit()
    db.refresh(u)

    create_audit_log(db, action="USER_ROLE_CHANGED", resource="user", resource_id=u.id, actor=current_user, metadata={"old_role": old_role, "new_role": role})
    return u
