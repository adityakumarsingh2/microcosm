from pydantic import BaseModel
from typing import List, Optional


class ChatRequest(BaseModel):
    prompt: str
    workspaceId: Optional[str] = None
    scope: Optional[str] = "workspace"  # workspace | notebook | page
    notebookId: Optional[str] = None
    pageId: Optional[str] = None


class Source(BaseModel):
    pageId: str
    pageTitle: str
    snippet: str


class ChatResponse(BaseModel):
    response: str
    sources: List[Source] = []
