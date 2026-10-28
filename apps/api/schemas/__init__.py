from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime

# --- Auth & User Schemas ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None
    role: Optional[str] = "CITIZEN"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    organization_id: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Ward Schemas ---
class WardResponse(BaseModel):
    id: str
    ward_number: int
    name: str
    code: str
    geometry: str
    area_km2: float
    population: int
    target_green_coverage_pct: float
    current_green_coverage_pct: Optional[float] = 0.0
    green_space_count: Optional[int] = 0
    health_score: Optional[float] = 0.0
    priority_score: Optional[float] = 0.0

    model_config = ConfigDict(from_attributes=True)

# --- Green Space Schemas ---
class GreenSpaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: str
    geometry: str
    latitude: float
    longitude: float
    area_m2: float
    ward_id: str
    ownership_type: Optional[str] = "Municipal"
    tree_count: Optional[int] = 50
    canopy_percentage: Optional[float] = 45.0
    health_score: Optional[float] = 75.0

class GreenSpaceResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: str
    geometry: str
    latitude: float
    longitude: float
    area_m2: float
    ward_id: str
    ownership_type: str
    status: str
    vegetation_density: float
    tree_count: int
    canopy_percentage: float
    health_score: float
    accessibility_score: float
    biodiversity_score: float
    carbon_estimate: float
    last_assessed_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Citizen Report Schemas ---
class ReportCreate(BaseModel):
    category: str
    title: str
    description: str
    ward_id: str
    green_space_id: Optional[str] = None
    latitude: float
    longitude: float
    images: Optional[List[str]] = []

class ReportStatusUpdate(BaseModel):
    status: str
    assigned_to: Optional[str] = None
    priority: Optional[str] = None
    public_response: Optional[str] = None
    internal_notes: Optional[str] = None
    resolution_evidence_url: Optional[str] = None

class ReportImageResponse(BaseModel):
    id: str
    image_url: str

    model_config = ConfigDict(from_attributes=True)

class ReportResponse(BaseModel):
    id: str
    report_number: str
    category: str
    title: str
    description: str
    ward_id: str
    green_space_id: Optional[str] = None
    latitude: float
    longitude: float
    status: str
    priority: str
    reported_by: Optional[str] = None
    assigned_to: Optional[str] = None
    public_response: Optional[str] = None
    internal_notes: Optional[str] = None
    resolution_evidence_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    images: Optional[List[ReportImageResponse]] = []

    model_config = ConfigDict(from_attributes=True)

# --- Maintenance Task Schemas ---
class MaintenanceTaskCreate(BaseModel):
    green_space_id: str
    report_id: Optional[str] = None
    task_type: str
    description: str
    priority: Optional[str] = "Medium"
    assigned_to: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    due_date: Optional[datetime] = None

class MaintenanceTaskUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    after_images: Optional[List[str]] = None

class MaintenanceTaskResponse(BaseModel):
    id: str
    green_space_id: str
    report_id: Optional[str] = None
    task_type: str
    description: str
    priority: str
    assigned_to: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Analytics & Insights Schemas ---
class AIRecommendationResponse(BaseModel):
    id: str
    ward_id: Optional[str] = None
    green_space_id: Optional[str] = None
    title: str
    description: str
    reason: str
    priority: str
    affected_area: str
    supporting_metrics: Dict[str, Any]
    confidence: float
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EcosystemAssessmentResponse(BaseModel):
    total_green_area_m2: float
    green_coverage_pct: float
    carbon_stored_ton: float
    carbon_seq_ton_yr: float
    accessibility_300m_pct: float
    accessibility_500m_pct: float
    biodiversity_proxy_score: float
    urban_heat_mitigation_index: float
    calculated_at: datetime

# --- Admin & Audit Schemas ---
class AuditLogResponse(BaseModel):
    id: str
    actor_id: Optional[str] = None
    actor_email: Optional[str] = None
    action: str
    resource: str
    resource_id: Optional[str] = None
    metadata_json: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DatasetResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    dataset_type: str
    source: Optional[str] = None
    license: str
    uploaded_by: Optional[str] = None
    processing_status: str
    record_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
