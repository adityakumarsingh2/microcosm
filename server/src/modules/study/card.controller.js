import { Card } from "./card.model.js";
import { Page } from "../pages/page.model.js";
import { AppError } from "../../shared/errors/app-error.js";
import { env } from "../../config/env.js";

const AI_SERVICE_URL = env.pythonAiServiceUrl || "http://127.0.0.1:8000";
const INTERNAL_TOKEN = env.internalServiceToken || "change-me";

export const generateFlashcards = async (req, res, next) => {
  try {
    const { pageId } = req.params;
    const userId = req.user.id;

    // Verify page ownership
    const page = await Page.findById(pageId);
    if (!page) {
      throw new AppError("Page not found", 404);
    }

    const textContent = page.blocks
      .map((b) => (typeof b.content === "string" ? b.content : ""))
      .filter(Boolean)
      .join("\n");

    if (!textContent.trim()) {
      throw new AppError("Page content is too short to generate flashcards", 400);
    }

    // Call Python AI service to synthesize flashcards
    const response = await fetch(`${AI_SERVICE_URL}/internal/v1/index/analyze/flashcards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": INTERNAL_TOKEN,
      },
      body: JSON.stringify({ text: textContent }),
    });

    if (!response.ok) {
      const errMsg = await response.text();
      console.error("[CardController] AI Synthesis failed:", errMsg);
      throw new AppError("Failed to generate flashcards from page text content", 502);
    }

    const resJson = await response.json();
    const flashcardsData = resJson.flashcards || [];

    // Clear old flashcards for this page (to avoid duplicate generation clutter)
    await Card.deleteMany({ pageId, userId });

    // Bulk insert new flashcards
    const cardsToCreate = flashcardsData.map((card) => ({
      userId,
      workspaceId: page.workspaceId,
      pageId,
      front: card.front,
      back: card.back,
      nextReviewDate: new Date(),
    }));

    const createdCards = await Card.insertMany(cardsToCreate);

    return res.status(201).json({
      success: true,
      data: {
        cards: createdCards.map((c) => c.toJSONView()),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const listDueCards = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      throw new AppError("Workspace ID is required", 400);
    }
    const userId = req.user.id;

    const cards = await Card.find({
      workspaceId,
      userId,
      nextReviewDate: { $lte: new Date() },
    }).sort({ nextReviewDate: 1 });

    return res.status(200).json({
      success: true,
      data: {
        cards: cards.map((c) => c.toJSONView()),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const gradeCard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating } = req.body; // "easy" | "good" | "again"
    const userId = req.user.id;

    if (!["easy", "good", "again"].includes(rating)) {
      throw new AppError("Invalid review rating. Expected 'easy', 'good', or 'again'", 400);
    }

    const card = await Card.findOne({ _id: id, userId });
    if (!card) {
      throw new AppError("Card not found", 404);
    }

    // Standard SuperMemo-2 algorithm conversion:
    // again -> grade 1, good -> grade 4, easy -> grade 5
    let q = 4;
    if (rating === "again") q = 1;
    else if (rating === "good") q = 4;
    else if (rating === "easy") q = 5;

    let { interval, repetitions, easeFactor } = card;

    if (q >= 3) {
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }

    // Update Easiness Factor (EF)
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    card.interval = interval;
    card.repetitions = repetitions;
    card.easeFactor = easeFactor;
    // Set next date in future days
    card.nextReviewDate = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

    await card.save();

    return res.status(200).json({
      success: true,
      data: card.toJSONView(),
    });
  } catch (error) {
    next(error);
  }
};
