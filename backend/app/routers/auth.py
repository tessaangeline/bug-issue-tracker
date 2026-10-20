from backend.app.db.database import get_db
from backend.app.models.user import User
from backend.app.security import get_current_user, refresh_access_token
from backend.app.services.user_service import login_user
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

# OAuth2PasswordRequestForm expects login credentials to be sent as form data, not JSON.


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    tokens = login_user(db, form_data.username, form_data.password)

    if not tokens:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": "bearer",
    }


@router.post("/refresh")
def refresh(
    refresh_token: str,
    db: Session = Depends(get_db),
):
    access_token = refresh_access_token(
        refresh_token,
        db,
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.token_version += 1
    db.commit()

    return {"message": "Logged out successfully!"}
