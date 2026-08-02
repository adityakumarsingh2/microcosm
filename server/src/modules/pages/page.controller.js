import { sendSuccess } from "../../shared/responses/api-response.js";
import { pageService } from "./page.service.js";

export async function listPages(req, res) {
  const pages = await pageService.list(req.user._id, req.params.sectionId);
  return sendSuccess(res, { pages });
}

export async function createPage(req, res) {
  const page = await pageService.create(req.user._id, req.params.sectionId, req.validated.body);
  return sendSuccess(res, { page }, 201, "Page created");
}

export async function getPage(req, res) {
  const page = await pageService.get(req.user._id, req.params.pageId);
  return sendSuccess(res, { page });
}

export async function updatePage(req, res) {
  const page = await pageService.update(req.user._id, req.params.pageId, req.validated.body);
  return sendSuccess(res, { page });
}

export async function deletePage(req, res) {
  const page = await pageService.archive(req.user._id, req.params.pageId);
  return sendSuccess(res, { page }, 200, "Page archived");
}

export async function getRelatedPages(req, res) {
  const related = await pageService.getRelated(req.user._id, req.params.pageId);
  return sendSuccess(res, { related });
}
