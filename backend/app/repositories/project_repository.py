from backend.app.models.issue import Issue, IssueStatus
from backend.app.models.project import Project
from backend.app.models.user import User
from sqlalchemy.orm import Session


def create_project(db: Session, project: Project) -> Project:
    db.add(project)
    db.commit()
    db.refresh(project)

    return project


def get_projects(db: Session) -> list[Project]:
    return db.query(Project).order_by(Project.name.asc()).all()


def get_projects_for_manager(
    db: Session,
    manager_id: int,
) -> list[Project]:
    return db.query(Project).filter(Project.manager_id == manager_id).all()


def get_open_issue_count(db: Session, project_id: int) -> int:
    return (
        db.query(Issue)
        .filter(
            Issue.project_id == project_id,
            Issue.status == IssueStatus.OPEN,
        )
        .count()
    )


def get_project_by_id(db: Session, project_id: int) -> Project | None:
    return db.query(Project).filter(Project.id == project_id).first()


def get_projects_with_member(
    db: Session,
    user_id: int,
) -> list[Project]:
    return db.query(Project).filter(Project.member_ids.any(user_id)).all()


def update_project(db: Session, project: Project) -> Project:
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project: Project) -> None:
    db.delete(project)
    db.commit()


def has_project_issues(db: Session, project_id: int) -> bool:
    from backend.app.models.issue import Issue, IssueStatus

    return (
        db.query(Issue)
        .filter(
            Issue.project_id == project_id,
            Issue.status != IssueStatus.CLOSED,
        )
        .first()
        is not None
    )


def get_users_assigned_to_project(
    db: Session,
    project_id: int,
):
    from backend.app.models.user import User

    return db.query(User).filter(User.project_id == project_id).all()


def permanently_delete_project(
    db: Session,
    project: Project,
) -> None:
    try:
        # 1. Remove users' references to this project.
        db.query(User).filter(User.project_id == project.id).update(
            {User.project_id: None},
            synchronize_session=False,
        )

        # 2. Delete the project's associated issues.
        db.query(Issue).filter(Issue.project_id == project.id).delete(
            synchronize_session=False
        )

        # 3. Delete the project itself.
        db.delete(project)

        # 4. Commit everything together.
        db.commit()

    except Exception:
        db.rollback()
        raise
