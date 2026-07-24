from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.core.auth import verify_internal_token
from app.services.gemini import gemini_service

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(verify_internal_token)])
async def chat_endpoint(request: ChatRequest):
    ai_response = await gemini_service.generate_response(request.prompt)
    return ChatResponse(response=ai_response)
