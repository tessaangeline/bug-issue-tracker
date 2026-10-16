from sqlalchemy.orm import Session

from backend.app.models.user import User, UserRole
from backend.app.repositories import user_repository
from backend.app.schemas.user import UserCreate
from backend.app.security import hash_password, verify_password, create_access_token, create_refresh_token


def create_user(db: Session, user_data: UserCreate) -> User:
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
