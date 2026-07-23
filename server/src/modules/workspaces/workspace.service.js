import { AppError } from "../../shared/errors/app-error.js";
import { isValidObjectId } from "../../shared/utils/object-id.js";
import { Workspace } from "./workspace.model.js";

class WorkspaceService {
  async list(userId) {
    const workspaces = await Workspace.find({ ownerId: userId, status: "active" }).sort({ updatedAt: -1 });
    return workspaces.map((workspace) => workspace.toJSONView());
  }

  async create(userId, payload) {
    const workspace = await Workspace.create({
      ownerId: userId,
      name: payload.name,
      description: payload.description || "",
      icon: payload.icon || "sparkles",
    });

    return workspace.toJSONView();
  }

  async getOwnedWorkspace(userId, workspaceId) {
    if (!isValidObjectId(workspaceId)) {
      throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
    }

    const workspace = await Workspace.findOne({ _id: workspaceId, ownerId: userId, status: "active" });

    if (!workspace) {
      throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND");
    }

    return workspace;
  }

  async get(userId, workspaceId) {
    const workspace = await this.getOwnedWorkspace(userId, workspaceId);
    return workspace.toJSONView();
  }

  async update(userId, workspaceId, payload) {
    const workspace = await this.getOwnedWorkspace(userId, workspaceId);

    if (payload.name !== undefined) workspace.name = payload.name;
    if (payload.description !== undefined) workspace.description = payload.description;
    if (payload.icon !== undefined) workspace.icon = payload.icon;

    await workspace.save();
    return workspace.toJSONView();
  }

  async archive(userId, workspaceId) {
    const workspace = await this.getOwnedWorkspace(userId, workspaceId);
    workspace.status = "archived";
    await workspace.save();
    return workspace.toJSONView();
  }
}

export const workspaceService = new WorkspaceService();
