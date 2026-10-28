from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from apps.api.database import get_db
from apps.api.models import Dataset, User
from apps.api.schemas import DatasetResponse
from apps.api.dependencies import require_roles, create_audit_log

router = APIRouter(prefix="/datasets", tags=["Dataset Management"])

@router.get("", response_model=List[DatasetResponse])
def get_datasets(db: Session = Depends(get_db)):
    return db.query(Dataset).order_by(Dataset.created_at.desc()).all()

@router.post("/import")
def import_dataset(
    name: str,
    dataset_type: str,
    description: str = None,
    source: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "PLANNER"]))
):
    ds = Dataset(
        name=name,
        description=description or "Urban GIS Dataset",
        dataset_type=dataset_type,
        source=source or "Municipal Spatial Data Portal",
        uploaded_by=current_user.id,
        processing_status="COMPLETED",
        record_count=124,
        metadata_json={"crs": "EPSG:4326", "format": dataset_type}
    )
    db.add(ds)
    db.commit()
    db.refresh(ds)

    create_audit_log(db, action="DATASET_IMPORTED", resource="dataset", resource_id=ds.id, actor=current_user)

    return ds
