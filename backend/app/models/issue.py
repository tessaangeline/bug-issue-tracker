from sqlalchemy import Enum as SQLEnum, ForeignKey

from enum import Enum

from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class IssueStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    IN_REVIEW = "in_review"
    CLOSED = "closed"


class IssueSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IssuePriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column()
    description: Mapped[str] = mapped_column()
    status: Mapped[IssueStatus] = mapped_column(
        SQLEnum(IssueStatus, name="issue_status", values_callable=lambda enum: [
            member.value for member in enum])
    )
    severity: Mapped[IssueSeverity] = mapped_column(
        SQLEnum(IssueSeverity, name="issue_severity", values_callable=lambda enum: [
            member.value for member in enum])
    )
    priority: Mapped[IssuePriority] = mapped_column(
        SQLEnum(IssuePriority, name="issue_priority", values_callable=lambda enum: [
            member.value for member in enum])
    )
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id")
    )
    assignee_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True
    )
