"""
qdrant_service.py

Manages the Qdrant vector database connection, collection lifecycle,
vector upsert, deletion, and semantic search.
"""
import os
import uuid
import logging
from typing import List, Optional, Dict, Any

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
)

logger = logging.getLogger(__name__)

COLLECTION_NAME = "microcosm_notes"
VECTOR_SIZE = 768  # Gemini text-embedding-004


class QdrantService:
    def __init__(self):
        self._client: Optional[QdrantClient] = None

    def _get_client(self) -> QdrantClient:
        if self._client is not None:
            return self._client

        qdrant_url = os.getenv("QDRANT_URL", "")
        qdrant_api_key = os.getenv("QDRANT_API_KEY", "")

        if not qdrant_url:
            raise RuntimeError(
                "QDRANT_URL is not set. Please configure it in ai-service/.env"
            )

        self._client = QdrantClient(
            url=qdrant_url,
            api_key=qdrant_api_key or None,
        )
        return self._client

    def ensure_collection(self):
        """Create the Qdrant collection if it does not already exist."""
        try:
            client = self._get_client()
            collections = client.get_collections().collections
            existing = [c.name for c in collections]

            if COLLECTION_NAME not in existing:
                client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(
                        size=VECTOR_SIZE,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info(f"Qdrant collection '{COLLECTION_NAME}' created.")
            else:
                logger.info(f"Qdrant collection '{COLLECTION_NAME}' already exists.")
        except Exception as e:
            logger.error(f"Failed to ensure Qdrant collection: {e}")
            raise

    def upsert_chunks(
        self,
        chunks,  # List[ChunkItem]
        workspace_id: str,
        notebook_id: str,
        section_id: str,
        page_id: str,
        page_title: str,
        vectors: List[List[float]],
    ):
        """
        Upsert chunk vectors into Qdrant.

        Each point payload stores enough metadata for filtering and citation.
        """
        client = self._get_client()
        points = []

        for chunk, vector in zip(chunks, vectors):
            point_id = str(uuid.uuid4())
            points.append(
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={
                        "workspaceId": workspace_id,
                        "notebookId": notebook_id,
                        "sectionId": section_id,
                        "pageId": page_id,
                        "pageTitle": page_title,
                        "chunkIndex": chunk.chunk_index,
                        "blockIds": chunk.block_ids,
                        "text": chunk.text,
                    },
                )
            )

        if points:
            client.upsert(collection_name=COLLECTION_NAME, points=points)
            logger.info(f"Upserted {len(points)} chunks for page {page_id}")

    def delete_page_chunks(self, page_id: str):
        """Remove all vectors for a given page (called before re-indexing)."""
        try:
            client = self._get_client()
            client.delete(
                collection_name=COLLECTION_NAME,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="pageId",
                            match=MatchValue(value=page_id),
                        )
                    ]
                ),
            )
            logger.info(f"Deleted existing chunks for page {page_id}")
        except Exception as e:
            logger.warning(f"Could not delete chunks for page {page_id}: {e}")

    def search(
        self,
        query_vector: List[float],
        workspace_id: str,
        top_k: int = 5,
        notebook_id: Optional[str] = None,
        page_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Semantic search filtered by workspaceId (and optionally notebookId/pageId).

        Returns a list of payload dicts for the top matching chunks.
        """
        client = self._get_client()

        must_conditions = [
            FieldCondition(key="workspaceId", match=MatchValue(value=workspace_id))
        ]
        if notebook_id:
            must_conditions.append(
                FieldCondition(key="notebookId", match=MatchValue(value=notebook_id))
            )
        if page_id:
            must_conditions.append(
                FieldCondition(key="pageId", match=MatchValue(value=page_id))
            )

        results = client.search(
            collection_name=COLLECTION_NAME,
            query_vector=query_vector,
            query_filter=Filter(must=must_conditions),
            limit=top_k,
            with_payload=True,
        )

        return [
            {
                "score": r.score,
                "pageId": r.payload.get("pageId", ""),
                "pageTitle": r.payload.get("pageTitle", ""),
                "text": r.payload.get("text", ""),
                "chunkIndex": r.payload.get("chunkIndex", 0),
                "blockIds": r.payload.get("blockIds", []),
            }
            for r in results
        ]

    @property
    def is_configured(self) -> bool:
        return bool(os.getenv("QDRANT_URL", ""))


qdrant_service = QdrantService()
