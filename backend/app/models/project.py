from sqlalchemy import ForeignKey, String, Text, ARRAY, Integer
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    manager_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
    )
    member_ids: Mapped[list[int]] = mapped_column(
        ARRAY(Integer), nullable=False, default=list,)
