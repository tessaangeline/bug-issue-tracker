from sqlalchemy.orm import Session

from backend.app.models.project import Project
from backend.app.schemas.project import ProjectCreate
from backend.app.repositories import project_repository


def create_project(
        db: Session,
        project_data: ProjectCreate,

) -> Project:
    new_project = Project(
        name=project_data.name,
    )
    return project_repository.create_project(db, new_project)


def get_projects(db: Session) -> list[Project]:
    return project_repository.get_projects(db)
