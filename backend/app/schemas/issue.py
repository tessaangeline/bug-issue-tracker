from pydantic import BaseModel
from backend.app.models.issue import IssueSeverity, IssuePriority, IssueStatus


class IssueCreate(BaseModel):
    title: str
    description: str
    severity: IssueSeverity
    priority: IssuePriority


class IssueResponse(BaseModel):
    id: int
    title: str
    description: str
    status: IssueStatus
    severity: IssueSeverity
    priority: IssuePriority
    project_id: int
    assignee_id: int | None


class IssueUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: IssueSeverity | None = None
    priority: IssuePriority | None = None
    assignee_id: int | None = None


class IssueStatusUpdate(BaseModel):
    status: IssueStatus
