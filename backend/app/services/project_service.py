from sqlalchemy import func
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.models.project import Project
from backend.app.schemas.project import ProjectCreate, ProjectUpdate
from backend.app.repositories import project_repository
from backend.app.models.user import User, UserRole
from backend.app.models.issue import Issue, IssueStatus


def create_project(
    db: Session,
    project_data: ProjectCreate,
) -> Project:
    name = project_data.name.strip()

    if not name:
        raise HTTPException(
            status_code=422,
            detail="Project name cannot be empty.",
        )

    existing_project = (
        db.query(Project)
        .filter(func.lower(Project.name) == name.lower())
        .first()
    )

    if existing_project:
        raise HTTPException(
            status_code=409,
            detail="A project with this name already exists.",
        )

    new_project = Project(
        name=name,
        description=project_data.description,
        manager_id=project_data.manager_id,
        member_ids=project_data.member_ids,
    )
    return project_repository.create_project(db, new_project)


def update_project(
    db: Session,
    project_id: int,
    project_data: ProjectUpdate,
) -> Project:
    project = project_repository.get_project_by_id(db, project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    update_data = project_data.model_dump(exclude_unset=True)

    for field in ("name", "manager_id", "member_ids"):
        if field in update_data and update_data[field] is None:
            raise HTTPException(
                status_code=422,
                detail=f"{field} cannot be null",
            )

    if "name" in update_data:
        name = update_data["name"].strip()

        if not name:
            raise HTTPException(
                status_code=422,
                detail="Project name cannot be empty.",
            )

        existing_project = (
            db.query(Project)
            .filter(
                func.lower(Project.name) == name.lower(),
                Project.id != project_id,
            )
            .first()
        )

        if existing_project:
            raise HTTPException(
                status_code=409,
                detail="A project with this name already exists.",
            )

        update_data["name"] = name

    for field, value in update_data.items():
        setattr(project, field, value)

    return project_repository.update_project(db, project)


def get_projects(db: Session) -> list[Project]:
    return project_repository.get_projects(db)


def update_project(
    db: Session,
    project_id: int,
    project_data: ProjectUpdate,
) -> Project:
    project = project_repository.get_project_by_id(db, project_id)

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = project_data.model_dump(exclude_unset=True)

    # These fields are required by the Project model.
    for field in ("name", "manager_id", "member_ids"):
        if field in update_data and update_data[field] is None:
            raise HTTPException(
                status_code=422,
                detail=f"{field} cannot be null",
            )

    for field, value in update_data.items():
        setattr(project, field, value)

    return project_repository.update_project(db, project)


def delete_project(db: Session, project_id: int) -> None:
    project = project_repository.get_project_by_id(
        db, project_id
    )

    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found.",
        )

    has_active_issues = (
        db.query(Issue)
        .filter(
            Issue.project_id == project_id,
            Issue.status != IssueStatus.CLOSED,
        )
        .first()
        is not None
    )

    if has_active_issues:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Cannot delete this project because it has "
                "open or in-progress issues. Close them first."
            ),
        )

    project_repository.permanently_delete_project(
        db, project
    )
