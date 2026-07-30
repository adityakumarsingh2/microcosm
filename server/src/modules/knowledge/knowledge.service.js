/**
 * knowledge.service.js
 *
 * Internal service that bridges the Node.js backend to the Python AI service
 * for page indexing. This is NOT a public API route — it is called internally
 * from page.service.js after saves.
 */

const AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || "http://127.0.0.1:8000";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "change-me";

/**
 * Convert page blocks to the format expected by the Python indexing endpoint.
 * Strips Mongoose document overhead and ensures content is a plain string.
 */
function serializeBlocks(blocks) {
  return blocks.map((block) => ({
    blockId: block.blockId,
    type: block.type,
    content: typeof block.content === "string" ? block.content : String(block.content ?? ""),
    position: block.position,
  }));
}

/**
 * Call the Python AI service to index a page's blocks into Qdrant.
 * This is fire-and-forget from the caller's perspective.
 *
 * @param {object} page - Mongoose Page document (already saved)
 * @param {string} notebookId - The notebook this page belongs to
 * @param {string} sectionId  - The section this page belongs to
 */
export async function indexPage(page, notebookId, sectionId) {
  const payload = {
    pageId: page._id.toString(),
    workspaceId: page.workspaceId.toString(),
    notebookId: notebookId.toString(),
    sectionId: sectionId.toString(),
    pageTitle: page.title,
    blocks: serializeBlocks(page.blocks),
  };

  try {
    const response = await fetch(`${AI_SERVICE_URL}/internal/v1/index/page`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": INTERNAL_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[KnowledgeService] Indexing failed for page ${page._id}: ${text}`);
      return { success: false };
    }

    const data = await response.json();
    console.log(
      `[KnowledgeService] Indexed page ${page._id}: ${data.chunksIndexed} chunks`
    );
    return { success: true, chunksIndexed: data.chunksIndexed };
  } catch (err) {
    console.error(`[KnowledgeService] Network error indexing page ${page._id}:`, err.message);
    return { success: false };
  }
}

/**
 * Trigger indexing only if the page's knowledgeStatus is "pending".
 * Updates the page's knowledgeStatus in MongoDB based on the result.
 *
 * @param {object} page - Mongoose Page document
 */
export async function triggerIndexIfNeeded(page) {
  if (page.knowledgeStatus !== "pending" && page.knowledgeStatus !== "failed") return;

  const result = await indexPage(page, page.notebookId, page.sectionId);

  // Update knowledgeStatus in the DB — use updateOne to avoid stale-state issues
  const { Page } = await import("../pages/page.model.js");
  await Page.updateOne(
    { _id: page._id },
    {
      knowledgeStatus: result.success ? "indexed" : "failed",
    }
  );
}
