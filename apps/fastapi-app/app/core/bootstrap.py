"""Startup bootstrap: migrations + seed roles + admin."""
from __future__ import annotations
import os
from alembic import command
from alembic.config import Config
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.db import AsyncSessionLocal
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User

def _alembic_cfg() -> Config:
    cfg = Config("alembic.ini")
    cfg.set_main_option("sqlalchemy.url", settings.db_url_sync)
    return cfg

def run_migrations_to_head() -> None:
    command.upgrade(_alembic_cfg(), "head")  # no-op if up-to-date

async def _ensure_roles(db: AsyncSession) -> None:
    res = await db.execute(select(Role))
    if res.scalars().first():
        return
    db.add_all([
        Role(name="viewer", scopes="users:read system:read"),
        Role(name="editor", scopes="users:read users:write system:read"),
        Role(name="admin",  scopes="users:read users:write admin system:read"),
    ])
    await db.commit()

async def _ensure_admin(db: AsyncSession) -> None:
    username = os.getenv("BOOTSTRAP_ADMIN_USERNAME", "admin")
    email    = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@local")
    full     = os.getenv("BOOTSTRAP_ADMIN_NAME", "Administrator")
    pwd      = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "letmein")

    res = await db.execute(select(User).where(User.username == username))
    user = res.scalar_one_or_none()

    res_admin = await db.execute(select(Role).where(Role.name == "admin"))
    admin_role = res_admin.scalar_one_or_none()
    if not admin_role:
        admin_role = Role(name="admin", scopes="users:read users:write admin system:read")
        db.add(admin_role)
        await db.flush()

    if user is None:
        user = User(username=username, email=email, full_name=full, password_hash=hash_password(pwd), is_active=True, roles=[admin_role])
        db.add(user)
    else:
        user.full_name = full
        user.password_hash = hash_password(pwd)
        if admin_role not in user.roles:
            user.roles.append(admin_role)
    await db.commit()

async def _ensure_viewer(db: AsyncSession) -> None:
    username = os.getenv("BOOTSTRAP_VIEWER_USERNAME", "viewer")
    email    = os.getenv("BOOTSTRAP_VIEWER_EMAIL", "viewer@local")
    full     = os.getenv("BOOTSTRAP_VIEWER_NAME", "System Viewer")
    pwd      = os.getenv("BOOTSTRAP_VIEWER_PASSWORD", "viewpass")

    res = await db.execute(select(User).where(User.username == username))
    user = res.scalar_one_or_none()

    res_viewer = await db.execute(select(Role).where(Role.name == "viewer"))
    viewer_role = res_viewer.scalar_one_or_none()
    if not viewer_role:
        viewer_role = Role(name="viewer", scopes="users:read system:read")
        db.add(viewer_role)
        await db.flush()

    if user is None:
        user = User(username=username, email=email, full_name=full, password_hash=hash_password(pwd), is_active=True, roles=[viewer_role])
        db.add(user)
    else:
        user.full_name = full
        user.password_hash = hash_password(pwd)
        if viewer_role not in user.roles:
            user.roles.append(viewer_role)
    await db.commit()

async def bootstrap_on_startup() -> None:
    run_migrations_to_head()
    async with AsyncSessionLocal() as db:
        await _ensure_roles(db)
        await _ensure_admin(db)
        await _ensure_viewer(db)