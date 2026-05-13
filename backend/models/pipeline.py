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
    child_id: str
    transcription: str
    translation: str
    prompt: str
    # Remplacement du feedback global par 3 scores
    quality_score: int    # 1=non / 2=moyen / 3=oui      → "Tu as aime ?"
    clarity_score: int    # 1=incomprehensible / 2=complexe / 3=claire → "Tu comprends ?"
    style_score: int      # 1=pas adapte / 2=bien / 3=parfait  → "C'est beau ?"
    feedback_note: str = ""


class FeedbackResponse(BaseModel):
    """Response to feedback submission."""
    status: str
    profile_updated: bool
    message: Optional[str] = None

class ImageGenerationRequest(BaseModel):
    """Reçu depuis le frontend pour generer une image."""
    prompt: str                        # prompt enrichi produit par Groq
    negative_prompt: str = ""          # blacklist profil
    child_id: str = "child_001"
    width: int = 1024
    height: int = 1024
    seed: Optional[int] = None
 
class ImageGenerationResponse(BaseModel):
    """Retourne au frontend."""
    image_b64: str                     # image PNG encodee base64
    image_url: str                     # URL Pollinations (debug)
    prompt_used: str                   # prompt complet envoye
    latency: float
    cached: bool
    status: str = "success"
 
class FullPipelineRequest(BaseModel):
    """Requête pipeline complet : transcription → image en un seul appel."""
    transcription: str                 # texte arabe tunisien depuis Whisper
    child_id: str = "child_001"
 
class FullPipelineResponse(BaseModel):
    """Reponse pipeline complet."""
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
