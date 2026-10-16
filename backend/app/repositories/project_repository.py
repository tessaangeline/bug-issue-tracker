from sqlalchemy.orm import Session

from backend.app.models.project import Project


def create_project(db: Session, project: Project) -> Project:
    db.add(project)
    db.commit()
    db.refresh(project)

    return project


def get_projects(db: Session) -> list[Project]:
    return db.query(Project).all()


def get_projects_for_manager(
    db: Session,
    manager_id: int,
) -> list[Project]:
    return (
        db.query(Project)
        .filter(Project.manager_id == manager_id)
        .all()
    )
