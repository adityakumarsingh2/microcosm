import { apiRequest } from "../../shared/api/api-client";

export type Notebook = {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  position: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type Section = {
  id: string;
  workspaceId: string;
  notebookId: string;
  title: string;
  position: number;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type PageBlock = {
  blockId: string;
  type: "heading" | "paragraph" | "code" | "checklist" | "quote" | "image";
  content?: unknown;
  properties?: Record<string, unknown>;
  position: number;
};

export type Page = {
  id: string;
  workspaceId: string;
  notebookId: string;
  sectionId: string;
  title: string;
  emoji: string;
  blocks: PageBlock[];
  status: string;
  tags?: string[];
  knowledgeStatus: "not_indexed" | "pending" | "indexed" | "failed";
  createdAt: string;
  updatedAt: string;
};

type NotebookListResponse = {
  success: true;
  data: { notebooks: Notebook[] };
};

type NotebookResponse = {
  success: true;
  data: { notebook: Notebook };
};

type SectionListResponse = {
  success: true;
  data: { sections: Section[] };
};

type SectionResponse = {
  success: true;
  data: { section: Section };
};

type PageListResponse = {
  success: true;
  data: { pages: Page[] };
};

type PageResponse = {
  success: true;
  data: { page: Page };
};

export function listNotebooks(token: string, workspaceId: string) {
  return apiRequest<NotebookListResponse>(`/workspaces/${workspaceId}/notebooks`, { token });
}

export function createNotebook(token: string, workspaceId: string, input: { title: string; description?: string }) {
  return apiRequest<NotebookResponse>(`/workspaces/${workspaceId}/notebooks`, {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export function updateNotebook(token: string, notebookId: string, input: { title?: string; description?: string }) {
  return apiRequest<NotebookResponse>(`/notebooks/${notebookId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });
}

export function deleteNotebook(token: string, notebookId: string) {
  return apiRequest<{ success: true }>(`/notebooks/${notebookId}`, {
    method: "DELETE",
    token,
  });
}

export function listSections(token: string, notebookId: string) {
  return apiRequest<SectionListResponse>(`/notebooks/${notebookId}/sections`, { token });
}

export function createSection(token: string, notebookId: string, input: { title: string }) {
  return apiRequest<SectionResponse>(`/notebooks/${notebookId}/sections`, {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export function updateSection(token: string, sectionId: string, input: { title?: string }) {
  return apiRequest<SectionResponse>(`/sections/${sectionId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });
}

export function deleteSection(token: string, sectionId: string) {
  return apiRequest<{ success: true }>(`/sections/${sectionId}`, {
    method: "DELETE",
    token,
  });
}

export function listPages(token: string, sectionId: string) {
  return apiRequest<PageListResponse>(`/sections/${sectionId}/pages`, { token });
}

export function createPage(token: string, sectionId: string, input: { title: string; emoji?: string; blocks?: PageBlock[] }) {
  return apiRequest<PageResponse>(`/sections/${sectionId}/pages`, {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });
}

export function getPage(token: string, pageId: string) {
  return apiRequest<PageResponse>(`/pages/${pageId}`, { token });
}

export function updatePage(token: string, pageId: string, input: { title?: string; emoji?: string; blocks?: PageBlock[] }) {
  return apiRequest<PageResponse>(`/pages/${pageId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });
}

export function deletePage(token: string, pageId: string) {
  return apiRequest<{ success: true }>(`/pages/${pageId}`, {
    method: "DELETE",
    token,
  });
}

export type RelatedPage = {
  id: string;
  title: string;
  tags: string[];
  notebookId?: string;
  sectionId?: string;
};

export type GraphNode = {
  id: string;
  label: string;
  type: "page" | "document";
  tags: string[];
  notebookId?: string;
  sectionId?: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  label: string;
  type: "tag" | "semantic";
};

type RelatedPagesResponse = {
  success: true;
  data: {
    related: RelatedPage[];
  };
};

type WorkspaceGraphResponse = {
  success: true;
  data: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
};

export function getRelatedPages(token: string, pageId: string) {
  return apiRequest<RelatedPagesResponse>(`/pages/${pageId}/related`, {
    token,
  });
}

export function getWorkspaceGraph(token: string, workspaceId: string) {
  return apiRequest<WorkspaceGraphResponse>(`/workspaces/${workspaceId}/graph`, {
    token,
  });
}
