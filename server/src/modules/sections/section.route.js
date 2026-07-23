import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { validateRequest } from "../../shared/middleware/validate-request.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { createSection, deleteSection, listSections, updateSection } from "./section.controller.js";
import { createSectionSchema, updateSectionSchema } from "./section.validation.js";

export const sectionRouter = Router();

sectionRouter.use(asyncHandler(requireAuth));
sectionRouter.get("/notebooks/:notebookId/sections", asyncHandler(listSections));
sectionRouter.post("/notebooks/:notebookId/sections", validateRequest(createSectionSchema), asyncHandler(createSection));
sectionRouter.patch("/sections/:sectionId", validateRequest(updateSectionSchema), asyncHandler(updateSection));
sectionRouter.delete("/sections/:sectionId", asyncHandler(deleteSection));
