import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.core.auth import verify_internal_token
from app.services.gemini import gemini_service
from app.services.qdrant_service import qdrant_service

logger = logging.getLogger(__name__)
router = APIRouter()

class TagsRequest(BaseModel):
    text: str

class GraphRequest(BaseModel):
    nodeIds: List[str]

@router.post("/analyze/tags", dependencies=[Depends(verify_internal_token)])
async def extract_tags_endpoint(request: TagsRequest):
    """
    Extract 3-5 tags from text content using Gemini.
    """
    try:
        tags = await gemini_service.extract_tags(request.text)
        return {"tags": tags}
    except Exception as e:
        logger.error(f"Failed to extract tags: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/page/{page_id}/related", dependencies=[Depends(verify_internal_token)])
async def get_related_pages_endpoint(page_id: str, workspaceId: str):
    """
    Retrieve pages semantically related to a given page ID.
    """
    try:
        related = qdrant_service.get_related_pages(page_id, workspaceId)
        return {"related": related}
    except Exception as e:
        logger.error(f"Failed to get related pages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze/graph", dependencies=[Depends(verify_internal_token)])
async def get_graph_similarities_endpoint(request: GraphRequest):
    """
    Retrieve semantic edges for a list of node IDs.
    """
    try:
        edges = qdrant_service.get_workspace_graph_similarities(request.nodeIds)
        return {"edges": edges}
    except Exception as e:
        logger.error(f"Failed to calculate graph similarities: {e}")
        raise HTTPException(status_code=500, detail=str(e))
