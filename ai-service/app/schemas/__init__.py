from pydantic import BaseModel
from typing import List


__all__ = ["ChunkItem"]


class ChunkItem(BaseModel):
    text: str
    block_ids: List[str]
    chunk_index: int
