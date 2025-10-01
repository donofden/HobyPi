"""Auth endpoints: login and me."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.db import get_session
from app.core.security import create_access_token, verify_password, get_current_user
from app.schemas.auth import LoginRequest, TokenResponse
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_session)):
    ident = payload.identifier.strip()
    stmt = select(User).where(or_(User.username == ident, User.email == ident))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    scopes = sorted({s for r in user.roles for s in r.scopes.split()})
    token = create_access_token(subject=str(user.id), email=user.email, scopes=scopes)
    return TokenResponse(access_token=token, expires_in=3600, scope=" ".join(scopes))

@router.get("/me")
async def me(current=Depends(get_current_user)):
    return {
        "id": current.id,
        "username": current.username,
        "email": current.email,
        "full_name": current.full_name,
        "roles": [r.name for r in current.roles],
        "is_active": current.is_active,
    }