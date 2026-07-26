from fastapi import FastAPI
from contextlib import asynccontextmanager
from dotenv import load_dotenv
import logging

load_dotenv()

from app.api.health import router as health_router
from app.api.chat import router as chat_router
from app.api.index import router as index_router
from app.services.qdrant_service import qdrant_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure Qdrant collection exists if configured
    if qdrant_service.is_configured:
        try:
            qdrant_service.ensure_collection()
            logger.info("Qdrant collection ready.")
        except Exception as e:
            logger.warning(f"Could not initialize Qdrant collection on startup: {e}")
    else:
        logger.warning(
            "QDRANT_URL not set. Vector indexing and RAG retrieval will be unavailable."
        )
    yield
    # Shutdown (nothing to clean up for now)


app = FastAPI(
    title="Microcosm AI Service",
    version="0.2.0",
    description="Python FastAPI service for Microcosm AI, RAG, and embeddings.",
    lifespan=lifespan,
)

app.include_router(health_router, prefix="/internal/v1/health", tags=["health"])
app.include_router(chat_router, prefix="/internal/v1", tags=["chat"])
app.include_router(index_router, prefix="/internal/v1/index", tags=["index"])
