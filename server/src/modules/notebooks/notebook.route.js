import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { validateRequest } from "../../shared/middleware/validate-request.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { createNotebook, deleteNotebook, listNotebooks, updateNotebook } from "./notebook.controller.js";
import { createNotebookSchema, updateNotebookSchema } from "./notebook.validation.js";

export const notebookRouter = Router();

notebookRouter.use(asyncHandler(requireAuth));
notebookRouter.get("/workspaces/:workspaceId/notebooks", asyncHandler(listNotebooks));
notebookRouter.post("/workspaces/:workspaceId/notebooks", validateRequest(createNotebookSchema), asyncHandler(createNotebook));
notebookRouter.patch("/notebooks/:notebookId", validateRequest(updateNotebookSchema), asyncHandler(updateNotebook));
notebookRouter.delete("/notebooks/:notebookId", asyncHandler(deleteNotebook));
