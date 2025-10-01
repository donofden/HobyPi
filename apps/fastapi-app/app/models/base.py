"""Shared ORM base mixins (timestamps)."""
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import func, DateTime

class TimestampMixin:
    created_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)