from pydantic import BaseModel
from typing import List, Optional


class BlockItem(BaseModel):
    blockId: str
    type: str  # heading | paragraph | code | checklist | quote | image
    content: Optional[str] = ""
    position: int


class IndexPageRequest(BaseModel):
    pageId: str
    workspaceId: str
    notebookId: str
    sectionId: str
    pageTitle: str
    blocks: List[BlockItem]


class IndexPageResponse(BaseModel):
    status: str
    chunksIndexed: int
    pageId: str
