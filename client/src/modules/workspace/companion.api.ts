import { apiRequest } from "../../shared/api/api-client";

export type Source = {
  pageId: string;
  pageTitle: string;
  snippet: string;
  type?: "page" | "document";
  pageNum?: number | null;
};

type ChatResponse = {
  success: true;
  data: {
    response: string;
    sources: Source[];
  };
};

export type CompanionChatOptions = {
  token: string;
  prompt: string;
  workspaceId?: string;
  scope?: "workspace" | "notebook" | "page";
  notebookId?: string;
  pageId?: string;
};

export function chatWithCompanion({
  token,
  prompt,
  workspaceId,
  scope = "workspace",
  notebookId,
  pageId,
}: CompanionChatOptions) {
  return apiRequest<ChatResponse>(`/companion/chat`, {
    method: "POST",
    token,
    body: JSON.stringify({ prompt, workspaceId, scope, notebookId, pageId }),
  });
}
