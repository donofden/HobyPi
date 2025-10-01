"""Security utilities: hashing, JWT, and auth deps."""
from datetime import datetime, timedelta, timezone
from typing import Sequence
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, SecurityScopes
from jose import jwt, JWTError
from passlib.context import CryptContext
from passlib.hash import pbkdf2_sha256
from pydantic import BaseModel
from app.core.config import settings
from app.models.user import User
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import get_session

# Use PBKDF2 as fallback if bcrypt fails
try:
    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    # Test bcrypt
    pwd_ctx.hash("test")
except Exception:
    # Fallback to PBKDF2 if bcrypt has issues
    pwd_ctx = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

OAUTH2_SCOPES = {
    "users:read": "Read user profiles",
    "users:write": "Create/update/delete users",
    "admin": "Administrative actions",
    "system:read": "Read system metrics",
}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", scopes=OAUTH2_SCOPES)

def hash_password(raw: str) -> str:
    """Hash password safely."""
    return pwd_ctx.hash(raw)

def verify_password(raw: str, hashed: str) -> bool:
    """Verify password safely."""
    return pwd_ctx.verify(raw, hashed)

class JWTPayload(BaseModel):
    sub: str
    email: str
    scope: str
    iss: str
    aud: str
    iat: int
    exp: int
    jti: str

def create_access_token(*, subject: str, email: str, scopes: Sequence[str], expires_minutes: int | None = None, jti: str = "at") -> str:
    now = datetime.now(tz=timezone.utc)
    exp_minutes = expires_minutes or settings.jwt_expire_minutes
    payload = {
        "sub": subject,
        "email": email,
        "scope": " ".join(scopes),
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=exp_minutes)).timestamp()),
        "jti": jti,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)

async def get_current_user(security_scopes: SecurityScopes, token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_session)) -> User:
    auth_error = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials", headers={"WWW-Authenticate": f'Bearer scope="{security_scopes.scope_str}"'})
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm], audience=settings.jwt_audience, options={"verify_aud": True})
        data = JWTPayload(**payload)
    except JWTError:
        raise auth_error
    token_scopes = set(data.scope.split()) if data.scope else set()
    for required in security_scopes.scopes:
        if required not in token_scopes:
            raise HTTPException(status_code=403, detail="Not enough permissions")
    stmt = select(User).where(User.id == int(data.sub))
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()
    if not user or not user.is_active:
        raise auth_error
    return user