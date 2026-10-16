from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.models.issue import Issue, IssueStatus
from backend.app.schemas.issue import IssueCreate, IssueUpdate
from backend.app.repositories import issue_repository
from backend.app.models.project import Project
from backend.app.models.user import User, UserRole


def create_issue(
    db: Session,
    issue_data: IssueCreate,
    project_id: int,
) -> Issue:
    project = db.query(Project).filter(
        Project.id == project_id
    ).first()

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    assignee_id = issue_data.assignee_id

    if assignee_id is not None:
        assignee = db.query(User).filter(
            User.id == assignee_id,
            User.role == UserRole.PROJECT_MEMBER,
        ).first()

        if assignee is None or assignee_id not in (project.member_ids or []):
            raise HTTPException(
                status_code=400,
                detail="Assignee must be a member of this project",
            )

    new_issue = Issue(
        title=issue_data.title,
        description=issue_data.description,
        severity=issue_data.severity,
        priority=issue_data.priority,
        status=IssueStatus.OPEN,
        project_id=project_id,
        assignee_id=issue_data.assignee_id,
    )

    return issue_repository.create_issue(db, new_issue)


def get_project_issues(
        db: Session,
        project_id: int,
) -> list[Issue]:
    return issue_repository.get_project_issues(
        db,
        project_id
    )


def get_issue(
        db: Session,
        issue_id: int,
) -> Issue | None:
    return issue_repository.get_issue(
        db,
        issue_id,
    )


def update_issue(
        db: Session,
        issue_id: int,
        issue_data: IssueUpdate,
) -> Issue | None:
    issue = issue_repository.get_issue(db, issue_id)

    if issue is None:
        return None

    update_data = issue_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(issue, field, value)

    return issue_repository.update_issue(db, issue)


def update_issue_status(
        db: Session,
        issue_id: int,
        new_status: IssueStatus,
) -> Issue | None:
    issue = issue_repository.get_issue(db, issue_id)

    if issue is None:
        raise HTTPException(
            status_code=404,
            detail="Issue not found"
        )

    allowed_transition = {
        IssueStatus.OPEN: [IssueStatus.IN_PROGRESS],
        IssueStatus.IN_PROGRESS: [IssueStatus.IN_REVIEW],
        IssueStatus.IN_REVIEW: [IssueStatus.CLOSED],
        IssueStatus.CLOSED: [IssueStatus.OPEN],
    }

    if new_status not in allowed_transition[issue.status]:
        raise HTTPException(
            status_code=400,
            detail="Invalid status transition"
        )

    issue.status = new_status

    return issue_repository.update_issue(db, issue)


def get_my_issues(
    db: Session,
    user_id: int,
) -> list[Issue]:
    return issue_repository.get_issues_assigned_to_user(
        db,
        user_id,
    )
