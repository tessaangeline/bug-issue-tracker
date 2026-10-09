from pwdlib import PasswordHash
from datetime import timedelta, datetime, timezone
import jwt

from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.db.database import get_db
from backend.app.repositories import user_repository
from backend.app.models.user import UserRole

password_hash = PasswordHash.recommended()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode["type"] = "access"

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode["exp"] = expire

    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm="HS256"
    )
    return encoded_jwt


def create_refresh_token(data: dict):
    to_encode = data.copy()
    to_encode["type"] = "refresh"

    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode["exp"] = expire

    encode_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm="HS256"
    )

    return encode_jwt


def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )

    # Ensure this is an access token
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=401,
            detail="Invalid token type"
        )

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )

    try:
        user_id = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )

    user = user_repository.get_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )

    # Check whether the token has been invalidated
    if payload.get("token_version") != user.token_version:
        raise HTTPException(
            status_code=401,
            detail="Token has been invalidated"
        )

    return user


def require_role(allowed_roles: list[UserRole]):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail="Not enough permissions"
            )

        return current_user
    return role_checker


def refresh_access_token(refresh_token: str, db: Session):
    try:
        payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=["HS256"]
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"
        )
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"
        )

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"

        )

    user = user_repository.get_by_id(db, int(user_id))

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    if payload.get("token_version") != user.token_version:
        raise HTTPException(
            status_code=401,
            detail="Token has been invalidated"
        )

    token_data = {
        "sub": str(user.id),
        "role": user.role,
        "token_version": user.token_version,
    }

    return create_access_token(token_data)
