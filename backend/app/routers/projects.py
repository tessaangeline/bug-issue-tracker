from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from backend.app.security import require_role, get_current_user
from backend.app.services.project_service import create_project, get_projects, update_project, delete_project
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

    if current_user.role == UserRole.PROJECT_MEMBER:
        return [
            project
            for project in project_repository.get_projects(db)
            if current_user.id in (project.member_ids or [])
        ]

    raise HTTPException(
        status_code=403,
        detail="You do not have permission to view projects",
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_existing_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.SUPER_ADMIN])
    ),
):
    return update_project(db, project_id, project_data)


@router.delete("/{project_id}")
def delete_existing_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.SUPER_ADMIN])
    ),
):
    delete_project(db, project_id)
    return {"message": "Project deleted successfully"}


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


@router.get("/{project_id}/details")
def get_project_details(
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

    elif current_user.role == UserRole.PROJECT_MEMBER:
        if current_user.id not in (project.member_ids or []):
            raise HTTPException(
                status_code=403,
                detail="You are not a member of this project",
            )

    elif current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view this project",
        )

    manager = (
        db.query(User)
        .filter(User.id == project.manager_id)
        .first()
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
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "manager": (
            {
                "id": manager.id,
                "name": manager.name,
                "email": manager.email,
            }
            if manager
            else None
        ),
        "members": [
            {
                "id": member.id,
                "name": member.name,
                "email": member.email,
            }
            for member in members
        ],
    }
