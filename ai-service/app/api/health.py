from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def health_check():
    return {
        "success": True,
        "data": {
            "service": "microcosm-ai-service",
            "status": "ok",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    }
