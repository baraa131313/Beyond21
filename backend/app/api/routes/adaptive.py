"""Adaptive learning prediction endpoint."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.adaptive_service import adaptive_engine

router = APIRouter()


class StudentState(BaseModel):
    response_time: float
    error_rate: float
    hesitation_count: int
    focus_ratio: float
    frustration_score: float
    movement_intensity: float
    question_id: int = 0
    is_answering: bool = False


@router.post("/predict")
async def predict(state: StudentState):
    raw = {
        "response_time": state.response_time,
        "error_rate": state.error_rate,
        "hesitation_count": state.hesitation_count,
        "focus_ratio": state.focus_ratio,
        "frustration_score": state.frustration_score,
        "movement_intensity": state.movement_intensity,
    }
    try:
        result = adaptive_engine.predict(raw)
        result["question_id"] = state.question_id
        result["is_answering"] = state.is_answering
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
