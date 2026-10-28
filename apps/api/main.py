import uuid
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from apps.api.config import settings
from apps.api.database import engine, Base
from apps.api.routers import (
    auth, users, wards, green_spaces, reports, 
    maintenance, analytics, insights, datasets, admin, health,
    environment, routing, places, assistant
)

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="GreenCity AI API",
    description="Production-Grade Urban Green Space Intelligence & Ecosystem Service Analysis Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Structured Error Handler middleware
@app.middleware("http")
async def add_request_id_and_error_handling(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as exc:
        logging.error(f"Unhandled Exception [RequestID {request_id}]: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected server error occurred. Please contact system support.",
                    "request_id": request_id
                }
            }
        )

# Register Routers
app.include_router(health.router)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(wards.router, prefix="/api/v1")
app.include_router(green_spaces.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(maintenance.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(insights.router, prefix="/api/v1")
app.include_router(datasets.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(environment.router, prefix="/api/v1")
app.include_router(routing.router, prefix="/api/v1")
app.include_router(places.router, prefix="/api/v1")
app.include_router(assistant.router, prefix="/api/v1")

