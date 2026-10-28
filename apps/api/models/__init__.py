import uuid
import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from apps.api.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    contact_email = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    users = relationship("User", back_populates="organization")

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="CITIZEN", index=True)  # CITIZEN, OFFICER, PLANNER, ADMIN, SUPER_ADMIN
    organization_id = Column(String(36), ForeignKey("organizations.id"), nullable=True)
    phone = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    organization = relationship("Organization", back_populates="users")
    reports_submitted = relationship("CitizenReport", foreign_keys="[CitizenReport.reported_by]", back_populates="reporter")
    reports_assigned = relationship("CitizenReport", foreign_keys="[CitizenReport.assigned_to]", back_populates="assignee")

class Ward(Base):
    __tablename__ = "wards"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    ward_number = Column(Integer, unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False, index=True)
    code = Column(String(50), unique=True, nullable=False)
    geometry = Column(Text, nullable=False)  # GeoJSON representation of polygon boundary
    area_km2 = Column(Float, nullable=False)
    population = Column(Integer, default=0)
    target_green_coverage_pct = Column(Float, default=25.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    green_spaces = relationship("GreenSpace", back_populates="ward")
    reports = relationship("CitizenReport", back_populates="ward")

class GreenSpace(Base):
    __tablename__ = "green_spaces"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False, index=True)  # Park, Urban Forest, Garden, Playground, Roadside Greenery, Institutional Green Space, Wetland, Community Garden, Other
    geometry = Column(Text, nullable=False)  # GeoJSON polygon or multipolygon
    latitude = Column(Float, nullable=False)  # Centroid lat
    longitude = Column(Float, nullable=False) # Centroid lng
    area_m2 = Column(Float, nullable=False)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False, index=True)
    ownership_type = Column(String(100), default="Municipal")  # Municipal, Private, Institutional, State Forest
    status = Column(String(50), default="Active", index=True)
    vegetation_density = Column(Float, default=0.6)  # 0 to 1 scale
    tree_count = Column(Integer, default=50)
    canopy_percentage = Column(Float, default=45.0)
    health_score = Column(Float, default=75.0, index=True)  # 0 to 100
    accessibility_score = Column(Float, default=80.0)  # 0 to 100
    biodiversity_score = Column(Float, default=65.0)   # 0 to 100
    carbon_estimate = Column(Float, default=12.5)       # Metric Tons Carbon Stored
    last_assessed_at = Column(DateTime, default=datetime.datetime.utcnow)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    ward = relationship("Ward", back_populates="green_spaces")
    images = relationship("GreenSpaceImage", back_populates="green_space", cascade="all, delete-orphan")
    metrics = relationship("GreenSpaceMetric", back_populates="green_space", cascade="all, delete-orphan")
    reports = relationship("CitizenReport", back_populates="green_space")
    maintenance_tasks = relationship("MaintenanceTask", back_populates="green_space")

class GreenSpaceImage(Base):
    __tablename__ = "green_space_images"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    green_space_id = Column(String(36), ForeignKey("green_spaces.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    caption = Column(String(255), nullable=True)
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    green_space = relationship("GreenSpace", back_populates="images")

class GreenSpaceMetric(Base):
    __tablename__ = "green_space_metrics"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    green_space_id = Column(String(36), ForeignKey("green_spaces.id"), nullable=False)
    metric_date = Column(DateTime, default=datetime.datetime.utcnow)
    canopy_percentage = Column(Float, nullable=False)
    health_score = Column(Float, nullable=False)
    carbon_seq_ton_yr = Column(Float, nullable=False)
    tree_count = Column(Integer, nullable=False)
    biodiversity_index = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    green_space = relationship("GreenSpace", back_populates="metrics")

class Tree(Base):
    __tablename__ = "trees"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    green_space_id = Column(String(36), ForeignKey("green_spaces.id"), nullable=True)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False)
    species = Column(String(255), nullable=False)
    estimated_age_years = Column(Integer, default=10)
    height_m = Column(Float, default=8.5)
    dbh_cm = Column(Float, default=25.0)  # Diameter at breast height
    health_status = Column(String(50), default="Healthy")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class CitizenReport(Base):
    __tablename__ = "citizen_reports"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_number = Column(String(50), unique=True, nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True) # Damaged Tree, Illegal Tree Cutting, Garbage in Green Space, Watering Issue, Damaged Infrastructure, Encroachment, Poor Maintenance, Fire / Environmental Hazard, Other
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=False, index=True)
    green_space_id = Column(String(36), ForeignKey("green_spaces.id"), nullable=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String(50), default="Submitted", index=True) # Submitted, Under Review, Assigned, In Progress, Resolved, Closed, Rejected, Duplicate
    priority = Column(String(50), default="Medium", index=True) # Low, Medium, High, Critical
    reported_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    public_response = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)
    resolution_evidence_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    ward = relationship("Ward", back_populates="reports")
    green_space = relationship("GreenSpace", back_populates="reports")
    reporter = relationship("User", foreign_keys=[reported_by], back_populates="reports_submitted")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="reports_assigned")
    images = relationship("ReportImage", back_populates="report", cascade="all, delete-orphan")
    comments = relationship("ReportComment", back_populates="report", cascade="all, delete-orphan")
    history = relationship("ReportStatusHistory", back_populates="report", cascade="all, delete-orphan")

