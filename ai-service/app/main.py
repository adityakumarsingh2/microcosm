from fastapi import FastAPI

from app.api.health import router as health_router

app = FastAPI(
    title="Microcosm AI Service",
    version="0.1.0",
    description="Python FastAPI service for Microcosm AI, RAG, and embeddings.",
)

app.include_router(health_router, prefix="/internal/v1/health", tags=["health"])
