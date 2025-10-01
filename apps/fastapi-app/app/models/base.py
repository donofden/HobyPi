"""Shared ORM base classes and mixins."""
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import func, DateTime

class Base(DeclarativeBase):
    """Base class for all database models."""
    pass

class TimestampMixin:
    """Mixin to add created_at and updated_at timestamps to models."""
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)