class ReportImage(Base):
    __tablename__ = "report_images"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("citizen_reports.id"), nullable=False)
    image_url = Column(String(500), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("CitizenReport", back_populates="images")

class ReportComment(Base):
    __tablename__ = "report_comments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("citizen_reports.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    comment = Column(Text, nullable=False)
    is_internal = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("CitizenReport", back_populates="comments")

class ReportStatusHistory(Base):
    __tablename__ = "report_status_history"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_id = Column(String(36), ForeignKey("citizen_reports.id"), nullable=False)
    changed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    old_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    report = relationship("CitizenReport", back_populates="history")

class MaintenanceTask(Base):
    __tablename__ = "maintenance_tasks"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    green_space_id = Column(String(36), ForeignKey("green_spaces.id"), nullable=False)
    report_id = Column(String(36), ForeignKey("citizen_reports.id"), nullable=True)
    task_type = Column(String(100), nullable=False) # Pruning, Tree Planting, Irrigation, Debris Removal, Infrastructure Repair, Pest Control, General Maintenance
    description = Column(Text, nullable=False)
    priority = Column(String(50), default="Medium") # Low, Medium, High, Critical
    assigned_to = Column(String(36), ForeignKey("users.id"), nullable=True)
    scheduled_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="Planned") # Planned, Assigned, In Progress, Completed, Cancelled
    notes = Column(Text, nullable=True)
    before_images = Column(JSON, nullable=True) # JSON list of URLs
    after_images = Column(JSON, nullable=True)  # JSON list of URLs
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    green_space = relationship("GreenSpace", back_populates="maintenance_tasks")

class EcosystemAssessment(Base):
    __tablename__ = "ecosystem_assessments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=True)
    green_space_id = Column(String(36), ForeignKey("green_spaces.id"), nullable=True)
    total_green_area_m2 = Column(Float, nullable=False)
    green_coverage_pct = Column(Float, nullable=False)
    carbon_stored_ton = Column(Float, nullable=False)
    carbon_seq_ton_yr = Column(Float, nullable=False)
    accessibility_300m_pct = Column(Float, default=70.0)
    accessibility_500m_pct = Column(Float, default=85.0)
    biodiversity_proxy_score = Column(Float, default=68.0)
    urban_heat_mitigation_index = Column(Float, default=72.0)
    calculated_at = Column(DateTime, default=datetime.datetime.utcnow)

class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    ward_id = Column(String(36), ForeignKey("wards.id"), nullable=True)
    green_space_id = Column(String(36), ForeignKey("green_spaces.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    reason = Column(Text, nullable=False)
    priority = Column(String(50), default="Medium") # Critical, High, Medium, Low
    affected_area = Column(String(255), nullable=False)
    supporting_metrics = Column(JSON, nullable=False)
    confidence = Column(Float, default=0.88)
    generated_at = Column(DateTime, default=datetime.datetime.utcnow)

class Dataset(Base):
    __tablename__ = "datasets"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    dataset_type = Column(String(100), nullable=False) # GeoJSON, Shapefile, CSV, Satellite Raster
    source = Column(String(255), nullable=True)
    license = Column(String(100), default="Open Government Data License")
    uploaded_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    processing_status = Column(String(50), default="COMPLETED") # QUEUED, PROCESSING, COMPLETED, FAILED
    record_count = Column(Integer, default=0)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    link = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False)
    type = Column(String(50), default="INFO")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    actor_id = Column(String(36), nullable=True)
    actor_email = Column(String(255), nullable=True)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    resource_id = Column(String(255), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
