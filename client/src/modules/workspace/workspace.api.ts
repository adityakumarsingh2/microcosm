import { apiRequest } from "../../shared/api/api-client";

export type Workspace = {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type WorkspaceListResponse = {
  success: true;
  data: {
    workspaces: Workspace[];
  };
};

type WorkspaceResponse = {
  success: true;
  data: {
    workspace: Workspace;
  };
};

export function listWorkspaces(token: string) {
  return apiRequest<WorkspaceListResponse>("/workspaces", {
    token,
  });
}

export function createWorkspace(token: string, input: { name: string; description?: string; icon?: string }) {
  return apiRequest<WorkspaceResponse>("/workspaces", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export function updateWorkspace(token: string, workspaceId: string, input: { name?: string; description?: string; icon?: string }) {
  return apiRequest<WorkspaceResponse>(`/workspaces/${workspaceId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });
}

export function deleteWorkspace(token: string, workspaceId: string) {
  return apiRequest<{ success: true }>(`/workspaces/${workspaceId}`, {
    method: "DELETE",
    token,
  });
}
