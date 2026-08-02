import { Page } from "../pages/page.model.js";
import { DocumentModel } from "../documents/document.model.js";
import { sendSuccess } from "../../shared/responses/api-response.js";

const AI_SERVICE_URL = process.env.PYTHON_AI_SERVICE_URL || "http://127.0.0.1:8000";
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || "change-me";

export async function getWorkspaceGraph(req, res, next) {
  try {
    const { workspaceId } = req.params;

    // 1. Fetch pages and documents
    const pages = await Page.find({ workspaceId, status: "active" });
    const docs = await DocumentModel.find({ workspaceId });

    const nodes = [
      ...pages.map((p) => ({
        id: p._id.toString(),
        label: p.title,
        type: "page",
        tags: p.tags || [],
        notebookId: p.notebookId.toString(),
        sectionId: p.sectionId.toString(),
      })),
      ...docs.map((d) => ({
        id: d._id.toString(),
        label: d.title,
        type: "document",
        tags: [],
      })),
    ];

    // 2. Build edges based on shared tags
    const edges = [];
    const edgeSet = new Set();

    for (let i = 0; i < pages.length; i++) {
      for (let j = i + 1; j < pages.length; j++) {
        const p1 = pages[i];
        const p2 = pages[j];

        const sharedTags = p1.tags.filter((t) => p2.tags.includes(t));
        if (sharedTags.length > 0) {
          const edgeId = [p1._id.toString(), p2._id.toString()].sort().join("-");
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            edges.push({
              from: p1._id.toString(),
              to: p2._id.toString(),
              label: `Shared tag: #${sharedTags[0]}`,
              type: "tag",
            });
          }
        }
      }
    }

    // 3. Fetch semantic similarities from Python service
    try {
      const nodeIds = nodes.map((n) => n.id);
      const aiResponse = await fetch(`${AI_SERVICE_URL}/internal/v1/index/analyze/graph`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-token": INTERNAL_TOKEN,
        },
        body: JSON.stringify({ nodeIds }),
      });

      if (aiResponse.ok) {
        const data = await aiResponse.json();
        const aiEdges = data.edges || [];
        for (const edge of aiEdges) {
          const edgeId = [edge.source, edge.target].sort().join("-");
          if (!edgeSet.has(edgeId)) {
            edgeSet.add(edgeId);
            edges.push({
              from: edge.source,
              to: edge.target,
              label: `Semantically close (${Math.round(edge.score * 100)}%)`,
              type: "semantic",
            });
          }
        }
      }
    } catch (aiErr) {
      console.error("[GraphController] AI semantic edges failed:", aiErr.message);
    }

    return sendSuccess(res, { nodes, edges });
  } catch (error) {
    next(error);
  }
}
