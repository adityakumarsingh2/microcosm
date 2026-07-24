from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()
from app.api.health import router as health_router
from app.api.chat import router as chat_router

app = FastAPI(
    title="Microcosm AI Service",
    version="0.1.0",
    description="Python FastAPI service for Microcosm AI, RAG, and embeddings.",
)

app.include_router(health_router, prefix="/internal/v1/health", tags=["health"])
app.include_router(chat_router, prefix="/internal/v1", tags=["chat"])
