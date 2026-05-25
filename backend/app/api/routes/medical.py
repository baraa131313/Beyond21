"""Medical inference endpoints for DS brain anomaly detection."""

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas import MedicalPrediction, MedicalHealthResponse

router = APIRouter()


@router.get("/health", response_model=MedicalHealthResponse)
async def medical_health() -> MedicalHealthResponse:
    """Health endpoint for the medical inference service."""
    return MedicalHealthResponse(status="ok")


@router.post("/predict", response_model=MedicalPrediction)
async def predict_medical(image: UploadFile = File(...)) -> MedicalPrediction:
    """Analyze an uploaded MRI image and return DS anomaly predictions."""
    from app.services.brain_pipeline import brain_pipeline

    contents = await image.read()
    try:
        result = brain_pipeline.run_full_pipeline(contents)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Medical inference failed: {exc}")

    return MedicalPrediction(
        score=result.score,
        label=result.label,
        anomaly_map=result.anomaly_map,
        reconstruction=result.reconstruction,
        gradcam=result.gradcam,
    )
