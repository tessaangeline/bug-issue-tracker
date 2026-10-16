from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.schemas.project import ProjectCreate, ProjectResponse
from backend.app.security import require_role, get_current_user
from backend.app.services.project_service import create_project, get_projects
from backend.app.repositories import project_repository

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
def get_visible_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.SUPER_ADMIN:
        return project_repository.get_projects(db)

    if current_user.role == UserRole.PROJECT_MANAGER:
        return project_repository.get_projects_for_manager(
            db,
            current_user.id,
        )

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to view projects",
    )


@router.get("/{project_id}/members")
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = project_repository.get_project_by_id(db, project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    if current_user.role == UserRole.PROJECT_MANAGER:
        if project.manager_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not manage this project",
            )
    elif current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view project members",
        )

    member_ids = project.member_ids or []

    members = (
        db.query(User)
        .filter(
            User.id.in_(member_ids),
            User.role == UserRole.PROJECT_MEMBER,
        )
        .all()
    )

    return [
        {
            "id": member.id,
            "name": member.name,
            "email": member.email,
        }
        for member in members
    ]
