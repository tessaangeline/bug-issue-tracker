from backend.app.db.database import get_db
from backend.app.models.user import User, UserRole
from backend.app.schemas.user import UserCreate, UserResponse, UserUpdate
from backend.app.security import get_current_user, require_role
from backend.app.services import user_service
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
):
    return user_service.create_user(db, user)


@router.get("/me", response_model=UserResponse)
def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/admin-test")
def admin_test(current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))):
    return {"message": "You are a super admin!"}


@router.get("/")
def get_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    search: str = "",
    role: str | None = None,
    sort_order: str = Query(
        default="name-asc",
        pattern="^(name-asc|name-desc)$",
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
):
    return user_service.get_users(
        db,
        page=page,
        page_size=page_size,
        search=search,
        role=role,
        sort_order=sort_order,
    )


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
):
    return user_service.update_user(db, user_id, user_data)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN])),
):
    user_service.delete_user(db, user_id, current_user.id)
    return {"message": "User deleted successfully."}
