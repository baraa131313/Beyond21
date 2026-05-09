from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database.connection import Base


class ChildModel(Base):
    __tablename__ = "children"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    age = Column(Integer, nullable=True)
    avatar = Column(String(50), default="🧒")
    pin = Column(String(6), nullable=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    parent = relationship("UserModel", back_populates="children")
    progress = relationship("ProgressModel", back_populates="child", cascade="all, delete-orphan")
