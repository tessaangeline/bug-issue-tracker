
import re
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    field_validator,
)


def validate_name(name: str) -> str:
    name = name.strip()

    if len(name) < 2:
        raise ValueError("Name must contain at least 2 characters.")

    if len(name) > 100:
        raise ValueError("Name must not exceed 100 characters.")

    # Allow letters with spaces, apostrophes, and hyphens.
    # Reject numbers, HTML tags, and special characters.
    if not re.fullmatch(r"[A-Za-z]+(?:[ '-][A-Za-z]+)*", name):
        raise ValueError(
            "Enter a valid name using letters, spaces, apostrophes, or hyphens."
        )

    return name


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Literal["project_manager", "project_member"] = "project_member"

    @field_validator("name")
    @classmethod
    def check_name(cls, value: str) -> str:
        return validate_name(value)


class UserUpdate(BaseModel):
    name: str
    email: EmailStr
    role: Literal["project_manager", "project_member"]

    @field_validator("name")
    @classmethod
    def check_name(cls, value: str) -> str:
        return validate_name(value)


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)
