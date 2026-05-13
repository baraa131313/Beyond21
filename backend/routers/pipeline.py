"""FastAPI router for Speech-to-Vision pipeline."""
import asyncio
import logging
from fastapi import APIRouter, HTTPException
from models.pipeline import (
    PipelineRequest,
    PipelineResponse,
    FeedbackRequest,
    FeedbackResponse,
    TranslationResult,
    PromptResult,
)
from models.profile import UserProfile
from services.groq_service import translate_to_english, build_image_prompt
from services.profile_service import profile_service
from services.image_service import generate_image
import time


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.post("/process", response_model=PipelineResponse)
async def process_pipeline(request: PipelineRequest):
    """
    Process transcribed Tunisian Arabic through the full pipeline:
    1. Translate to English via Groq
    2. Build optimized SDXL prompt
    3. Return results with profile context
    
    Args:
        request: PipelineRequest with transcription and child_id
        
    Returns:
        PipelineResponse with translations and image prompt
    """
    try:
        # Load child profile
        profile = profile_service.get_profile(request.child_id)
        logger.info(f"Processing for child: {profile.name}")
        
        # Build profile context
        profile_ctx = profile_service.build_system_prompt_context(profile)
        style_suffix = profile_service.get_sdxl_style_suffix(profile)
        blacklist_neg = profile_service.get_negative_prompt_additions(profile)
        
        # Translation step (run in thread to avoid blocking)
        translation_result = await asyncio.to_thread(
            translate_to_english,
            request.transcription,
            profile_ctx
        )
        
        # Image prompt step (run in thread to avoid blocking)
        prompt_result = await asyncio.to_thread(
            build_image_prompt,
            translation_result["english"],
            profile_ctx,
            style_suffix,
            blacklist_neg
        )
        
        # Build response
        response = PipelineResponse(
            transcription=request.transcription,
            translation=TranslationResult(
                english=translation_result["english"],
                french=translation_result["french"],
                latency=translation_result["latency"]
            ),
            image_prompt=PromptResult(
                prompt=prompt_result["prompt"],
                negative_prompt=prompt_result["negative_prompt"],
                latency=prompt_result["latency"]
            ),
            profile_name=profile.name,
            cognitive_level=profile.cognitive_level,
            status="success"
        )
        
        logger.info(f"Pipeline completed for child {profile.name}")
        return response
        
    except Exception as e:
        logger.error(f"Pipeline error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    """
    Submit user feedback on generated content.
    Updates profile based on feedback (positive keywords or blacklist).
    
    Args:
        request: FeedbackRequest with feedback data
        
    Returns:
        FeedbackResponse indicating success
    """
    try:
        profile = profile_service.get_profile(request.child_id)
        
        # Save interaction
        interaction = {
            "transcription": request.transcription,
            "translation": request.translation,
            "prompt": request.prompt,
            "feedback": request.feedback,
            "feedback_note": request.feedback_note or "",
        }
        profile_service.save_interaction(request.child_id, interaction)
        
        # Update profile based on feedback
        first_word = request.translation.split()[0] if request.translation else ""
        profile_updated = profile_service.update_profile_from_feedback(
            request.child_id,
            first_word,
            request.feedback,
            request.translation.split() if request.translation else []
        )
        
        logger.info(f"Feedback processed for child {request.child_id}: {request.feedback}")
        
        return FeedbackResponse(
            status="ok",
            profile_updated=profile_updated,
            message=f"Feedback recorded: {request.feedback}"
        )
        
    except Exception as e:
        logger.error(f"Feedback error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Feedback error: {str(e)}")


@router.get("/profile/{child_id}", response_model=UserProfile)
async def get_profile(child_id: str):
    """
    Get complete child profile.
    
    Args:
        child_id: Child identifier
        
    Returns:
        UserProfile instance
    """
    try:
        profile = profile_service.get_profile(child_id)
        logger.info(f"Profile retrieved: {child_id}")
        return profile
    except Exception as e:
        logger.error(f"Error retrieving profile: {str(e)}")
        raise HTTPException(status_code=404, detail=f"Profile not found: {child_id}")


@router.put("/profile/{child_id}", response_model=UserProfile)
async def update_profile(child_id: str, updates: dict):
    """
    Update child profile.
    
    Args:
        child_id: Child identifier
        updates: Dict with fields to update (age, cognitive_level, interests, style_preference, etc.)
        
    Returns:
        Updated UserProfile instance
    """
    try:
        profile = profile_service.get_profile(child_id)
        
        # Update allowed fields
        allowed_fields = {
            "name", "age", "cognitive_level", "preferred_colors",
            "interests", "style_preference", "blacklist", "positive_keywords"
        }
        
        for field, value in updates.items():
            if field in allowed_fields:
                setattr(profile, field, value)
        
        profile_service.save_profile(profile)
        logger.info(f"Profile updated: {child_id}")
        return profile
        
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating profile: {str(e)}")
@router.post("/generate-image", response_model=ImageGenerationResponse)
async def generate_image_endpoint(req: ImageGenerationRequest):
    """
    Genere une image depuis un prompt enrichi (produit par /pipeline/process).
    Appelle Pollinations.ai (FLUX.1) — gratuit, sans cle API.
    """
    try:
        result = await generate_image(
            prompt=req.prompt,
            negative_prompt=req.negative_prompt,
            width=req.width,
            height=req.height,
            seed=req.seed,
            child_id=req.child_id,
        )
        return ImageGenerationResponse(
            image_b64=result["image_b64"],
            image_url=result["image_url"],
            prompt_used=req.prompt,
            latency=result["latency"],
            cached=result["cached"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
 
 @router.post("/full")
async def full_pipeline(request: PipelineRequest):
    """
    Pipeline complet en un seul appel :
    Transcription → Traduction (Groq) → Prompt Engineering (Groq) → Image (Pollinations)
    
    C'est cet endpoint qu'appelle learn.picture.tsx via imageService.ts.
    """
    t_start = time.time()
 
    try:
        # 1. Charger le profil enfant
        profile      = profile_service.get_profile(request.child_id)
        profile_ctx  = profile_service.build_system_prompt_context(profile)
        style_suffix = profile_service.get_sdxl_style_suffix(profile)
        blacklist_neg = profile_service.get_negative_prompt_additions(profile)
 
        logger.info(f"Full pipeline pour : {profile.name} | texte : {request.transcription[:40]}")
 
        # 2. Traduction TN → FR → EN (Groq) — dans un thread (appel synchrone)
        translation = await asyncio.to_thread(
            translate_to_english,
            request.transcription,
            profile_ctx
        )
 
        # 3. Prompt engineering (Groq) — dans un thread
        prompt_result = await asyncio.to_thread(
            build_image_prompt,
            translation["english"],
            profile_ctx,
            style_suffix,
            blacklist_neg
        )
 
        # 4. Generation image (Pollinations) — deja async
        image_result = await generate_image(
            prompt=prompt_result["prompt"],
            negative_prompt=prompt_result["negative_prompt"],
            child_id=request.child_id,
        )
 
        latency_total = round(time.time() - t_start, 2)
        logger.info(f"Pipeline complet en {latency_total}s pour {profile.name}")
 
        return {
            "transcription":      request.transcription,
            "french":             translation["french"],
            "english":            translation["english"],
            "prompt":             prompt_result["prompt"],
            "negative_prompt":    prompt_result["negative_prompt"],
            "image_b64":          image_result["image_b64"],
            "image_url":          image_result["image_url"],
            "latency_translation": translation["latency"],
            "latency_prompt":     prompt_result["latency"],
            "latency_image":      image_result["latency"],
            "latency_total":      latency_total,
            "status":             "success",
        }
 
    except Exception as e:
        logger.error(f"Full pipeline error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")
 


























