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
