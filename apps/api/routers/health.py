from fastapi import APIRouter

router = APIRouter(tags=["Observability"])

@router.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "GreenCity AI Core API",
        "version": "1.0.0"
    }

@router.get("/ready")
def readiness_check():
    return {
        "status": "READY",
        "database": "OK",
        "spatial_engine": "OK"
    }
