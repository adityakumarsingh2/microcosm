from fastapi import APIRouter, Depends, HTTPException
from app.core.auth import verify_internal_token
from app.schemas.indexing import IndexPageRequest, IndexPageResponse
from app.services.rag_service import rag_service
from app.services.qdrant_service import qdrant_service

router = APIRouter()


@router.post(
    "/page",
    response_model=IndexPageResponse,
    dependencies=[Depends(verify_internal_token)],
)
async def index_page(request: IndexPageRequest):
    """
    Receive a page's blocks from the Node.js backend, chunk and embed them,
    then upsert the vectors into Qdrant.
    """
    if not qdrant_service.is_configured:
        raise HTTPException(
            status_code=503,
            detail="Qdrant is not configured. Set QDRANT_URL in ai-service/.env",
        )

    result = rag_service.index_page(request)

    if result.get("status") == "error":
        raise HTTPException(
            status_code=500,
            detail=f"Indexing failed: {result.get('error', 'Unknown error')}",
        )

    return IndexPageResponse(
        status=result["status"],
        chunksIndexed=result["chunksIndexed"],
        pageId=request.pageId,
    )
