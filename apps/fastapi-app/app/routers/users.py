"""User CRUD with scope enforcement."""
from fastapi import APIRouter, Depends, Security, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_session
from app.core.security import get_current_user, hash_password
from app.schemas.user import UserCreate, UserRead
from app.models.user import User

router = APIRouter(prefix="/users", tags=["User Management"])

@router.get("", response_model=list[UserRead])
async def list_users(
    db: AsyncSession = Depends(get_session),
    _=Security(get_current_user, scopes=["users:read"])  # noqa
):
    res = await db.execute(select(User))
    users = res.scalars().all()
    return [UserRead(id=u.id, username=u.username, email=u.email, full_name=u.full_name, is_active=u.is_active) for u in users]

@router.post("", response_model=UserRead)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_session),
    _=Security(get_current_user, scopes=["users:write"])  # noqa
):
    exists = await db.execute(
        select(User).where((User.email == payload.email) | (User.username == payload.username))
    )
    if exists.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or email already in use")
    u = User(
        username=payload.username,
        email=payload.email,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
        is_active=True,
    )
    db.add(u)
    await db.commit()
    await db.refresh(u)
    return UserRead(id=u.id, username=u.username, email=u.email, full_name=u.full_name, is_active=u.is_active)