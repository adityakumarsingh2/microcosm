"""
chunking_service.py

Converts page blocks into semantic text chunks for RAG indexing.

Rules:
- Skip image blocks.
- Use heading blocks as context anchors (prepended to the next chunk's text).
- Group adjacent paragraphs/code/checklist/quote blocks.
- Target ~500 characters per chunk (rough token proxy without tokenizer dependency).
- Preserve blockIds for citation tracing.
"""
from typing import List
from dataclasses import dataclass, field

INDEXABLE_TYPES = {"paragraph", "heading", "code", "checklist", "quote"}
TARGET_CHUNK_CHARS = 600  # ~400-600 tokens depending on language


@dataclass
class ChunkItem:
    text: str
    block_ids: List[str] = field(default_factory=list)
    chunk_index: int = 0


def _block_text(block) -> str:
    """Extract a plain text string from a block."""
    content = block.content or ""
    if not isinstance(content, str):
        content = str(content)
    return content.strip()


def chunk_blocks(blocks, page_title: str = "") -> List[ChunkItem]:
    """
    Chunk a list of block objects into ChunkItems.

    Args:
        blocks: list of BlockItem (with .type, .content, .blockId)
        page_title: used as context prefix for the first chunk

    Returns:
        List[ChunkItem]
    """
    chunks: List[ChunkItem] = []
    current_texts: List[str] = []
    current_block_ids: List[str] = []
    current_heading: str = page_title  # carries forward as context anchor

    def flush():
        nonlocal current_texts, current_block_ids
        if not current_texts:
            return
        joined = "\n".join(current_texts).strip()
        if joined:
            text = f"[{current_heading}]\n{joined}" if current_heading else joined
            chunks.append(ChunkItem(
                text=text,
                block_ids=list(current_block_ids),
                chunk_index=len(chunks),
            ))
        current_texts = []
        current_block_ids = []

    # Sort by position to guarantee order
    sorted_blocks = sorted(blocks, key=lambda b: b.position)

    for block in sorted_blocks:
        if block.type not in INDEXABLE_TYPES:
            continue  # skip image and unknown blocks

        text = _block_text(block)
        if not text:
            continue

        if block.type == "heading":
            # Flush what we have so far, then update the heading anchor
            flush()
            current_heading = text
            # Include the heading itself as a short standalone chunk if it is standalone
            # (will be part of the next chunk context anchor)
            continue

        # Accumulate
        current_texts.append(text)
        current_block_ids.append(block.blockId)

        # Flush if we've hit target size
        total_chars = sum(len(t) for t in current_texts)
        if total_chars >= TARGET_CHUNK_CHARS:
            flush()

    flush()  # flush any remaining
    return chunks
