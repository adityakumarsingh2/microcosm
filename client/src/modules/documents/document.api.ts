import { apiRequest } from "../../shared/api/api-client";

export type Document = {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  url: string;
  bytes: number;
  status: "pending" | "processing" | "indexed" | "failed";
  chunksIndexed: number;
  createdAt: string;
};

type DocumentListResponse = {
  success: true;
  data: {
    documents: Document[];
  };
};

type DocumentResponse = {
  success: true;
  data: Document;
};

export function listDocuments(token: string, workspaceId: string) {
  return apiRequest<DocumentListResponse>(`/documents?workspaceId=${workspaceId}`, {
    token,
  });
}

export function uploadDocument(token: string, workspaceId: string, file: File) {
  const formData = new FormData();
  formData.append("workspaceId", workspaceId);
  formData.append("file", file);

  return apiRequest<DocumentResponse>("/documents", {
    method: "POST",
    token,
    body: formData,
  });
}

export function deleteDocument(token: string, id: string) {
  return apiRequest<{ success: true }>(`/documents/${id}`, {
    method: "DELETE",
    token,
  });
}
