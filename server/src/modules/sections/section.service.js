import { AppError } from "../../shared/errors/app-error.js";
import { isValidObjectId } from "../../shared/utils/object-id.js";
import { notebookService } from "../notebooks/notebook.service.js";
import { Section } from "./section.model.js";

class SectionService {
  async list(userId, notebookId) {
    await notebookService.getOwnedNotebook(userId, notebookId);
    const sections = await Section.find({ notebookId, status: "active" }).sort({ position: 1 });
    return sections.map((section) => section.toJSONView());
  }

  async create(userId, notebookId, payload) {
    const notebook = await notebookService.getOwnedNotebook(userId, notebookId);
    const section = await Section.create({
      workspaceId: notebook.workspaceId,
      notebookId,
      title: payload.title,
      position: payload.position || Date.now(),
    });
    return section.toJSONView();
  }

  async getOwnedSection(userId, sectionId) {
    if (!isValidObjectId(sectionId)) {
      throw new AppError("Section not found", 404, "SECTION_NOT_FOUND");
    }

    const section = await Section.findOne({ _id: sectionId, status: "active" });

    if (!section) {
      throw new AppError("Section not found", 404, "SECTION_NOT_FOUND");
    }

    await notebookService.getOwnedNotebook(userId, section.notebookId);
    return section;
  }

  async update(userId, sectionId, payload) {
    const section = await this.getOwnedSection(userId, sectionId);
    if (payload.title !== undefined) section.title = payload.title;
    if (payload.position !== undefined) section.position = payload.position;
    await section.save();
    return section.toJSONView();
  }

  async archive(userId, sectionId) {
    const section = await this.getOwnedSection(userId, sectionId);
    section.status = "archived";
    await section.save();
    return section.toJSONView();
  }
}

export const sectionService = new SectionService();
