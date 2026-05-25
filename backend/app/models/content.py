from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func

from app.database.connection import Base


class CustomWord(Base):
    __tablename__ = "custom_words"

    id = Column(Integer, primary_key=True, index=True)
    ar = Column(String(255), nullable=False)
    translit = Column(String(255), nullable=False)
    en = Column(String(255), nullable=False)
    emoji = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)
    created_by = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)


class CustomQuiz(Base):
    __tablename__ = "custom_quizzes"

    id = Column(Integer, primary_key=True, index=True)
    question_text = Column(String(500), nullable=False)
    question_type = Column(String(50), nullable=False, default="emoji-choice")
    options = Column(Text, nullable=False)
    created_by = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
