from fastapi import APIRouter

from .auth import router as auth_router
from .children import router as children_router
from .health import router as health_router
from .lessons import router as lessons_router
from .progress import router as progress_router

api_router = APIRouter(prefix="/api")

api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(children_router, prefix="/children", tags=["children"])
api_router.include_router(progress_router, prefix="/progress", tags=["progress"])
api_router.include_router(lessons_router, prefix="/lessons", tags=["lessons"])

__all__ = ["api_router"]
