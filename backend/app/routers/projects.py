from backend.app.db.database import get_db
from backend.app.models.issue import Issue, IssueStatus
from backend.app.models.user import User, UserRole
from backend.app.repositories import project_repository
from backend.app.schemas.project import (
    ProjectCreate,
    ProjectMembersUpdate,
    ProjectResponse,
    ProjectUpdate,
)
from backend.app.security import get_current_user, require_role
from backend.app.services.project_service import (
    create_project,
    delete_project,
    update_project,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("/", response_model=ProjectResponse)
def create_new_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
):
    return create_project(
        db,
        project_data,
    )


@router.get("/", response_model=list[ProjectResponse])
def get_visible_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.SUPER_ADMIN:
        projects = project_repository.get_projects(db)

    elif current_user.role == UserRole.PROJECT_MANAGER:
        projects = project_repository.get_projects_for_manager(
            db,
            current_user.id,
        )

    elif current_user.role == UserRole.PROJECT_MEMBER:
        projects = [
            project
            for project in project_repository.get_projects(db)
            if current_user.id in (project.member_ids or [])
        ]

    else:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view projects",
        )

    results = []

    for project in projects:
        open_issue_count = (
            db.query(Issue)
            .filter(
                Issue.project_id == project.id,
                Issue.status == IssueStatus.OPEN,
            )
            .count()
        )

        results.append(
            {
                "id": project.id,
                "name": project.name,
                "description": project.description,
                "manager_id": project.manager_id,
                "member_ids": project.member_ids or [],
                "open_issue_count": open_issue_count,
            }
        )

    return results


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_existing_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
):
    return update_project(db, project_id, project_data)


@router.delete("/{project_id}")
def delete_existing_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
):
    delete_project(db, project_id)
    return {"message": "Project deleted successfully"}


@router.get("/{project_id}/members")
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = project_repository.get_project_by_id(db, project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    if current_user.role == UserRole.PROJECT_MANAGER:
        if project.manager_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not manage this project",
            )
    elif current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to view project members",
        )

    member_ids = project.member_ids or []

    members = (
        db.query(User)
        .filter(
            User.id.in_(member_ids),
            User.role == UserRole.PROJECT_MEMBER,
        )
        .all()
    )

    return [
        {
            "id": member.id,
            "name": member.name,
            "email": member.email,
        }
        for member in members
    ]


@router.get("/{project_id}/available-members")
def get_available_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = project_repository.get_project_by_id(db, project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    if current_user.role == UserRole.PROJECT_MANAGER:
        if project.manager_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You do not manage this project",
            )
    elif current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to manage project members",
        )

    existing_member_ids = project.member_ids or []

    return (
        db.query(User)
        .filter(
            User.role == UserRole.PROJECT_MEMBER,
            ~User.id.in_(existing_member_ids) if existing_member_ids else True,
        )
        .order_by(User.name.asc())
        .all()
    )


@router.put("/{project_id}/members")
def update_project_members(
    project_id: int,
    members_data: ProjectMembersUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = project_repository.get_project_by_id(db, project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

    is_admin = current_user.role == UserRole.SUPER_ADMIN
    is_manager = (
        current_user.role == UserRole.PROJECT_MANAGER
        and project.manager_id == current_user.id
    )

    if not (is_admin or is_manager):
        raise HTTPException(
            status_code=403,
            detail="You can only manage members of your own projects",
        )

    member_ids = list(dict.fromkeys(members_data.member_ids))

    # Check which existing members are being removed.
    current_member_ids = set(project.member_ids or [])
    requested_member_ids = set(member_ids)
    removed_member_ids = current_member_ids - requested_member_ids

    # Prevent removing members who still have unclosed issues.
    for member_id in removed_member_ids:
        unclosed_issue = (
            db.query(Issue)
            .filter(
                Issue.project_id == project_id,
                Issue.assignee_id == member_id,
                Issue.status != IssueStatus.CLOSED,
            )
            .first()
        )

        if unclosed_issue:
            member = db.query(User).filter(User.id == member_id).first()
            member_name = member.name if member else f"Member {member_id}"

            raise HTTPException(
                status_code=400,
                detail=(
                    f"{member_name} has unclosed issues and cannot be removed. "
                    "Please close or reassign their issues first."
                ),
            )

    members = (
        db.query(User)
        .filter(
            User.id.in_(member_ids),
            User.role == UserRole.PROJECT_MEMBER,
        )
        .all()
    )

    if len(members) != len(member_ids):
        raise HTTPException(
            status_code=400,
            detail="One or more selected users are not valid project members",
        )

    project.member_ids = member_ids
    project_repository.update_project(db, project)

    return {
        "message": "Project members updated successfully",
        "members": [
            {
                "id": member.id,
                "name": member.name,
                "email": member.email,
            }
            for member in members
        ],
    }


@router.get("/{project_id}/details")
def get_project_details(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = project_repository.get_project_by_id(db, project_id)

    if project is None:
        raise HTTPException(
            status_code=404,
            detail="Project not found",
        )

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
            detail="You do not have permission to view this project",
        )

    manager = db.query(User).filter(User.id == project.manager_id).first()

    member_ids = project.member_ids or []

    members = (
        db.query(User)
        .filter(
            User.id.in_(member_ids),
            User.role == UserRole.PROJECT_MEMBER,
        )
        .all()
    )
    return {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "manager": (
            {
                "id": manager.id,
                "name": manager.name,
                "email": manager.email,
            }
            if manager
            else None
        ),
        "members": [
            {
                "id": member.id,
                "name": member.name,
                "email": member.email,
            }
            for member in members
        ],
    }
