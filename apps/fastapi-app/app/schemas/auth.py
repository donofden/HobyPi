"""Pydantic schemas for authentication and tokens."""
from pydantic import BaseModel

class LoginRequest(BaseModel):
    identifier: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    scope: str