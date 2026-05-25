from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database.connection import get_db
from app.models.child import ChildModel
from app.models.progress import ProgressModel
from app.models.user import UserModel
from app.schemas import ChildProgressSummary, ProgressCreate, ProgressOut

router = APIRouter()


def _verify_child_access(child_id: int, user: UserModel, db: Session) -> ChildModel:
    child = db.query(ChildModel).filter(ChildModel.id == child_id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    if user.role == "parent" and child.parent_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return child


@router.post("", response_model=ProgressOut)
def record_progress(data: ProgressCreate, user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify_child_access(data.child_id, user, db)
    entry = ProgressModel(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{child_id}", response_model=ChildProgressSummary)
def get_progress(child_id: int, user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    _verify_child_access(child_id, user, db)

    entries = db.query(ProgressModel).filter(ProgressModel.child_id == child_id).order_by(ProgressModel.created_at.desc()).all()

    total_stars = sum(e.stars for e in entries)
    total_correct = sum(e.correct for e in entries)
    total_wrong = sum(e.wrong for e in entries)
    words = {e.word for e in entries if e.word}
    modules = list({e.module for e in entries})

    return ChildProgressSummary(
        total_stars=total_stars,
        total_correct=total_correct,
        total_wrong=total_wrong,
        words_practiced=len(words),
        modules_used=modules,
        recent=entries[:20],
    )
