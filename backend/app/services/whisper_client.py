"""
whisper_client.py
──────────────────
a placer dans ton backend FastAPI (ex: backend/services/whisper_client.py).
Gere la communication avec le Space HuggingFace Whisper.
"""

import os
import logging
import asyncio
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# URL du Space HuggingFace (a definir dans .env)
WHISPER_SPACE_URL = os.getenv(
    "WHISPER_SPACE_URL",
    "https://manarElhouda-whisper-tunisian-asr.hf.space"
)

# Timeout genereux (CPU cold start + transcription)
TIMEOUT_SECONDS = 120.0

# Nombre de retries sur cold start (le Space peut prendre ~30s a se reveiller)
MAX_RETRIES = 3
RETRY_DELAY = 10.0


class WhisperClient:
    """
    Client HTTP asynchrone vers l'API Whisper du Space HuggingFace.
    Gere le cold start, les retries, et le format de reponse.
    """

    def __init__(self, base_url: str = WHISPER_SPACE_URL):
        self.base_url = base_url.rstrip("/")

    async def transcribe(
        self,
        audio_bytes: bytes,
        filename: str = "audio.wav",
        content_type: str = "audio/wav"
    ) -> str:
        """
        Envoie l'audio au Space et retourne le texte transcrit.

        Args:
            audio_bytes  : contenu brut du fichier audio
            filename     : nom du fichier (aide a detecter le format)
            content_type : MIME type

        Returns:
            str : texte transcrit en arabe

        Raises:
            RuntimeError : si la transcription echoue apres tous les retries
        """
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
                    response = await client.post(
                        f"{self.base_url}/transcribe",
                        files={
                            "audio": (filename, audio_bytes, content_type)
                        }
                    )

                if response.status_code == 200:
                    data = response.json()
                    logger.info(
                        f"Transcription OK ({data.get('duration_seconds', '?')}s audio, "
                        f"{data.get('processing_time_seconds', '?')}s traitement)"
                    )
                    return data["text"]

                elif response.status_code == 503:
                    # Space en cours de demarrage (cold start)
                    logger.warning(
                        f"Space en demarrage (attempt {attempt}/{MAX_RETRIES}), "
                        f"retry dans {RETRY_DELAY}s..."
                    )
                    if attempt < MAX_RETRIES:
                        await asyncio.sleep(RETRY_DELAY)
                    continue

                else:
                    error_detail = response.json().get("detail", response.text)
                    raise RuntimeError(
                        f"Erreur Whisper Space [{response.status_code}] : {error_detail}"
                    )

            except httpx.TimeoutException:
                logger.warning(f"Timeout (attempt {attempt}/{MAX_RETRIES})")
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_DELAY)
                else:
                    raise RuntimeError("Timeout — le Space Whisper ne repond pas.")

            except httpx.ConnectError as e:
                raise RuntimeError(f"Impossible de joindre le Space Whisper : {e}")

        raise RuntimeError("Transcription echouee apres tous les retries.")

    async def health_check(self) -> dict:
        """Verifie que le Space est actif."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{self.base_url}/health")
            return response.json()

    async def ping(self) -> bool:
        """Ping leger pour maintenir le Space eveille (evite le cold start)."""
        try:
            result = await self.health_check()
            return result.get("status") == "ok"
        except Exception:
            return False


# Instance singleton a injecter dans FastAPI
whisper_client = WhisperClient()


# ── Integration dans ton router FastAPI ───────────────────────────────────────
# Exemple d'utilisation dans ton main.py ou router :
#
# from fastapi import APIRouter, UploadFile, File
# from services.whisper_client import whisper_client
#
# router = APIRouter()
#
# @router.post("/api/transcribe")
# async def transcribe_audio(audio: UploadFile = File(...)):
#     audio_bytes = await audio.read()
#     text = await whisper_client.transcribe(
#         audio_bytes=audio_bytes,
#         filename=audio.filename,
#         content_type=audio.content_type
#     )
#     return {"transcription": text}
