from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

from apps.api.database import get_db
from apps.api.dependencies import get_current_user
from apps.api.models import User
from apps.api.services.voice_assistant_service import voice_assistant_service

router = APIRouter(prefix="/assistant", tags=["Multilingual AI Voice Assistant"])

class AssistantChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Citizen voice transcription or text query")
    language: Optional[str] = Field("en", description="Preferred language code: en, hi, or mr")
    latitude: Optional[float] = Field(None, description="Optional user GPS latitude")
    longitude: Optional[float] = Field(None, description="Optional user GPS longitude")

class AssistantChatResponse(BaseModel):
    intent: str
    language: str
    reply: str
    card_type: Optional[str] = None
    card_data: Optional[Dict[str, Any]] = None

@router.post("/chat", response_model=AssistantChatResponse)
def assistant_chat(
    payload: AssistantChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """
    Multilingual AI assistant processing citizen queries in English, Hindi, and Marathi,
    backed by real grounded environmental, routing, and municipal services.
    """
    try:
        result = voice_assistant_service.process_query(
            query=payload.query,
            user_lang=payload.language or "en",
            user_lat=payload.latitude,
            user_lng=payload.longitude,
            db=db,
            current_user=current_user
        )
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Assistant processing error: {str(exc)}")
