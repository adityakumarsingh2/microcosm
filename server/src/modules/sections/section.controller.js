import { sendSuccess } from "../../shared/responses/api-response.js";
import { sectionService } from "./section.service.js";

export async function listSections(req, res) {
  const sections = await sectionService.list(req.user._id, req.params.notebookId);
  return sendSuccess(res, { sections });
}

export async function createSection(req, res) {
  const section = await sectionService.create(req.user._id, req.params.notebookId, req.validated.body);
  return sendSuccess(res, { section }, 201, "Section created");
}

export async function updateSection(req, res) {
  const section = await sectionService.update(req.user._id, req.params.sectionId, req.validated.body);
  return sendSuccess(res, { section });
}

export async function deleteSection(req, res) {
  const section = await sectionService.archive(req.user._id, req.params.sectionId);
  return sendSuccess(res, { section }, 200, "Section archived");
}
