"""
rag_service.py

Orchestrates the full RAG pipeline:
  1. index_page  — chunk → embed → upsert into Qdrant
  2. retrieve_context — embed query → semantic search
  3. answer_with_rag  — retrieve + prompt Gemini with grounded context
"""
import logging
from typing import List, Dict, Any, Optional

from app.schemas.indexing import IndexPageRequest
from app.services.chunking_service import chunk_blocks
from app.services.embedding_service import embedding_service
from app.services.qdrant_service import qdrant_service

logger = logging.getLogger(__name__)


class RagService:

    # ------------------------------------------------------------------ #
    # Ingestion
    # ------------------------------------------------------------------ #

    def index_page(self, request: IndexPageRequest) -> Dict[str, Any]:
        """
        Full ingestion pipeline for one page.
        Returns {"status": "indexed"|"empty"|"error", "chunksIndexed": N}
        """
        try:
            chunks = chunk_blocks(request.blocks, page_title=request.pageTitle)

            if not chunks:
                return {"status": "empty", "chunksIndexed": 0}

            texts = [c.text for c in chunks]
            vectors = embedding_service.embed_batch(texts)

            # Delete old vectors for this page before upserting new ones
            qdrant_service.delete_page_chunks(request.pageId)

            qdrant_service.upsert_chunks(
                chunks=chunks,
                vectors=vectors,
                workspace_id=request.workspaceId,
                notebook_id=request.notebookId,
                section_id=request.sectionId,
                page_id=request.pageId,
                page_title=request.pageTitle,
            )

            return {"status": "indexed", "chunksIndexed": len(chunks)}

        except Exception as e:
            logger.error(f"Failed to index page {request.pageId}: {e}")
            return {"status": "error", "chunksIndexed": 0, "error": str(e)}

    # ------------------------------------------------------------------ #
    # Retrieval
    # ------------------------------------------------------------------ #

    def retrieve_context(
        self,
        query: str,
        workspace_id: str,
        top_k: int = 5,
        notebook_id: Optional[str] = None,
        page_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Embed the query and return the top matching chunks from Qdrant."""
        query_vector = embedding_service.embed_query(query)
        return qdrant_service.search(
            query_vector=query_vector,
            workspace_id=workspace_id,
            top_k=top_k,
            notebook_id=notebook_id,
            page_id=page_id,
        )

    # ------------------------------------------------------------------ #
    # Prompt building
    # ------------------------------------------------------------------ #

    def build_grounded_prompt(
        self, question: str, context_chunks: List[Dict[str, Any]]
    ) -> str:
        """
        Build a structured prompt that instructs Gemini to answer from the
        provided context chunks and to cite sources.
        """
        context_blocks = []
        for i, chunk in enumerate(context_chunks, 1):
            context_blocks.append(
                f"[Source {i}: {chunk['pageTitle']}]\n{chunk['text']}"
            )

        context_text = "\n\n---\n\n".join(context_blocks)

        prompt = f"""You are Microcosm AI, a personal knowledge assistant.
Your user has a second-brain note-taking system called Microcosm.
You must answer the user's question using ONLY the provided context from their notes.
If the context does not contain enough information to answer fully, say so honestly.
Always cite the source page title(s) when you use information from the context.

--- USER NOTES CONTEXT ---
{context_text}
--- END CONTEXT ---

User question: {question}

Provide a clear, concise answer based on the context above. Mention the source page title(s) inline."""

        return prompt


rag_service = RagService()
