import { AppError } from "../../shared/errors/app-error.js";
import { isValidObjectId } from "../../shared/utils/object-id.js";
import { sectionService } from "../sections/section.service.js";
import { Page } from "./page.model.js";
import { triggerIndexIfNeeded, getRelatedPagesFromAi } from "../knowledge/knowledge.service.js";

class PageService {
  async list(userId, sectionId) {
    await sectionService.getOwnedSection(userId, sectionId);
    const pages = await Page.find({ sectionId, status: "active" }).sort({ updatedAt: -1 });
    return pages.map((page) => page.toJSONView());
  }

  async create(userId, sectionId, payload) {
    const section = await sectionService.getOwnedSection(userId, sectionId);
    const page = await Page.create({
      workspaceId: section.workspaceId,
      notebookId: section.notebookId,
      sectionId,
      title: payload.title,
      emoji: payload.emoji || "",
      blocks: payload.blocks || [],
      knowledgeStatus: payload.blocks?.length ? "pending" : "not_indexed",
    });

    // Fire-and-forget indexing (does not block the API response)
    triggerIndexIfNeeded(page).catch((err) =>
      console.error("[PageService] Background indexing error:", err)
    );

    return page.toJSONView();
  }

  async getOwnedPage(userId, pageId) {
    if (!isValidObjectId(pageId)) {
      throw new AppError("Page not found", 404, "PAGE_NOT_FOUND");
    }

    const page = await Page.findOne({ _id: pageId, status: "active" });

    if (!page) {
      throw new AppError("Page not found", 404, "PAGE_NOT_FOUND");
    }

    await sectionService.getOwnedSection(userId, page.sectionId);
    return page;
  }

  async get(userId, pageId) {
    const page = await this.getOwnedPage(userId, pageId);
    return page.toJSONView();
  }

  async update(userId, pageId, payload) {
    const page = await this.getOwnedPage(userId, pageId);

    if (payload.title !== undefined) page.title = payload.title;
    if (payload.emoji !== undefined) page.emoji = payload.emoji;
    if (payload.blocks !== undefined) {
      page.blocks = payload.blocks;
      page.knowledgeStatus = payload.blocks.length ? "pending" : "not_indexed";
    }

    await page.save();

    // Fire-and-forget indexing (does not block the API response)
    triggerIndexIfNeeded(page).catch((err) =>
      console.error("[PageService] Background indexing error:", err)
    );

    return page.toJSONView();
  }

  async archive(userId, pageId) {
    const page = await this.getOwnedPage(userId, pageId);
    page.status = "archived";
    await page.save();
    return page.toJSONView();
  }

  async getRelated(userId, pageId) {
    const page = await this.getOwnedPage(userId, pageId);

    // 1. Get semantic recommendations from AI
    const aiRelated = await getRelatedPagesFromAi(pageId, page.workspaceId.toString());
    const aiRelatedIds = aiRelated.map((r) => r.pageId);

    // 2. Fetch page documents from MongoDB
    let pages = [];
    if (aiRelatedIds.length > 0) {
      pages = await Page.find({
        _id: { $in: aiRelatedIds },
        status: "active",
      });
    }

    // 3. Fallback/Supplement: Shared tags recommendations
    if (pages.length < 5 && page.tags && page.tags.length > 0) {
      const existingIds = new Set([pageId, ...pages.map((p) => p._id.toString())]);
      const tagMatches = await Page.find({
        workspaceId: page.workspaceId,
        _id: { $nin: Array.from(existingIds) },
        tags: { $in: page.tags },
        status: "active",
      }).limit(5 - pages.length);

      pages = [...pages, ...tagMatches];
    }

    return pages.map((p) => ({
      id: p._id.toString(),
      title: p.title,
      tags: p.tags || [],
      notebookId: p.notebookId.toString(),
      sectionId: p.sectionId.toString(),
    }));
  }
}

export const pageService = new PageService();
