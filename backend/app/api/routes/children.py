from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database.connection import get_db
from app.models.child import ChildModel
from app.models.user import UserModel
from app.schemas import ChildCreate, ChildOut, ChildUpdate

router = APIRouter()


@router.get("", response_model=list[ChildOut])
def list_children(user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(ChildModel).filter(ChildModel.parent_id == user.id).all()


@router.post("", response_model=ChildOut)
def create_child(data: ChildCreate, user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    child = ChildModel(parent_id=user.id, **data.model_dump())
    db.add(child)
    db.commit()
    db.refresh(child)
    return child


@router.get("/{child_id}", response_model=ChildOut)
def get_child(child_id: int, user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    child = db.query(ChildModel).filter(ChildModel.id == child_id, ChildModel.parent_id == user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    return child


@router.put("/{child_id}", response_model=ChildOut)
def update_child(child_id: int, data: ChildUpdate, user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    child = db.query(ChildModel).filter(ChildModel.id == child_id, ChildModel.parent_id == user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(child, key, value)

    db.commit()
    db.refresh(child)
    return child


@router.delete("/{child_id}")
def delete_child(child_id: int, user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    child = db.query(ChildModel).filter(ChildModel.id == child_id, ChildModel.parent_id == user.id).first()
    if not child:
        raise HTTPException(status_code=404, detail="Child not found")
    db.delete(child)
    db.commit()
    return {"message": "Child deleted"}
