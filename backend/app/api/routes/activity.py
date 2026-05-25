import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database.connection import get_db
from app.models.child import ChildModel
from app.models.pronunciation import PronunciationAttempt
from app.models.quiz import QuizSession
from app.models.user import UserModel
from app.schemas import (
    ChildActivitySummary,
    PronunciationCreate,
    PronunciationOut,
    QuizCreate,
    QuizOut,
)

router = APIRouter()


def _verify_child_access(child_id: int, user: UserModel, db: Session) -> ChildModel:
    child = db.query(ChildModel).filter(ChildModel.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if user.role == "parent" and child.parent_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return child


@router.post("/pronunciation", response_model=PronunciationOut)
def record_pronunciation(
    data: PronunciationCreate,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_child_access(data.child_id, user, db)
    entry = PronunciationAttempt(
        child_id=data.child_id,
        word_id=data.word_id,
        word_ar=data.word_ar,
        emoji=data.emoji,
        passed=data.passed,
        overall_score=data.overall_score,
        phoneme_scores=json.dumps([s.model_dump() for s in data.phoneme_scores]),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.post("/quiz", response_model=QuizOut)
def record_quiz(
    data: QuizCreate,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_child_access(data.child_id, user, db)
    entry = QuizSession(
        child_id=data.child_id,
        total_questions=data.total_questions,
        correct=data.correct,
        avg_t=data.avg_t,
        avg_i=data.avg_i,
        avg_f=data.avg_f,
        dominant_action=data.dominant_action,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{child_id}", response_model=ChildActivitySummary)
def get_activity(
    child_id: int,
    user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _verify_child_access(child_id, user, db)

    pronunciations = (
        db.query(PronunciationAttempt)
        .filter(PronunciationAttempt.child_id == child_id)
        .order_by(PronunciationAttempt.created_at.desc())
        .limit(200)
        .all()
    )

    quizzes = (
        db.query(QuizSession)
        .filter(QuizSession.child_id == child_id)
        .order_by(QuizSession.created_at.desc())
        .limit(50)
        .all()
    )

    total_stars = sum(1 for p in pronunciations if p.passed)

    return ChildActivitySummary(
        pronunciations=pronunciations,
        quizzes=quizzes,
        total_stars=total_stars,
    )
