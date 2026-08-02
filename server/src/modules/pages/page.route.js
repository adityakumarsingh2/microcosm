import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { validateRequest } from "../../shared/middleware/validate-request.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { createPage, deletePage, getPage, listPages, updatePage, getRelatedPages } from "./page.controller.js";
import { createPageSchema, updatePageSchema } from "./page.validation.js";

export const pageRouter = Router();

pageRouter.use(asyncHandler(requireAuth));
pageRouter.get("/sections/:sectionId/pages", asyncHandler(listPages));
pageRouter.post("/sections/:sectionId/pages", validateRequest(createPageSchema), asyncHandler(createPage));
pageRouter.get("/pages/:pageId", asyncHandler(getPage));
pageRouter.get("/pages/:pageId/related", asyncHandler(getRelatedPages));
pageRouter.patch("/pages/:pageId", validateRequest(updatePageSchema), asyncHandler(updatePage));
pageRouter.delete("/pages/:pageId", asyncHandler(deletePage));
