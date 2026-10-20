from enum import Enum

from backend.app.db.base import Base
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    PROJECT_MANAGER = "project_manager"
    PROJECT_MEMBER = "project_member"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column()
    email: Mapped[str] = mapped_column(unique=True)
    password_hash: Mapped[str] = mapped_column()
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(
            UserRole,
            name="user_role",
            values_callable=lambda enum: [member.value for member in enum],
        )
    )
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id"), nullable=True
    )
    token_version: Mapped[int] = mapped_column(default=0)
