import { sendSuccess } from "../../shared/responses/api-response.js";
import { workspaceService } from "./workspace.service.js";

export async function listWorkspaces(req, res) {
  const workspaces = await workspaceService.list(req.user._id);
  return sendSuccess(res, { workspaces });
}

export async function createWorkspace(req, res) {
  const workspace = await workspaceService.create(req.user._id, req.validated.body);
  return sendSuccess(res, { workspace }, 201, "Workspace created");
}

export async function getWorkspace(req, res) {
  const workspace = await workspaceService.get(req.user._id, req.params.workspaceId);
  return sendSuccess(res, { workspace });
}

export async function updateWorkspace(req, res) {
  const workspace = await workspaceService.update(req.user._id, req.params.workspaceId, req.validated.body);
  return sendSuccess(res, { workspace });
}

export async function deleteWorkspace(req, res) {
  const workspace = await workspaceService.archive(req.user._id, req.params.workspaceId);
  return sendSuccess(res, { workspace }, 200, "Workspace archived");
}
