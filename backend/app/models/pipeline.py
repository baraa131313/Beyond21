"""Pydantic models for pipeline requests and responses."""
from pydantic import BaseModel
from typing import Optional


class PipelineRequest(BaseModel):
    """Request from frontend after Whisper transcription."""
    transcription: str  # Tunisian Arabic text from Whisper
    child_id: str = "child_001"  # Child profile identifier


class TranslationResult(BaseModel):
    """Translation result from Groq."""
    english: str
    french: str
    latency: float


class PromptResult(BaseModel):
    """Image prompt result from Groq."""
    prompt: str
    negative_prompt: str
    latency: float


class PipelineResponse(BaseModel):
    """Response returned to frontend."""
    transcription: str
    translation: TranslationResult
    image_prompt: PromptResult
    profile_name: str
    cognitive_level: str
    status: str = "success"


class FeedbackRequest(BaseModel):
    """User feedback on generated content — 3 visual quality dimensions."""
    child_id: str
    transcription: str
    translation: str
    prompt: str
    quality_score: int      # 1=non / 2=moyen / 3=oui
    clarity_score: int      # 1=complexe / 3=claire
    style_score: int        # 1=pas adapte / 2=bien / 3=parfait
    feedback_note: Optional[str] = ""

class FeedbackResponse(BaseModel):
    """Response to feedback submission."""
    status: str
    profile_updated: bool
    message: Optional[str] = None


class FullPipelineResponse(BaseModel):
    """Complete response with image generation (for frontend)."""
    transcription: str
    french: str
    english: str
    prompt: str
    negative_prompt: str
    image_b64: str
    image_url: str
    latency_translation: float
    latency_prompt: float
    latency_image: float
    latency_total: float
    status: str = "success"
