from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database.connection import get_db
from app.models.child import ChildModel
from app.models.pronunciation import PronunciationAttempt
from app.models.quiz import QuizSession
from app.models.user import UserModel

router = APIRouter()


def _require_specialist(user: UserModel = Depends(get_current_user)):
    if user.role != "specialist":
        raise HTTPException(status_code=403, detail="Specialist access required")
    return user


@router.get("/children")
def list_all_children(user: UserModel = Depends(_require_specialist), db: Session = Depends(get_db)):
    children = db.query(ChildModel).all()
    result = []
    for child in children:
        parent = db.query(UserModel).filter(UserModel.id == child.parent_id).first()
        pron_count = db.query(func.count(PronunciationAttempt.id)).filter(PronunciationAttempt.child_id == child.id).scalar()
        quiz_count = db.query(func.count(QuizSession.id)).filter(QuizSession.child_id == child.id).scalar()
        stars = db.query(func.count(PronunciationAttempt.id)).filter(
            PronunciationAttempt.child_id == child.id,
            PronunciationAttempt.passed == True,
        ).scalar()
        result.append({
            "id": child.id,
            "name": child.name,
            "age": child.age,
            "avatar": child.avatar,
            "parent_name": parent.full_name if parent else "Unknown",
            "parent_email": parent.email if parent else "",
            "pronunciation_attempts": pron_count,
            "quiz_sessions": quiz_count,
            "total_stars": stars,
            "created_at": child.created_at.isoformat() if child.created_at else None,
        })
    return result


@router.get("/stats")
def get_platform_stats(user: UserModel = Depends(_require_specialist), db: Session = Depends(get_db)):
    total_children = db.query(func.count(ChildModel.id)).scalar()
    total_parents = db.query(func.count(UserModel.id)).filter(UserModel.role == "parent").scalar()
    total_pronunciations = db.query(func.count(PronunciationAttempt.id)).scalar()
    total_quizzes = db.query(func.count(QuizSession.id)).scalar()
    total_stars = db.query(func.count(PronunciationAttempt.id)).filter(PronunciationAttempt.passed == True).scalar()
    return {
        "total_children": total_children,
        "total_parents": total_parents,
        "total_pronunciations": total_pronunciations,
        "total_quizzes": total_quizzes,
        "total_stars": total_stars,
    }
