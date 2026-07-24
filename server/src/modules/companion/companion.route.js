import express from "express";
import { chatWithCompanion } from "./companion.controller.js";
import { requireAuth } from "../auth/auth.middleware.js";

export const companionRouter = express.Router();

companionRouter.post("/companion/chat", requireAuth, chatWithCompanion);
