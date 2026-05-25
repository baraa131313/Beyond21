"""Pydantic schemas for request/response validation (similar to Zod in frontend)."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    """Health check response schema."""

    status: str = Field(..., description="Health status")
    version: str = Field(..., description="Application version")
    environment: str = Field(..., description="Current environment")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class MedicalHealthResponse(BaseModel):
    """Health response for the medical inference service."""

    status: str = Field(..., description="Service health status")


class MedicalPrediction(BaseModel):
    """Response payload for medical prediction."""

    score: float = Field(..., description="Anomaly score")
    label: str = Field(..., description="DS detection label")
    anomaly_map: str = Field(..., description="Anomaly map as base64 PNG")
    reconstruction: str = Field(..., description="Reconstruction as base64 PNG")
    gradcam: str = Field(..., description="GradCAM visualization as base64 PNG")


class LessonBase(BaseModel):
    """Base lesson schema."""

    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    difficulty: str = Field("beginner", pattern="^(beginner|intermediate|advanced)$")
    type: str = Field("vocabulary", pattern="^(vocabulary|grammar|listening|speaking)$")


class LessonCreate(LessonBase):
    """Schema for creating a lesson."""

    pass


class LessonUpdate(BaseModel):
    """Schema for updating a lesson."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    difficulty: Optional[str] = Field(None, pattern="^(beginner|intermediate|advanced)$")
    type: Optional[str] = Field(None, pattern="^(vocabulary|grammar|listening|speaking)$")


class Lesson(LessonBase):
    """Complete lesson schema for responses."""

    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ErrorResponse(BaseModel):
    error: str
    message: str
    status_code: int


# --- Auth schemas ---

class UserRegister(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=1, max_length=255)
    role: str = Field("parent", pattern="^(parent|specialist)$")
    specialty: Optional[str] = Field(None, max_length=255)
    institution: Optional[str] = Field(None, max_length=255)


class UserLogin(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str = "parent"
    specialty: Optional[str] = None
    institution: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    token: str
    user: UserOut


# --- Child schemas ---

class ChildCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    age: Optional[int] = Field(None, ge=1, le=30)
    avatar: str = Field("🧒", max_length=50)
    pin: Optional[str] = Field(None, max_length=6)


class ChildUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    age: Optional[int] = Field(None, ge=1, le=30)
    avatar: Optional[str] = Field(None, max_length=50)
    pin: Optional[str] = Field(None, max_length=6)


class ChildOut(BaseModel):
    id: int
    name: str
    age: Optional[int]
    avatar: str
    parent_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Progress schemas ---

class ProgressCreate(BaseModel):
    child_id: int
    module: str = Field(..., max_length=50)
    word: Optional[str] = Field(None, max_length=255)
    score: Optional[float] = None
    correct: int = 0
    wrong: int = 0
    stars: int = 0


class ProgressOut(BaseModel):
    id: int
    child_id: int
    module: str
    word: Optional[str]
    score: Optional[float]
    correct: int
    wrong: int
    stars: int
    created_at: datetime

    class Config:
        from_attributes = True


class ChildProgressSummary(BaseModel):
    total_stars: int
    total_correct: int
    total_wrong: int
    words_practiced: int
    modules_used: list[str]
    recent: list[ProgressOut]


# --- Pronunciation schemas ---

class PhonemeScore(BaseModel):
    arabic: str
    stars: int

class PronunciationCreate(BaseModel):
    child_id: int
    word_id: str = Field(..., max_length=100)
    word_ar: str = Field(..., max_length=255)
    emoji: str = Field(..., max_length=50)
    passed: bool = False
    overall_score: float = 0
    phoneme_scores: list[PhonemeScore] = []

class PronunciationOut(BaseModel):
    id: int
    child_id: int
    word_id: str
    word_ar: str
    emoji: str
    passed: bool
    overall_score: float
    phoneme_scores: str
    created_at: datetime

    class Config:
        from_attributes = True


# --- Quiz schemas ---

class QuizCreate(BaseModel):
    child_id: int
    total_questions: int
    correct: int = 0
    avg_t: float = 0
    avg_i: float = 0
    avg_f: float = 0
    dominant_action: Optional[str] = None

class QuizOut(BaseModel):
    id: int
    child_id: int
    total_questions: int
    correct: int
    avg_t: float
    avg_i: float
    avg_f: float
    dominant_action: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# --- Activity summary ---

class ChildActivitySummary(BaseModel):
    pronunciations: list[PronunciationOut]
    quizzes: list[QuizOut]
    total_stars: int
