from fastapi import APIRouter, Depends
from app.core.auth import verify_internal_token
from app.schemas.chat import ChatRequest, ChatResponse, Source
from app.services.gemini import gemini_service
from app.services.rag_service import rag_service
from app.services.qdrant_service import qdrant_service

router = APIRouter()


@router.post("/chat", response_model=ChatResponse, dependencies=[Depends(verify_internal_token)])
async def chat_endpoint(request: ChatRequest):
    """
    AI chat endpoint.

    - If workspaceId is provided AND Qdrant is configured → RAG path:
        embed query → retrieve context → grounded Gemini answer + citations
    - Otherwise → bare Gemini fallback (no context, no citations)
    """

    # --- RAG path ---
    if request.workspaceId and qdrant_service.is_configured:
        try:
            context_chunks = rag_service.retrieve_context(
                query=request.prompt,
                workspace_id=request.workspaceId,
                top_k=5,
                notebook_id=request.notebookId,
                page_id=request.pageId if request.scope == "page" else None,
            )

            if context_chunks:
                grounded_prompt = rag_service.build_grounded_prompt(
                    question=request.prompt,
                    context_chunks=context_chunks,
                )
                ai_response = await gemini_service.generate_with_context(
                    grounded_prompt, context_chunks
                )

                # Deduplicate sources by pageId
                seen_pages = set()
                sources = []
                for chunk in context_chunks:
                    pid = chunk["pageId"]
                    if pid not in seen_pages:
                        seen_pages.add(pid)
                        snippet = chunk["text"][:200].replace("\n", " ").strip()
                        sources.append(
                            Source(
                                pageId=pid,
                                pageTitle=chunk["pageTitle"],
                                snippet=snippet,
                            )
                        )

                return ChatResponse(response=ai_response, sources=sources)

        except Exception as e:
            # If RAG fails, fall through to bare Gemini
            print(f"RAG retrieval failed, falling back to bare Gemini: {e}")

    # --- Bare Gemini fallback ---
    ai_response = await gemini_service.generate_response(request.prompt)
    return ChatResponse(response=ai_response, sources=[])
