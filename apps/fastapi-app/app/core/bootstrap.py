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
    """Create default roles if they don't exist"""
    # Check each role individually to handle partial existing data
    role_definitions = [
        ("viewer", "users:read system:read"),
        ("editor", "users:read users:write system:read"),
        ("admin", "users:read users:write admin system:read"),
    ]
    
    existing_roles = []
    for role_name, scopes in role_definitions:
        res = await db.execute(select(Role).where(Role.name == role_name))
        role = res.scalar_one_or_none()
        
        if role is None:
            new_role = Role(name=role_name, scopes=scopes)
            db.add(new_role)
            print(f"✓ Created role: {role_name}")
        else:
            # Update scopes if they've changed
            if role.scopes != scopes:
                role.scopes = scopes
                print(f"✓ Updated role scopes: {role_name}")
            existing_roles.append(role_name)
    
    if existing_roles:
        print(f"✓ Existing roles found: {', '.join(existing_roles)}")
    
    await db.commit()

async def _ensure_admin(db: AsyncSession) -> None:
    """Create default admin user with full access"""
    username = os.getenv("BOOTSTRAP_ADMIN_USERNAME", "admin")
    email    = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@local")
    full     = os.getenv("BOOTSTRAP_ADMIN_NAME", "HobyPi Administrator")
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
        print(f"✓ Created default admin user: {username}")
    else:
        user.full_name = full
        user.password_hash = hash_password(pwd)
        if admin_role not in user.roles:
            user.roles.append(admin_role)
        print(f"✓ Updated existing admin user: {username}")
    await db.commit()

async def _ensure_viewer(db: AsyncSession) -> None:
    """Create default viewer user with read-only access"""
    username = os.getenv("BOOTSTRAP_VIEWER_USERNAME", "viewer")
    email    = os.getenv("BOOTSTRAP_VIEWER_EMAIL", "viewer@local")
    full     = os.getenv("BOOTSTRAP_VIEWER_NAME", "System Viewer")
    pwd      = os.getenv("BOOTSTRAP_VIEWER_PASSWORD", "letmein")  # Changed to match admin password

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
        print(f"✓ Created default viewer user: {username}")
    else:
        user.full_name = full
        user.password_hash = hash_password(pwd)
        if viewer_role not in user.roles:
            user.roles.append(viewer_role)
        print(f"✓ Updated existing viewer user: {username}")
    await db.commit()

async def bootstrap_on_startup() -> None:
    """
    Bootstrap the application on startup:
    1. Run database migrations to latest
    2. Ensure default roles exist
    3. Ensure default admin and viewer users exist
    
    This runs every time the application starts and ensures
    the basic data is always available for deployment.
    """
    print("🚀 Starting application bootstrap...")
    
    # Run migrations first
    print("📊 Running database migrations...")
    run_migrations_to_head()
    print("✓ Database migrations completed")
    
    # Initialize database session and create default data
    async with AsyncSessionLocal() as db:
        print("👥 Ensuring default roles and users...")
        await _ensure_roles(db)
        await _ensure_admin(db)
        await _ensure_viewer(db)
        
    print("✅ Bootstrap completed successfully!")
    print("📋 Default credentials:")
    print("   Admin: admin / letmein")
    print("   Viewer: viewer / letmein")