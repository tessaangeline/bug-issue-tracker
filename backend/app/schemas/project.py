from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    manager_id: int
    member_ids: list[int] = Field(default_factory=list)


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: str | None
    manager_id: int
    member_ids: list[int] = Field(default_factory=list)
