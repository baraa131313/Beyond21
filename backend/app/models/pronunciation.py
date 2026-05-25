from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database.connection import Base


class PronunciationAttempt(Base):
    __tablename__ = "pronunciation_attempts"

    id = Column(Integer, primary_key=True, index=True)
    child_id = Column(Integer, ForeignKey("children.id"), nullable=False)
    word_id = Column(String(100), nullable=False)
    word_ar = Column(String(255), nullable=False)
    emoji = Column(String(50), nullable=False)
    passed = Column(Boolean, default=False)
    overall_score = Column(Float, default=0)
    phoneme_scores = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    child = relationship("ChildModel")
