
from fastapi import APIRouter, Depends, Query, HTTPException
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
    delete_issue,
)
from backend.app.models.user import User, UserRole
from backend.app.security import require_role, get_current_user
from backend.app.repositories import project_repository

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


@router.get("/{project_id}/issues")
def get_issues(
    project_id: int,
    search: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = project_repository.get_project_by_id(db, project_id)

    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

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
            detail="You do not have permission to view these issues",
        )

    return get_project_issues(
        db=db,
        project_id=project_id,
        search=search,
        status=status,
        severity=severity,
        page=page,
        page_size=page_size,
    )


@issue_router.get("/my-issues")
def get_assigned_issues(
    search: str | None = None,
    status: str | None = None,
    severity: str | None = None,
    project_id: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.PROJECT_MEMBER])
    ),
):
    return get_my_issues(
        db=db,
        user_id=current_user.id,
        search=search,
        status=status,
        severity=severity,
        project_id=project_id,
        page=page,
        page_size=page_size,
    )


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
    current_user: User = Depends(get_current_user),
):
    return update_issue_status(
        db,
        issue_id,
        status_data.status,
        current_user,
    )


@issue_router.delete("/{issue_id}", status_code=204)
def delete_existing_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_issue(db, issue_id, current_user)
