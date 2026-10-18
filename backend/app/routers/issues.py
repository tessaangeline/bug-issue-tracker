
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.schemas.issue import (
    IssueCreate,
    IssueResponse,
    IssueUpdate,
    IssueStatusUpdate,
)
from backend.app.services.issue_service import (
    create_issue,
    get_project_issues,
    get_issue,
    update_issue,
    update_issue_status,
    get_my_issues,
)
from backend.app.models.user import User, UserRole
from backend.app.security import require_role, get_current_user

router = APIRouter(prefix="/projects", tags=["issues"])
issue_router = APIRouter(prefix="/issues", tags=["issues"])


@router.post("/{project_id}/issues", response_model=IssueResponse)
def create_new_issue(
    project_id: int,
    issue_data: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_issue(
        db,
        issue_data,
        project_id,
        current_user,
    )


@router.get("/{project_id}/issues", response_model=list[IssueResponse])
def get_issues(
    project_id: int,
    db: Session = Depends(get_db),
):
    return get_project_issues(db, project_id)


@issue_router.get("/my-issues", response_model=list[IssueResponse])
def get_assigned_issues(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.PROJECT_MEMBER])
    ),
):
    return get_my_issues(db, current_user.id)


@issue_router.get("/{issue_id}", response_model=IssueResponse)
def get_single_issue(
    issue_id: int,
    db: Session = Depends(get_db),
):
    return get_issue(db, issue_id)


@issue_router.patch("/{issue_id}", response_model=IssueResponse)
def update_existing_issue(
    issue_id: int,
    issue_data: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return update_issue(
        db,
        issue_id,
        issue_data,
        current_user,
    )


@issue_router.patch("/{issue_id}/status", response_model=IssueResponse)
def change_issue_status(
    issue_id: int,
    status_data: IssueStatusUpdate,
    db: Session = Depends(get_db),
):
    return update_issue_status(
        db,
        issue_id,
        status_data.status,
    )
