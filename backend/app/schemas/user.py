from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["project_manager", "project_member"] = "project_member"


class UserUpdate(BaseModel):
    name: str
    email: EmailStr
    role: Literal["project_manager", "project_member"]


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)
