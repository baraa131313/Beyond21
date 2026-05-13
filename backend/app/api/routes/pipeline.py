"""FastAPI router for Speech-to-Vision pipeline."""
import asyncio
import logging
from fastapi import APIRouter, HTTPException
from app.models.pipeline import (
    PipelineRequest,
    PipelineResponse,
    FeedbackRequest,
    FeedbackResponse,
    TranslationResult,
    PromptResult,
    FullPipelineResponse,
)
from app.models.profile import UserProfile
from app.services.groq_service import translate_to_english, build_image_prompt
from app.services.profile_service import profile_service
from app.services.image_service import generate_image

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
        logger.info("Processing for child: %s", profile.name.encode('ascii', 'replace').decode())

        
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
        
        logger.info("Pipeline completed")
        return response
        
    except Exception as e:
        logger.error("Pipeline error: %s", str(e).encode('ascii', 'replace').decode())

        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


@router.post("/full", response_model=FullPipelineResponse)
async def full_pipeline(request: PipelineRequest):
    """
    Complete pipeline with image generation:
    1. Translate to English via Groq
    2. Build optimized SDXL prompt
    3. Generate image via Pollinations
    4. Return all results with base64 image
    
    Args:
        request: PipelineRequest with transcription and child_id
        
    Returns:
        FullPipelineResponse with translations, prompt, and image
    """
    import time as time_module
    t0 = time_module.time()
    
    try:
        # Load child profile
        profile = profile_service.get_profile(request.child_id)
        logger.info(f"Processing for child: {profile.name}")
        
        # Build profile context
        profile_ctx = profile_service.build_system_prompt_context(profile)
        style_suffix = profile_service.get_sdxl_style_suffix(profile)
        blacklist_neg = profile_service.get_negative_prompt_additions(profile)
        
        # Translation step
        t_trans_start = time_module.time()
        translation_result = await asyncio.to_thread(
            translate_to_english,
            request.transcription,
            profile_ctx
        )
        latency_translation = time_module.time() - t_trans_start
        
        # Image prompt step
        t_prompt_start = time_module.time()
        prompt_result = await asyncio.to_thread(
            build_image_prompt,
            translation_result["english"],
            profile_ctx,
            style_suffix,
            blacklist_neg
        )
        latency_prompt = time_module.time() - t_prompt_start
        
        # Image generation step
        t_image_start = time_module.time()
        image_result = await generate_image(
            prompt=prompt_result["prompt"],
            negative_prompt=prompt_result["negative_prompt"],
            child_id=request.child_id
        )
        latency_image = image_result.get("latency", time_module.time() - t_image_start)
        
        latency_total = time_module.time() - t0
        
        # Build response
        response = FullPipelineResponse(
            transcription=request.transcription,
            french=translation_result["french"],
            english=translation_result["english"],
            prompt=prompt_result["prompt"],
            negative_prompt=prompt_result["negative_prompt"],
            image_b64=image_result["image_b64"],
            image_url=image_result["image_url"],
            latency_translation=latency_translation,
            latency_prompt=latency_prompt,
            latency_image=latency_image,
            latency_total=latency_total,
            status="success"
        )
        
        logger.info(f"Full pipeline completed for child {profile.name} (total: {latency_total:.2f}s)")
        return response
        
    except Exception as e:
        logger.error("Full pipeline error: %s", str(e).encode('ascii', 'replace').decode())

        raise HTTPException(status_code=500, detail=f"Pipeline error: {str(e)}")


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    try:
        # Sauvegarder l'interaction
        interaction = {
            "transcription": request.transcription,
            "translation": request.translation,
            "prompt": request.prompt,
            "quality_score": request.quality_score,
            "clarity_score": request.clarity_score,
            "style_score": request.style_score,
            "feedback_note": request.feedback_note or "",
        }
        profile_service.save_interaction(request.child_id, interaction)

        # Mettre à jour le profil selon les 3 scores
        profile_updated = profile_service.update_profile_from_feedback(
            child_id=request.child_id,
            translation=request.translation,
            quality_score=request.quality_score,
            clarity_score=request.clarity_score,
            style_score=request.style_score,
        )

        return FeedbackResponse(
            status="ok",
            profile_updated=profile_updated,
            message=f"Feedback enregistré (Q:{request.quality_score} C:{request.clarity_score} S:{request.style_score})"
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
