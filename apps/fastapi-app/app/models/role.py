"""Role model grouping scopes; includes a simple seeder."""
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer
from .base import Base, TimestampMixin

class Role(TimestampMixin, Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    scopes: Mapped[str] = mapped_column(String(255), default="users:read", nullable=False)
    users: Mapped[list["User"]] = relationship("User", secondary="user_roles", back_populates="roles", lazy="selectin")