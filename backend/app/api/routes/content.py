import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from app.auth import get_current_user
from app.database.connection import get_db
from app.models.content import CustomWord, CustomQuiz
from app.models.user import UserModel

router = APIRouter()


def _require_specialist(user: UserModel = Depends(get_current_user)):
    if user.role != "specialist":
        raise HTTPException(status_code=403, detail="Specialist access required")
    return user


class WordCreate(BaseModel):
    ar: str = Field(..., max_length=255)
    translit: str = Field(..., max_length=255)
    en: str = Field(..., max_length=255)
    emoji: str = Field(..., max_length=50)
    category: str = Field(..., max_length=50)


class QuizOptionInput(BaseModel):
    label: str
    value: str
    correct: bool
    color: Optional[str] = None


class QuizCreate(BaseModel):
    question_text: str = Field(..., max_length=500)
    question_type: str = Field("emoji-choice", pattern="^(emoji-choice|color-choice)$")
    options: list[QuizOptionInput]


@router.get("/words")
def list_words(db: Session = Depends(get_db)):
    words = db.query(CustomWord).order_by(CustomWord.created_at.desc()).all()
    return [
        {
            "id": f"cw{w.id}",
            "ar": w.ar,
            "translit": w.translit,
            "en": w.en,
            "emoji": w.emoji,
            "category": w.category,
            "created_by": w.created_by,
            "created_at": w.created_at.isoformat() if w.created_at else None,
        }
        for w in words
    ]


@router.post("/words")
def create_word(data: WordCreate, user: UserModel = Depends(_require_specialist), db: Session = Depends(get_db)):
    word = CustomWord(
        ar=data.ar,
        translit=data.translit,
        en=data.en,
        emoji=data.emoji,
        category=data.category,
        created_by=user.id,
    )
    db.add(word)
    db.commit()
    db.refresh(word)
    return {
        "id": f"cw{word.id}",
        "ar": word.ar,
        "translit": word.translit,
        "en": word.en,
        "emoji": word.emoji,
        "category": word.category,
    }


@router.delete("/words/{word_id}")
def delete_word(word_id: int, user: UserModel = Depends(_require_specialist), db: Session = Depends(get_db)):
    word = db.query(CustomWord).filter(CustomWord.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    db.delete(word)
    db.commit()
    return {"message": "Word deleted"}


@router.get("/quizzes")
def list_quizzes(db: Session = Depends(get_db)):
    quizzes = db.query(CustomQuiz).order_by(CustomQuiz.created_at.desc()).all()
    return [
        {
            "id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "options": json.loads(q.options),
            "created_by": q.created_by,
            "created_at": q.created_at.isoformat() if q.created_at else None,
        }
        for q in quizzes
    ]


@router.post("/quizzes")
def create_quiz(data: QuizCreate, user: UserModel = Depends(_require_specialist), db: Session = Depends(get_db)):
    correct_count = sum(1 for o in data.options if o.correct)
    if correct_count != 1:
        raise HTTPException(status_code=400, detail="Exactly one option must be correct")
    quiz = CustomQuiz(
        question_text=data.question_text,
        question_type=data.question_type,
        options=json.dumps([o.model_dump() for o in data.options]),
        created_by=user.id,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return {
        "id": quiz.id,
        "question_text": quiz.question_text,
        "question_type": quiz.question_type,
        "options": json.loads(quiz.options),
    }


@router.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: int, user: UserModel = Depends(_require_specialist), db: Session = Depends(get_db)):
    quiz = db.query(CustomQuiz).filter(CustomQuiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted"}
