from fastapi import APIRouter

from .auth import router as auth_router
from .children import router as children_router
from .health import router as health_router
from .lessons import router as lessons_router
from .medical import router as medical_router
from .progress import router as progress_router
from .adaptive import router as adaptive_router
from .activity import router as activity_router
from .specialist import router as specialist_router
from .content import router as content_router

api_router = APIRouter(prefix="/api")

api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(children_router, prefix="/children", tags=["children"])
api_router.include_router(progress_router, prefix="/progress", tags=["progress"])
api_router.include_router(lessons_router, prefix="/lessons", tags=["lessons"])
api_router.include_router(medical_router, prefix="/medical", tags=["medical"])
api_router.include_router(adaptive_router, prefix="/adaptive", tags=["adaptive"])
api_router.include_router(activity_router, prefix="/activity", tags=["activity"])
api_router.include_router(specialist_router, prefix="/specialist", tags=["specialist"])
api_router.include_router(content_router, prefix="/content", tags=["content"])

__all__ = ["api_router"]