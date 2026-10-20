
from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    manager_id: int
    member_ids: list[int] = Field(min_length=1)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    manager_id: int | None = None
    member_ids: list[int] | None = Field(default=None, min_length=1)


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str | None
    manager_id: int
    member_ids: list[int] = Field(default_factory=list)
    open_issue_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ProjectMembersUpdate(BaseModel):
    member_ids: list[int] = Field(min_length=1)
