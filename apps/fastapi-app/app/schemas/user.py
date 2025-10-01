"""Pydantic schemas for User I/O."""
from pydantic import BaseModel, EmailStr

class UserBase(BaseModel):
    username: str
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserRead(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: str
    is_active: bool