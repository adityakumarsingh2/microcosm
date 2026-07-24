import { apiRequest } from "../../shared/api/api-client";

type ChatResponse = {
  success: true;
  data: {
    response: string;
  };
};

export function chatWithCompanion(token: string, prompt: string) {
  return apiRequest<ChatResponse>(`/companion/chat`, {
    method: "POST",
    token,
    body: JSON.stringify({ prompt }),
  });
}
