from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.database.connection import Base


class QuizSession(Base):
    __tablename__ = "quiz_sessions"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id"), nullable=False)
    total_questions = Column(Integer, nullable=False)
    correct = Column(Integer, default=0)
    avg_t = Column(Float, default=0)
    avg_i = Column(Float, default=0)
    avg_f = Column(Float, default=0)
    dominant_action = Column(String(100), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    child = relationship("ChildModel")
