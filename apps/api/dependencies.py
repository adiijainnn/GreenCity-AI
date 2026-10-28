import jwt
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from apps.api.database import get_db
from apps.api.config import settings
from apps.api.models import User, AuditLog
import datetime

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Optional[User]:
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except jwt.PyJWTError:
        return None
    
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    return user

def require_current_user(current_user: Optional[User] = Depends(get_current_user)) -> User:
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

def require_roles(allowed_roles: list[str]):
    def role_checker(current_user: User = Depends(require_current_user)):
        if current_user.role not in allowed_roles and current_user.role != "SUPER_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden. Requires one of roles: {allowed_roles}"
            )
        return current_user
    return role_checker

def create_audit_log(db: Session, action: str, resource: str, resource_id: str = None, actor: User = None, metadata: dict = None, ip: str = None):
    log = AuditLog(
        actor_id=actor.id if actor else "SYSTEM",
        actor_email=actor.email if actor else "system@greencity.ai",
        action=action,
        resource=resource,
        resource_id=str(resource_id) if resource_id else None,
        metadata_json=metadata or {},
        ip_address=ip or "127.0.0.1"
    )
    db.add(log)
    db.commit()
