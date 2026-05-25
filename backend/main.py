"""Main FastAPI application."""
import os
import sys

os.environ["PYTHONIOENCODING"] = "utf-8"

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv()

import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from app.api.routes import api_router
from app.api.routes.pipeline import router as pipeline_router
from app.config import settings
from app.database.connection import create_all_tables
from app.middleware import setup_middleware
from app.services.whisper_client import whisper_client

logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Create and configure FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        docs_url="/api/docs" if settings.enable_docs else None,
        redoc_url="/api/redoc" if settings.enable_docs else None,
        openapi_url="/api/openapi.json" if settings.enable_docs else None,
    )

    # Setup middleware
    setup_middleware(app)

    # Include API routes
    app.include_router(api_router)
    
    # Include pipeline router
    app.include_router(pipeline_router)

    # (Removed Pollinations API key startup check)

    # ── Whisper transcription route ──────────────────────────────────────────
    @app.post("/api/transcribe")
    async def transcribe(audio: UploadFile = File(...)):
        """Transcrit un fichier audio en texte arabe (dialecte tunisien)."""
        audio_bytes = await audio.read()
        text = await whisper_client.transcribe(
            audio_bytes=audio_bytes,
            filename=audio.filename,
            content_type=audio.content_type,
        )
        return {"transcription": text}

    # ── Whisper health check ─────────────────────────────────────────────────
    @app.get("/api/whisper/health")
    async def whisper_health():
        """Verifie que le Space Whisper est actif."""
        result = await whisper_client.health_check()
        return result

    # ── Startup ──────────────────────────────────────────────────────────────
    @app.on_event("startup")
    def startup_event() -> None:
        """Run on application startup."""
        create_all_tables()

    # ── Root ─────────────────────────────────────────────────────────────────
    @app.get("/")
    async def root() -> dict[str, str]:
        """Root endpoint."""
        return {
            "message": "Interactive Learning Platform API",
            "version": settings.app_version,
            "docs": "/api/docs" if settings.enable_docs else "disabled",
        }

    # ── Error handlers ────────────────────────────────────────────────────────
    @app.exception_handler(Exception)
    async def generic_exception_handler(request, exc: Exception) -> JSONResponse:
        """Handle generic exceptions."""
        return JSONResponse(
            status_code=500,
            content={
                "error": "Internal Server Error",
                "message": str(exc) if settings.debug else "An error occurred",
            },
        )

    return app


app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)