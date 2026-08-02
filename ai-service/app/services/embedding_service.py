"""
embedding_service.py

Generates vector embeddings using Google's embedding-001 model via the
google-generativeai SDK.
"""
import os
from typing import List
import google.generativeai as genai

EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")
EMBEDDING_DIMENSION = 768  # gemini-embedding-001 output dimension


class EmbeddingService:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            genai.configure(api_key=api_key)
        self._configured = bool(api_key)

    def embed_text(self, text: str) -> List[float]:
        """Embed a single string and return its vector."""
        if not self._configured:
            raise RuntimeError("GEMINI_API_KEY is not set — cannot generate embeddings.")
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_document",
            output_dimensionality=EMBEDDING_DIMENSION,
        )
        return result["embedding"]

    def embed_query(self, text: str) -> List[float]:
        """Embed a user query string (different task_type for better retrieval)."""
        if not self._configured:
            raise RuntimeError("GEMINI_API_KEY is not set — cannot generate embeddings.")
        result = genai.embed_content(
            model=EMBEDDING_MODEL,
            content=text,
            task_type="retrieval_query",
            output_dimensionality=EMBEDDING_DIMENSION,
        )
        return result["embedding"]

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embed a batch of strings (sequential — Gemini SDK doesn't support true batch yet)."""
        return [self.embed_text(t) for t in texts]


embedding_service = EmbeddingService()
