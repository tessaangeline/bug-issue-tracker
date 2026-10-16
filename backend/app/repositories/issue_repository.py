from sqlalchemy.orm import Session
from backend.app.models.issue import Issue


def create_issue(db: Session, issue: Issue) -> Issue:
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


def get_project_issues(
    db: Session,
    project_id: int,
) -> list[Issue]:
    return db.query(Issue).filter(
        Issue.project_id == project_id
    ).all()


def get_issue(
        db: Session,
        issue_id: int,
) -> Issue | None:
    return db.query(Issue).filter(
        Issue.id == issue_id
    ).first()


def update_issue(db: Session, issue: Issue) -> Issue:
    db.commit()
    db.refresh(issue)
    return issue


def get_issues_assigned_to_user(
    db: Session,
    user_id: int,
) -> list[Issue]:
    return (
        db.query(Issue)
        .filter(Issue.assignee_id == user_id)
        .all()
    )
