from sqlalchemy.orm import Session

from backend.app.models.project import Project


def create_project(db: Session, project: Project) -> Project:
    db.add(project)
    db.commit()
    db.refresh(project)

    return project


def get_projects(db: Session) -> list[Project]:
    return db.query(Project).all()
