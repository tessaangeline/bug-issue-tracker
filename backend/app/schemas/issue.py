from datetime import datetime, timedelta, timezone

from backend.app.models.issue import (
    IssueSeverity,
    IssueStatus,
)
from pydantic import BaseModel, Field, computed_field, field_validator


class IssueCreate(BaseModel):
    title: str
    description: str
    severity: IssueSeverity
    assignee_id: int | None = None
    estimated_duration_days: float | None = Field(
        default=None,
        ge=1,
        le=36500,
    )

    @field_validator("estimated_duration_days")
    @classmethod
    def validate_estimated_duration(cls, value: float | None) -> float | None:
        if value is None:
            return value

        if round(value, 2) != value:
            raise ValueError("Estimated duration can have at most 2 decimal places.")

        return value


class IssueResponse(BaseModel):
    id: int
    title: str
    description: str
    status: IssueStatus
    severity: IssueSeverity
    project_id: int
    assignee_id: int | None

    created_at: datetime
    estimated_duration_days: float | None = None
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def due_date(self) -> datetime | None:
        if self.estimated_duration_days is None:
            return None

        return self.created_at + timedelta(days=self.estimated_duration_days)

    @computed_field
    @property
    def actual_duration_days(self) -> float | None:
        if self.completed_at is None:
            return None

        created = self.created_at
        completed = self.completed_at

        # Handle timestamps that may lack timezone information.
        if created.tzinfo is None and completed.tzinfo is not None:
            created = created.replace(tzinfo=timezone.utc)
        elif completed.tzinfo is None and created.tzinfo is not None:
            completed = completed.replace(tzinfo=timezone.utc)

        seconds = (completed - created).total_seconds()
        return round(max(seconds, 0) / 86400, 2)


class IssueUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: IssueSeverity | None = None
    assignee_id: int | None = None
    estimated_duration_days: float | None = Field(
        default=None,
        ge=1,
        le=36500,
    )

    @field_validator("estimated_duration_days")
    @classmethod
    def validate_estimated_duration(cls, value: float | None) -> float | None:
        if value is None:
            return value

        if round(value, 2) != value:
            raise ValueError("Estimated duration can have at most 2 decimal places.")

        return value


class IssueStatusUpdate(BaseModel):
    status: IssueStatus
