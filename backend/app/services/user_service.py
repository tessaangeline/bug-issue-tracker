from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.models.user import User, UserRole
from backend.app.repositories import user_repository
from backend.app.schemas.user import UserCreate
from backend.app.security import hash_password, verify_password, create_access_token, create_refresh_token
from backend.app.schemas.user import UserCreate, UserUpdate
from backend.app.repositories import project_repository


def create_user(db: Session, user_data: UserCreate) -> User:

    existing_user = user_repository.get_by_email(db, user_data.email)

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists.",
        )

    hashed_password = hash_password(user_data.password)

    new_user = User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hashed_password,
        role=UserRole(user_data.role),
    )

    return user_repository.create_user(db, new_user)


def authenticate_user(db: Session, email: str, password: str):

    user = user_repository.get_by_email(db, email)

    if not user:
        return None

    password_valid = verify_password(password, user.password_hash)

    if not password_valid:
        return None

    return user


def login_user(db: Session, email: str, password: str):
    user = authenticate_user(db, email, password)

    if not user:
        return None

    token_data = {
        "sub": str(user.id),
        "role": user.role,
        "token_version": user.token_version,
    }

    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
    }


def get_users(db: Session) -> list[User]:
    return user_repository.get_all_users(db)


def update_user(db: Session, user_id: int, user_data: UserUpdate) -> User:
    user = user_repository.get_by_id(db, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    existing_user = user_repository.get_by_email_excluding_user(
        db, str(user_data.email), user_id
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists.",
        )

    user.name = user_data.name
    user.email = str(user_data.email)
    user.role = UserRole(user_data.role)

    try:
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return user


def delete_user(db: Session, user_id: int, current_user_id: int) -> None:
    if user_id == current_user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account.",
        )

    user = user_repository.get_by_id_for_update(db, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.role == UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=400,
            detail="Super Admin accounts cannot be deleted here.",
        )

    managed_projects = project_repository.get_projects_for_manager(
        db, user_id
    )

    if managed_projects:
        raise HTTPException(
            status_code=400,
            detail="Reassign this user's projects before deleting the account.",
        )

    try:
        projects = project_repository.get_projects_with_member(db, user_id)

        for project in projects:
            project.member_ids = [
                member_id
                for member_id in (project.member_ids or [])
                if member_id != user_id
            ]

        db.delete(user)
        db.commit()

    except Exception:
        db.rollback()
        raise
