import os
import httpx
import logging
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from pydantic import BaseModel
from app.core.auth import verify_internal_token
from app.services.rag_service import rag_service
from app.services.qdrant_service import qdrant_service

logger = logging.getLogger(__name__)
router = APIRouter()

NODE_BACKEND_URL = os.getenv("NODE_BACKEND_URL") or "http://127.0.0.1:5000"
INTERNAL_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN") or "change-me"

class IndexDocumentRequest(BaseModel):
    documentId: str
    workspaceId: str
    url: str
    title: str

async def process_document_background(request: IndexDocumentRequest):
    """Asynchronously download, parse, chunk, embed, and index the document."""
    logger.info(f"Background worker started for document indexing: {request.documentId}")
    
    # 1. Trigger index pipeline
    result = rag_service.index_document(
        document_id=request.documentId,
        workspace_id=request.workspaceId,
        url=request.url,
        title=request.title
    )
    
    status = "indexed" if result["status"] == "indexed" else "failed"
    chunks_indexed = result["chunksIndexed"]
    
    # 2. Notify Node backend of indexing status via internal HTTP callback
    logger.info(f"Notifying Node backend of indexing result for document {request.documentId}: status={status}")
    callback_url = f"{NODE_BACKEND_URL}/api/v1/internal/v1/documents/{request.documentId}/status"
    
    payload = {
        "status": status,
        "chunksIndexed": chunks_indexed
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                callback_url,
                json=payload,
                headers={"x-internal-token": INTERNAL_TOKEN},
                timeout=30.0
            )
            if response.is_error:
                logger.error(f"Failed to callback Node backend for document status: {response.text}")
    except Exception as e:
        logger.error(f"Network error calling back Node backend: {e}")

@router.post("/document", dependencies=[Depends(verify_internal_token)])
async def index_document_endpoint(request: IndexDocumentRequest, background_tasks: BackgroundTasks):
    """
    Ingest and index a PDF document asynchronously.
    Returns status immediately to avoid connection timeouts during heavy parsing/embeddings.
    """
    background_tasks.add_task(process_document_background, request)
    return {"message": "Ingestion task queued in background.", "status": "processing"}

@router.delete("/document/{document_id}", dependencies=[Depends(verify_internal_token)])
async def delete_document_endpoint(document_id: str):
    """Delete a document's vector points from Qdrant."""
    try:
        qdrant_service.delete_document_chunks(document_id)
        return {"success": True, "message": f"Deleted chunks for document {document_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
