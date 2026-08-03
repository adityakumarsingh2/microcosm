import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import verify_internal_token
from app.services.gemini import gemini_service

logger = logging.getLogger(__name__)
router = APIRouter()

class SynthesisRequest(BaseModel):
    text: str

@router.post("/analyze/flashcards", dependencies=[Depends(verify_internal_token)])
async def generate_flashcards_endpoint(request: SynthesisRequest):
    """
    Synthesize study flashcards from page note contents.
    """
    try:
        flashcards = await gemini_service.generate_flashcards(request.text)
        return {"flashcards": flashcards}
    except Exception as e:
        logger.error(f"Failed to generate study flashcards: {e}")
        raise HTTPException(status_code=500, detail=str(e))
