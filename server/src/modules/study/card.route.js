import express from "express";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  generateFlashcards,
  listDueCards,
  gradeCard,
} from "./card.controller.js";

export const cardRouter = express.Router();

cardRouter.post("/pages/:pageId/study/generate", requireAuth, generateFlashcards);
cardRouter.get("/study/due", requireAuth, listDueCards);
cardRouter.post("/study/cards/:id/review", requireAuth, gradeCard);
