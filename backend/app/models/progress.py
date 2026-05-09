from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func

from app.database.connection import Base
from sqlalchemy.orm import relationship


class ProgressModel(Base):
    __tablename__ = "progress"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id"), nullable=False)
    module = Column(String(50), nullable=False)
    word = Column(String(255), nullable=True)
    score = Column(Float, nullable=True)
    correct = Column(Integer, default=0)
    wrong = Column(Integer, default=0)
    stars = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    child = relationship("ChildModel", back_populates="progress")
