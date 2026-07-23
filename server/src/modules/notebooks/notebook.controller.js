import { sendSuccess } from "../../shared/responses/api-response.js";
import { notebookService } from "./notebook.service.js";

export async function listNotebooks(req, res) {
  const notebooks = await notebookService.list(req.user._id, req.params.workspaceId);
  return sendSuccess(res, { notebooks });
}

export async function createNotebook(req, res) {
  const notebook = await notebookService.create(req.user._id, req.params.workspaceId, req.validated.body);
  return sendSuccess(res, { notebook }, 201, "Notebook created");
}

export async function updateNotebook(req, res) {
  const notebook = await notebookService.update(req.user._id, req.params.notebookId, req.validated.body);
  return sendSuccess(res, { notebook });
}

export async function deleteNotebook(req, res) {
  const notebook = await notebookService.archive(req.user._id, req.params.notebookId);
  return sendSuccess(res, { notebook }, 200, "Notebook archived");
}
