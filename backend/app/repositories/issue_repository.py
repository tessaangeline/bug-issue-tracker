from backend.app.models.issue import Issue
from sqlalchemy import func, or_
from sqlalchemy.orm import Session


def create_issue(db: Session, issue: Issue) -> Issue:
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


def get_project_issues(
    db: Session,
    project_id: int,
    search: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    assignee_id: int | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Issue], int]:
    query = db.query(Issue).filter(Issue.project_id == project_id)

    # Search issue titles and descriptions in the database.
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Issue.title.ilike(search_term),
                Issue.description.ilike(search_term),
            )
        )

    # Apply optional filters in the database.
    if status:
        query = query.filter(Issue.status == status)

    if severity:
        query = query.filter(Issue.severity == severity)

    if assignee_id is not None:
        query = query.filter(Issue.assignee_id == assignee_id)

    # Count matching records before applying pagination.
    total = query.with_entities(func.count(Issue.id)).scalar() or 0

    # Retrieve only the requested page.
    issues = (
        query.order_by(Issue.created_at.desc(), Issue.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return issues, total


def get_issue(
    db: Session,
    issue_id: int,
) -> Issue | None:
    return db.query(Issue).filter(Issue.id == issue_id).first()


def update_issue(db: Session, issue: Issue) -> Issue:
    db.commit()
    db.refresh(issue)
    return issue


def get_issues_assigned_to_user(
    db: Session,
    user_id: int,
    search: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    project_id: int | None = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[Issue], int]:
    query = db.query(Issue).filter(Issue.assignee_id == user_id)

    # Search titles and descriptions in the database.
    if search and search.strip():
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Issue.title.ilike(search_term),
                Issue.description.ilike(search_term),
            )
        )

    # Apply filters before pagination.
    if status:
        query = query.filter(Issue.status == status)

    if severity:
        query = query.filter(Issue.severity == severity)

    if project_id is not None:
        query = query.filter(Issue.project_id == project_id)

    # Count all matching issues before applying pagination.
    total = query.with_entities(func.count(Issue.id)).scalar() or 0

    # Fetch only the requested page.
    issues = (
        query.order_by(Issue.created_at.desc(), Issue.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return issues, total


def delete_issue(db: Session, issue: Issue) -> None:
    db.delete(issue)
    db.commit()
