from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.database import get_db
from backend.app.schemas.user import UserCreate, UserResponse
from backend.app.services import user_service
from backend.app.security import require_role, get_current_user

from backend.app.models.user import User, UserRole
from backend.app.security import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate, db: Session = Depends(get_db),
):

    return user_service.create_user(db, user)


@router.get("/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


@router.get("/admin-test")
def admin_test(
    current_user: User = Depends(
        require_role([UserRole.SUPER_ADMIN])
    )
):
    return {"message": "You are a super admin!"}
