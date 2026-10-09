from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.schemas.project import ProjectCreate, ProjectResponse
from backend.app.security import require_role
from backend.app.services.project_service import create_project, get_projects

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse)
def create_new_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.SUPER_ADMIN])),
):
    return create_project(
        db,
        project_data,
    )


@router.get("/", response_model=list[ProjectResponse])
def get_all_projects(
    db: Session = Depends(get_db),
):
    return get_projects(db)
