import { apiRequest } from "../../shared/api/api-client";

export type Card = {
  id: string;
  userId: string;
  workspaceId: string;
  pageId: string;
  front: string;
  back: string;
  nextReviewDate: string;
  interval: number;
  repetitions: number;
  easeFactor: number;
  createdAt: string;
};

type CardListResponse = {
  success: true;
  data: {
    cards: Card[];
  };
};

type CardResponse = {
  success: true;
  data: Card;
};

export function generateFlashcards(token: string, pageId: string) {
  return apiRequest<CardListResponse>(`/pages/${pageId}/study/generate`, {
    method: "POST",
    token,
  });
}

export function listDueCards(token: string, workspaceId: string) {
  return apiRequest<CardListResponse>(`/study/due?workspaceId=${workspaceId}`, {
    token,
  });
}

export function gradeCard(token: string, cardId: string, rating: "again" | "good" | "easy") {
  return apiRequest<CardResponse>(`/study/cards/${cardId}/review`, {
    method: "POST",
    token,
    body: JSON.stringify({ rating }),
  });
}
