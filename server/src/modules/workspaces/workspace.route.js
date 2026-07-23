import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { validateRequest } from "../../shared/middleware/validate-request.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
  updateWorkspace,
} from "./workspace.controller.js";
import { createWorkspaceSchema, updateWorkspaceSchema } from "./workspace.validation.js";

export const workspaceRouter = Router();

workspaceRouter.use(asyncHandler(requireAuth));
workspaceRouter.get("/", asyncHandler(listWorkspaces));
workspaceRouter.post("/", validateRequest(createWorkspaceSchema), asyncHandler(createWorkspace));
workspaceRouter.get("/:workspaceId", asyncHandler(getWorkspace));
workspaceRouter.patch("/:workspaceId", validateRequest(updateWorkspaceSchema), asyncHandler(updateWorkspace));
workspaceRouter.delete("/:workspaceId", asyncHandler(deleteWorkspace));
