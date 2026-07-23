import { AppError } from "../../shared/errors/app-error.js";
import { isValidObjectId } from "../../shared/utils/object-id.js";
import { workspaceService } from "../workspaces/workspace.service.js";
import { Notebook } from "./notebook.model.js";

class NotebookService {
  async list(userId, workspaceId) {
    await workspaceService.getOwnedWorkspace(userId, workspaceId);
    const notebooks = await Notebook.find({ workspaceId, ownerId: userId, status: "active" }).sort({ position: 1 });
    return notebooks.map((notebook) => notebook.toJSONView());
  }

  async create(userId, workspaceId, payload) {
    await workspaceService.getOwnedWorkspace(userId, workspaceId);
    const notebook = await Notebook.create({
      workspaceId,
      ownerId: userId,
      title: payload.title,
      description: payload.description || "",
      position: payload.position || Date.now(),
    });
    return notebook.toJSONView();
  }

  async getOwnedNotebook(userId, notebookId) {
    if (!isValidObjectId(notebookId)) {
      throw new AppError("Notebook not found", 404, "NOTEBOOK_NOT_FOUND");
    }

    const notebook = await Notebook.findOne({ _id: notebookId, ownerId: userId, status: "active" });

    if (!notebook) {
      throw new AppError("Notebook not found", 404, "NOTEBOOK_NOT_FOUND");
    }

    return notebook;
  }

  async update(userId, notebookId, payload) {
    const notebook = await this.getOwnedNotebook(userId, notebookId);
    if (payload.title !== undefined) notebook.title = payload.title;
    if (payload.description !== undefined) notebook.description = payload.description;
    if (payload.position !== undefined) notebook.position = payload.position;
    await notebook.save();
    return notebook.toJSONView();
  }

  async archive(userId, notebookId) {
    const notebook = await this.getOwnedNotebook(userId, notebookId);
    notebook.status = "archived";
    await notebook.save();
    return notebook.toJSONView();
  }
}

export const notebookService = new NotebookService();
