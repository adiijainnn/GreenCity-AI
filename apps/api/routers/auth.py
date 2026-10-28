import jwt
import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import bcrypt

from apps.api.database import get_db
from apps.api.config import settings
from apps.api.models import User
from apps.api.schemas import UserLogin, UserRegister, TokenResponse, UserResponse
from apps.api.dependencies import require_current_user, create_audit_log

router = APIRouter(prefix="/auth", tags=["Authentication"])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered.")
    
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hashed_pwd,
        role=user_in.role if user_in.role in ["CITIZEN", "OFFICER", "PLANNER", "ADMIN"] else "CITIZEN",
        phone=user_in.phone
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    create_audit_log(db, action="USER_REGISTERED", resource="user", resource_id=user.id, actor=user)

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is deactivated.")

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    create_audit_log(db, action="USER_LOGGED_IN", resource="user", resource_id=user.id, actor=user)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(require_current_user)):
    return current_user
