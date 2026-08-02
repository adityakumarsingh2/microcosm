import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Bot,
  ChevronDown,
  FileText,
  Folder,
  Home,
  Image,
  Layers3,
  LogOut,
  Plus,
  Search,
  SendHorizontal,
  Settings,
  Sparkles,
  Edit2,
  Trash2,
  Zap,
  Copy,
  PlusSquare,
  RotateCcw,
  Check,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { MicrocosmEditor } from "../editor/MicrocosmEditor";
import {
  createNotebook,
  createPage,
  createSection,
  getPage,
  listNotebooks,
  listPages,
  listSections,
  updatePage,
  updateNotebook,
  deleteNotebook,
  updateSection,
  deleteSection,
  deletePage,
  type PageBlock,
} from "./content.api";
import { createWorkspace, listWorkspaces, updateWorkspace, deleteWorkspace } from "./workspace.api";
import { chatWithCompanion } from "./companion.api";
import type { Source } from "./companion.api";
import { CitationBadge } from "./CitationBadge";
import { listDocuments, uploadDocument, deleteDocument } from "../documents/document.api";

const emptyBlocks: PageBlock[] = [];

const onboardingBlocks: PageBlock[] = [
  {
    blockId: "block-welcome-1",
    type: "heading",
    content: "Getting Started with Microcosm",
    properties: { level: 1 },
    position: 1000,
  },
  {
    blockId: "block-welcome-2",
    type: "paragraph",
    content: "Welcome to your new knowledge base. Here's how to use the editor:",
    properties: {},
    position: 2000,
  },
  {
    blockId: "block-welcome-3",
    type: "paragraph",
    content: "Type '/' on any empty line to open the command menu — insert headings, quotes, code blocks, checklists, and images.",
    properties: {},
    position: 3000,
  },
  {
    blockId: "block-welcome-4",
    type: "paragraph",
    content: "Select any text to reveal the bubble menu for bold, italic, strikethrough, and inline code formatting.",
    properties: {},
    position: 4000,
  },
  {
    blockId: "block-welcome-5",
    type: "paragraph",
    content: "Your notes auto-save as you write. Ask the AI Companion anything about your notes from the panel on the right.",
    properties: {},
    position: 5000,
  },
];

function OnboardingOverlay({ onStart, isPending }: { onStart: (name: string) => void; isPending: boolean }) {
  const [name, setName] = useState("Personal");
  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-icon">
          <Sparkles size={26} />
        </div>
        <h2>Welcome to Microcosm</h2>
        <p>Let's set up your first notebook. What area of knowledge will you start with?</p>
        <input
          className="onboarding-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && !isPending && onStart(name)}
          disabled={isPending}
          placeholder="e.g. Personal, Engineering, Research…"
        />
        <button
          className="primary-button onboarding-button"
          onClick={() => onStart(name)}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <span>Setting up...</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>Get Started</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function WorkspaceApp() {
  const queryClient = useQueryClient();
  const { accessToken, logout, user } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  // Companion state
  const [chatScope, setChatScope] = useState<"workspace" | "notebook" | "page">("workspace");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string; sources?: Source[] }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [insertedMessageIndex, setInsertedMessageIndex] = useState<number | null>(null);

  const handleCopyMessage = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageIndex(index);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  const handleInsertMessage = (text: string, index: number) => {
    window.dispatchEvent(new CustomEvent("insert-ai-text", { detail: { text } }));
    setInsertedMessageIndex(index);
    setTimeout(() => setInsertedMessageIndex(null), 2000);
  };

  useEffect(() => {
    if (!activePageId && chatScope === "page") {
      setChatScope("workspace");
    }
  }, [activePageId, chatScope]);

  useEffect(() => {
    if (!activeNotebookId && chatScope === "notebook") {
      setChatScope("workspace");
    }
  }, [activeNotebookId, chatScope]);

  const suggestions = useMemo(() => {
    if (chatScope === "page") {
      return [
        { label: "Summarize this page", icon: <FileText size={12} /> },
        { label: "Find key concepts", icon: <Sparkles size={12} /> },
        { label: "Create a study quiz from this page", icon: <Bot size={12} /> },
      ];
    }
    if (chatScope === "notebook") {
      return [
        { label: "Summarize this notebook", icon: <BookOpen size={12} /> },
        { label: "Find connections across pages", icon: <Sparkles size={12} /> },
        { label: "What are the action items here?", icon: <Bot size={12} /> },
      ];
    }
    return [
      { label: "Explain my recent notes", icon: <FileText size={12} /> },
      { label: "What did I write about this week?", icon: <Sparkles size={12} /> },
      { label: "What are the key insights in my space?", icon: <Bot size={12} /> },
    ];
  }, [chatScope]);

  // Document state & upload logic
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentsQuery = useQuery({
    queryKey: ["documents", activeWorkspaceId],
    queryFn: () => listDocuments(accessToken!, activeWorkspaceId!),
    enabled: Boolean(accessToken && activeWorkspaceId),
    refetchInterval: (query) => {
      const docs = query.state.data?.data.documents ?? [];
      const hasPending = docs.some(
        (d) => d.status === "pending" || d.status === "processing"
      );
      return hasPending ? 3000 : false;
    },
  });
  const documents = documentsQuery.data?.data.documents ?? [];

  const uploadDocumentMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(accessToken!, activeWorkspaceId!, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents", activeWorkspaceId] });
    },
    onError: (err) => {
      alert(`Failed to upload document: ${err instanceof Error ? err.message : "unknown error"}`);
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(accessToken!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["documents", activeWorkspaceId] });
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Only PDF files are supported.");
      return;
    }
    uploadDocumentMutation.mutate(file);
    e.target.value = ""; // clear file select
  }

  function startRenaming(id: string, currentTitle: string) {
    setRenamingItemId(id);
    setRenameDraft(currentTitle);
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => listWorkspaces(accessToken!),
    enabled: Boolean(accessToken),
  });

  const workspaces = workspacesQuery.data?.data.workspaces ?? [];

  useEffect(() => {
    if (!activeWorkspaceId && workspaces[0]) setActiveWorkspaceId(workspaces[0].id);
  }, [activeWorkspaceId, workspaces]);

  const notebooksQuery = useQuery({
    queryKey: ["notebooks", activeWorkspaceId],
    queryFn: () => listNotebooks(accessToken!, activeWorkspaceId!),
    enabled: Boolean(accessToken && activeWorkspaceId),
  });

  const notebooks = notebooksQuery.data?.data.notebooks ?? [];

  useEffect(() => {
    if (notebooks[0] && !notebooks.some((n) => n.id === activeNotebookId))
      setActiveNotebookId(notebooks[0].id);
    if (notebooks.length === 0) {
      setActiveNotebookId(null);
      setActiveSectionId(null);
      setActivePageId(null);
    }
  }, [activeNotebookId, notebooks]);

  const sectionsQuery = useQuery({
    queryKey: ["sections", activeNotebookId],
    queryFn: () => listSections(accessToken!, activeNotebookId!),
    enabled: Boolean(accessToken && activeNotebookId),
  });

  const sections = sectionsQuery.data?.data.sections ?? [];

  useEffect(() => {
    if (sections[0] && !sections.some((s) => s.id === activeSectionId))
      setActiveSectionId(sections[0].id);
    if (sections.length === 0) {
      setActiveSectionId(null);
      setActivePageId(null);
    }
  }, [activeSectionId, sections]);

  const pagesQuery = useQuery({
    queryKey: ["pages", activeSectionId],
    queryFn: () => listPages(accessToken!, activeSectionId!),
    enabled: Boolean(accessToken && activeSectionId),
  });

  const pages = pagesQuery.data?.data.pages ?? [];

  useEffect(() => {
    if (pages[0] && !pages.some((p) => p.id === activePageId)) setActivePageId(pages[0].id);
    if (pages.length === 0) setActivePageId(null);
  }, [activePageId, pages]);

  const pageQuery = useQuery({
    queryKey: ["page", activePageId],
    queryFn: () => getPage(accessToken!, activePageId!),
    enabled: Boolean(accessToken && activePageId),
  });

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const activeNotebook  = notebooks.find((n) => n.id === activeNotebookId);
  const activeSection   = sections.find((s) => s.id === activeSectionId);
  const activePage      = pageQuery.data?.data.page;

  // ── Chat ──────────────────────────────────────────────────────────────────

  const chatMutation = useMutation({
    mutationFn: (prompt: string) =>
      chatWithCompanion({
        token: accessToken!,
        prompt,
        workspaceId: activeWorkspaceId ?? undefined,
        scope: chatScope,
        notebookId: chatScope === "notebook" ? activeNotebookId ?? undefined : undefined,
        pageId: chatScope === "page" ? activePageId ?? undefined : undefined,
      }).then((r) => r.data),
    onSuccess: (data) => {
      setChatHistory((prev) => [...prev, { role: "ai", content: data.response, sources: data.sources }]);
    },
    onError: (err) => {
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", content: `Something went wrong: ${err instanceof Error ? err.message : "unknown error"}`, sources: [] },
      ]);
    },
  });

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, chatMutation.isPending]);

  function handleSendChat() {
    const prompt = chatInput.trim();
    if (!prompt || chatMutation.isPending) return;
    setChatHistory((prev) => [...prev, { role: "user", content: prompt }]);
    chatMutation.mutate(prompt);
    setChatInput("");
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createWorkspaceMutation = useMutation({
    mutationFn: () =>
      createWorkspace(accessToken!, { name: "My Knowledge", description: "Your first Microcosm workspace", icon: "sparkles" }),
    onSuccess: (result) => {
      setActiveWorkspaceId(result.data.workspace.id);
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: (input: { name: string }) => updateWorkspace(accessToken!, renamingItemId!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setRenamingItemId(null);
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (id: string) => deleteWorkspace(accessToken!, id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      if (activeWorkspaceId === deletedId) {
        setActiveWorkspaceId(null); setActiveNotebookId(null);
        setActiveSectionId(null);   setActivePageId(null);
      }
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: async (notebookName: string) => {
      const wsRes  = await createWorkspace(accessToken!, {
        name: user?.name ? `${user.name}'s Knowledge` : "Primary Workspace",
        description: "Your primary workspace", icon: "sparkles",
      });
      const wsId   = wsRes.data.workspace.id;
      const nbRes  = await createNotebook(accessToken!, wsId, { title: notebookName || "Personal" });
      const nbId   = nbRes.data.notebook.id;
      const secRes = await createSection(accessToken!, nbId, { title: "Home" });
      const secId  = secRes.data.section.id;
      const pgRes  = await createPage(accessToken!, secId, {
        title: "Getting Started", emoji: "🚀", blocks: onboardingBlocks,
      });
      return { wsId, nbId, secId, pgId: pgRes.data.page.id };
    },
    onSuccess: (ids) => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setActiveWorkspaceId(ids.wsId); setActiveNotebookId(ids.nbId);
      setActiveSectionId(ids.secId);  setActivePageId(ids.pgId);
    },
  });

  const createNotebookMutation = useMutation({
    mutationFn: () => createNotebook(accessToken!, activeWorkspaceId!, { title: "New Notebook" }),
    onSuccess: (result) => {
      setActiveNotebookId(result.data.notebook.id);
      void queryClient.invalidateQueries({ queryKey: ["notebooks", activeWorkspaceId] });
    },
  });

  const updateNotebookMutation = useMutation({
    mutationFn: (input: { title: string }) => updateNotebook(accessToken!, renamingItemId!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notebooks", activeWorkspaceId] });
      setRenamingItemId(null);
    },
  });

  const deleteNotebookMutation = useMutation({
    mutationFn: (id: string) => deleteNotebook(accessToken!, id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["notebooks", activeWorkspaceId] });
      if (activeNotebookId === deletedId) {
        setActiveNotebookId(null); setActiveSectionId(null); setActivePageId(null);
      }
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: () => createSection(accessToken!, activeNotebookId!, { title: "New Section" }),
    onSuccess: (result) => {
      setActiveSectionId(result.data.section.id);
      void queryClient.invalidateQueries({ queryKey: ["sections", activeNotebookId] });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: (input: { title: string }) => updateSection(accessToken!, renamingItemId!, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sections", activeNotebookId] });
      setRenamingItemId(null);
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => deleteSection(accessToken!, id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["sections", activeNotebookId] });
      if (activeSectionId === deletedId) { setActiveSectionId(null); setActivePageId(null); }
    },
  });

  const createPageMutation = useMutation({
    mutationFn: () =>
      createPage(accessToken!, activeSectionId!, { title: "Untitled Page", emoji: "", blocks: emptyBlocks }),
    onSuccess: (result) => {
      setActivePageId(result.data.page.id);
      void queryClient.invalidateQueries({ queryKey: ["pages", activeSectionId] });
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: (input: { title?: string; blocks?: PageBlock[] }) =>
      updatePage(accessToken!, activePageId!, input),
    onSuccess: (result) => {
      void queryClient.setQueryData(["page", activePageId], result);
      void queryClient.invalidateQueries({ queryKey: ["pages", activeSectionId] });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (id: string) => deletePage(accessToken!, id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["pages", activeSectionId] });
      if (activePageId === deletedId) setActivePageId(null);
    },
  });

  // ── Derived state ─────────────────────────────────────────────────────────

  const hierarchyState = useMemo(() => {
    if (workspacesQuery.isLoading) return "Loading your space…";
    if (workspaces.length === 0) return "Create a space to start writing.";
    if (notebooksQuery.isLoading) return "Loading notebooks…";
    if (notebooks.length === 0) return "Create your first notebook.";
    if (sectionsQuery.isLoading || sections.length === 0) return "Create a section inside this notebook.";
    if (pagesQuery.isLoading) return "Loading pages…";
    if (pages.length === 0) return "Create your first page.";
    return "Select a page to start writing.";
  }, [notebooks.length, notebooksQuery.isLoading, pages.length, pagesQuery.isLoading,
      sections.length, sectionsQuery.isLoading, workspaces.length, workspacesQuery.isLoading]);

  // ── Onboarding gate ───────────────────────────────────────────────────────

  if (workspacesQuery.isSuccess && workspaces.length === 0) {
    return (
      <OnboardingOverlay
        onStart={(name) => onboardingMutation.mutate(name)}
        isPending={onboardingMutation.isPending}
      />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="app-shell">

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <aside className="sidebar">

        {/* Brand */}
        <div className="brand-row">
          <span className="brand-mark">&lt;Microcosm /&gt;</span>
          <button
            className="icon-button"
            aria-label="New space"
            title="New space"
            onClick={() => createWorkspaceMutation.mutate()}
            disabled={createWorkspaceMutation.isPending}
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Primary nav */}
        <nav className="primary-nav" aria-label="Primary">
          <a className="nav-item active" href="#">
            <Home size={15} /> Home
          </a>
          <a className="nav-item" href="#">
            <Search size={15} /> Search
          </a>
          <a className="nav-item" href="#">
            <Bot size={15} /> Companion
          </a>
        </nav>

        {/* Library */}
        <div className="sidebar-section hierarchy-section">
          <div className="sidebar-section-head">
            <span className="section-label">// library</span>
            {activeWorkspaceId && (
              <button
                className="sidebar-inline-action"
                aria-label="New notebook"
                title="New notebook"
                disabled={createNotebookMutation.isPending}
                onClick={() => createNotebookMutation.mutate()}
              >
                <Plus size={11} />
              </button>
            )}
          </div>

          {activeWorkspaceId && notebooks.length === 0 && !notebooksQuery.isLoading && (
            <div className="empty-sidebar-state compact">
              <p>No notebooks yet.</p>
              <button onClick={() => createNotebookMutation.mutate()} disabled={createNotebookMutation.isPending}>
                + New notebook
              </button>
            </div>
          )}

          <div className="library-tree">
            {notebooks.map((notebook) => (
              <div className="notebook-group" key={notebook.id}>

                {/* Notebook row */}
                <div className={`notebook-row${notebook.id === activeNotebookId ? " active" : ""}`}>
                  <button
                    className="row-main-action"
                    onClick={() => {
                      setActiveNotebookId(notebook.id);
                      setActiveSectionId(null);
                      setActivePageId(null);
                    }}
                  >
                    <ChevronDown
                      size={12}
                      style={{
                        transition: "transform 180ms ease",
                        transform: notebook.id === activeNotebookId ? "rotate(0deg)" : "rotate(-90deg)",
                        flexShrink: 0,
                      }}
                    />
                    <BookOpen size={13} style={{ flexShrink: 0 }} />
                    {renamingItemId === notebook.id ? (
                      <input
                        autoFocus
                        className="inline-rename-input"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => setRenamingItemId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && renameDraft.trim())
                            updateNotebookMutation.mutate({ title: renameDraft.trim() });
                          if (e.key === "Escape") setRenamingItemId(null);
                        }}
                      />
                    ) : (
                      <span>{notebook.title}</span>
                    )}
                  </button>
                  <button className="inline-edit-action" title="Rename"
                    onClick={() => startRenaming(notebook.id, notebook.title)}>
                    <Edit2 size={11} />
                  </button>
                  <button className="inline-delete-action" title="Delete"
                    disabled={deleteNotebookMutation.isPending}
                    onClick={() => { if (window.confirm("Delete this notebook and all its contents?")) deleteNotebookMutation.mutate(notebook.id); }}>
                    <Trash2 size={11} />
                  </button>
                  {notebook.id === activeNotebookId && (
                    <button className="inline-create-action" title="New section"
                      disabled={createSectionMutation.isPending}
                      onClick={() => createSectionMutation.mutate()}>
                      <Plus size={11} />
                    </button>
                  )}
                </div>

                {/* Sections */}
                {notebook.id === activeNotebookId && (
                  <div className="section-list">
                    {sections.map((section) => (
                      <div className="section-group" key={section.id}>
                        <div className={`section-row${section.id === activeSectionId ? " active" : ""}`}>
                          <button
                            className="row-main-action"
                            onClick={() => { setActiveSectionId(section.id); setActivePageId(null); }}
                          >
                            <Folder size={12} style={{ flexShrink: 0 }} />
                            {renamingItemId === section.id ? (
                              <input
                                autoFocus
                                className="inline-rename-input"
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onBlur={() => setRenamingItemId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && renameDraft.trim())
                                    updateSectionMutation.mutate({ title: renameDraft.trim() });
                                  if (e.key === "Escape") setRenamingItemId(null);
                                }}
                              />
                            ) : (
                              <span>{section.title}</span>
                            )}
                          </button>
                          <button className="inline-edit-action" title="Rename"
                            onClick={() => startRenaming(section.id, section.title)}>
                            <Edit2 size={11} />
                          </button>
                          <button className="inline-delete-action" title="Delete"
                            disabled={deleteSectionMutation.isPending}
                            onClick={() => { if (window.confirm("Delete this section?")) deleteSectionMutation.mutate(section.id); }}>
                            <Trash2 size={11} />
                          </button>
                          {section.id === activeSectionId && (
                            <button className="inline-create-action" title="New page"
                              disabled={createPageMutation.isPending}
                              onClick={() => createPageMutation.mutate()}>
                              <Plus size={11} />
                            </button>
                          )}
                        </div>

                        {/* Pages */}
                        {section.id === activeSectionId && (
                          <div className="page-list">
                            {pages.map((page) => (
                              <div className={`page-row${page.id === activePageId ? " active" : ""}`} key={page.id}>
                                <button className="row-main-action" onClick={() => setActivePageId(page.id)}>
                                  <FileText size={11} style={{ flexShrink: 0 }} />
                                  <span>{page.title}</span>
                                </button>
                                <button className="inline-delete-action" title="Delete"
                                  disabled={deletePageMutation.isPending}
                                  onClick={() => { if (window.confirm("Delete this page?")) deletePageMutation.mutate(page.id); }}>
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Documents */}
        <div className="sidebar-section hierarchy-section" style={{ marginTop: "16px", borderTop: "1.5px solid var(--border-strong)", paddingTop: "14px" }}>
          <div className="sidebar-section-head">
            <span className="section-label">// documents</span>
            {activeWorkspaceId && (
              <button
                className="sidebar-inline-action"
                aria-label="Upload document"
                title="Upload PDF document"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadDocumentMutation.isPending}
              >
                <Plus size={11} />
              </button>
            )}
          </div>

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".pdf"
            onChange={handleFileChange}
          />

          {activeWorkspaceId && documents.length === 0 && !documentsQuery.isLoading && (
            <div className="empty-sidebar-state compact">
              <p>No documents yet.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadDocumentMutation.isPending}
                style={{
                  fontSize: "0.7rem",
                  padding: "3px 8px",
                  border: "1.5px solid var(--border-strong)",
                  borderRadius: "4px",
                  background: "var(--bg-soft)",
                  cursor: "pointer",
                  color: "var(--text-2)"
                }}
              >
                + Upload PDF
              </button>
            </div>
          )}

          {activeWorkspaceId && (
            <div className="sidebar-tree" style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
              {documentsQuery.isLoading && <div className="empty-sidebar-state compact"><p>Loading docs…</p></div>}
              {documents.map((doc) => (
                <div
                  className="document-row"
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 8px",
                    fontSize: "0.78rem",
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-2)",
                    border: "1.5px solid var(--border-strong)",
                    borderRadius: "6px",
                    background: "var(--bg-soft)",
                    boxShadow: "1.5px 1.5px 0px 0px var(--border-strong)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: 0 }}>
                    <FileText size={11} style={{ flexShrink: 0, color: "var(--dim)" }} />
                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={doc.title}>
                      {doc.title}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "4px" }}>
                    {doc.status === "pending" || doc.status === "processing" ? (
                      <span className="neo-status generating" style={{ fontSize: "0.55rem", padding: "1px 4px" }}>
                        syncing
                      </span>
                    ) : doc.status === "indexed" ? (
                      <span className="neo-status" style={{ fontSize: "0.55rem", padding: "1px 4px", color: "#4ade80", borderColor: "#22c55e" }}>
                        ready
                      </span>
                    ) : (
                      <span className="neo-status" style={{ fontSize: "0.55rem", padding: "1px 4px", color: "#ef4444", borderColor: "#ef4444" }}>
                        failed
                      </span>
                    )}
                    <button
                      className="inline-delete-action"
                      style={{ background: "transparent", border: "none", color: "var(--dim)", padding: 0, cursor: "pointer", display: "grid", placeItems: "center" }}
                      title="Delete document"
                      onClick={() => { if (window.confirm("Delete this document?")) deleteDocumentMutation.mutate(doc.id); }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-chip refined">
            <span>{user?.name?.slice(0, 1).toUpperCase() ?? "M"}</span>
            <div>
              <strong>{user?.name ?? "Microcosm User"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <a className="nav-item" href="#"><Settings size={14} /> Settings</a>
          <button className="nav-item nav-button" onClick={() => void logout()}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* ── WORKSPACE ───────────────────────────────────────────────────── */}
      <section className="workspace">

        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <p className="eyebrow">import {"{ Knowledge }"} from "@you/memory"</p>
            <h1 className="topbar-title">
              {activeWorkspace?.name
                ? <><span>{activeWorkspace.name}</span></>
                : <><span>Microcosm</span></>}
            </h1>
          </div>
          <button className="primary-button">
            <Sparkles size={15} />
            Ask Companion
          </button>
        </header>

        <div className="content-grid">

          {/* ── EDITOR PANEL ──────────────────────────────────────────── */}
          <div className="editor-panel">
            {activePage ? (
              <>
                <div className="page-meta">
                  <span>{activeWorkspace?.name ?? "Space"}</span>
                  <span className="page-meta-sep">›</span>
                  <span>{activeNotebook?.title ?? "Notebook"}</span>
                  <span className="page-meta-sep">›</span>
                  <span>{activeSection?.title ?? "Section"}</span>
                  <span className="page-meta-sep">›</span>
                  <strong>{activePage.title}</strong>
                </div>
                <MicrocosmEditor
                  key={activePage.id}
                  blocks={activePage.blocks}
                  disabled={pageQuery.isLoading}
                  isSaving={updatePageMutation.isPending}
                  knowledgeStatus={activePage.knowledgeStatus}
                  onSave={(blocks) => {
                    const firstBlock = blocks[0];
                    const newTitle =
                      firstBlock && typeof firstBlock.content === "string" && firstBlock.content.trim()
                        ? firstBlock.content.trim()
                        : "Untitled Page";
                    updatePageMutation.mutate({ title: newTitle, blocks });
                  }}
                />
              </>
            ) : (
              <div className="editor-empty-state">
                <Sparkles size={28} />
                <h2>{hierarchyState}</h2>
                <p>
                  Microcosm needs a space, notebook, section, and page before the editor can save knowledge blocks.
                </p>
                <div className="empty-actions">
                  {workspaces.length === 0 && (
                    <button onClick={() => createWorkspaceMutation.mutate()} disabled={createWorkspaceMutation.isPending}>
                      <Plus size={13} /> Create space
                    </button>
                  )}
                  {activeWorkspaceId && notebooks.length === 0 && (
                    <button onClick={() => createNotebookMutation.mutate()} disabled={createNotebookMutation.isPending}>
                      <Plus size={13} /> Create notebook
                    </button>
                  )}
                  {activeNotebookId && sections.length === 0 && (
                    <button onClick={() => createSectionMutation.mutate()} disabled={createSectionMutation.isPending}>
                      <Plus size={13} /> Create section
                    </button>
                  )}
                  {activeSectionId && pages.length === 0 && (
                    <button onClick={() => createPageMutation.mutate()} disabled={createPageMutation.isPending}>
                      <Plus size={13} /> Create page
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── AI COMPANION ──────────────────────────────────────────── */}
          <aside className="neo-panel">

            {/* Header */}
            <div className="neo-header">
              <div className="neo-header-title">
                <Zap size={13} />
                AI Companion
              </div>
              <div className="neo-header-right">
                {chatHistory.length > 0 && (
                  <button
                    className="neo-clear-btn"
                    onClick={() => setChatHistory([])}
                    title="Clear chat history"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
                <span className={`neo-status${chatMutation.isPending ? " generating" : ""}`}>
                  {chatMutation.isPending ? "Generating" : "Ready"}
                </span>
              </div>
            </div>

            {/* Scope Selector segmented control */}
            <div className="neo-scope-selector">
              <button
                className={`neo-scope-btn ${chatScope === "workspace" ? "active" : ""}`}
                onClick={() => setChatScope("workspace")}
              >
                <Layers3 size={11} />
                Workspace
              </button>
              <button
                className={`neo-scope-btn ${chatScope === "notebook" ? "active" : ""}`}
                disabled={!activeNotebookId}
                onClick={() => setChatScope("notebook")}
                title={!activeNotebookId ? "No notebook selected" : `Search Notebook: ${activeNotebook?.title}`}
              >
                <BookOpen size={11} />
                Notebook
              </button>
              <button
                className={`neo-scope-btn ${chatScope === "page" ? "active" : ""}`}
                disabled={!activePageId}
                onClick={() => setChatScope("page")}
                title={!activePageId ? "No page open" : `Search Page: ${activePage?.title}`}
              >
                <FileText size={11} />
                Page
              </button>
            </div>

            {/* Chat history */}
            <div className="neo-chat-history">
              {chatHistory.length === 0 && (
                <div className="neo-welcome">
                  <div className="neo-welcome-msg">
                    <div className="neo-ai-label"><Bot size={12} /> Assistant</div>
                    Hi! I'm your AI Companion. Ask me anything about your {chatScope === "workspace" ? "workspace" : chatScope === "notebook" ? "active notebook" : "active page"}.
                  </div>

                  <span className="neo-suggestions-label">
                    <Sparkles size={11} /> Suggested
                  </span>

                  <div className="neo-chips">
                    {suggestions.map((sug) => (
                      <motion.button
                        key={sug.label}
                        className="neo-chip"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        onClick={() => {
                          setChatInput(sug.label);
                          setTimeout(() => document.getElementById("neo-input")?.focus(), 30);
                        }}
                      >
                        <span className="neo-chip-icon">{sug.icon}</span>
                        {sug.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <AnimatePresence initial={false}>
                {chatHistory.map((msg, i) => (
                  <motion.div
                    key={i}
                    className={`neo-bubble ${msg.role}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {msg.role === "ai" && (
                      <div className="neo-ai-meta">
                        <div className="neo-ai-label"><Bot size={12} /> Assistant</div>
                        <div className="neo-msg-actions">
                          <button
                            className="neo-action-btn"
                            onClick={() => handleCopyMessage(msg.content, i)}
                            title="Copy response"
                          >
                            {copiedMessageIndex === i ? <Check size={11} /> : <Copy size={11} />}
                          </button>
                          {activePageId && (
                            <button
                              className="neo-action-btn"
                              onClick={() => handleInsertMessage(msg.content, i)}
                              title="Insert into page"
                            >
                              {insertedMessageIndex === i ? <Check size={11} style={{ color: "#4ade80" }} /> : <PlusSquare size={11} />}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {msg.role === "user" ? (
                      msg.content
                    ) : (
                      <>
                        <ReactMarkdown className="markdown-prose">{msg.content}</ReactMarkdown>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="citation-list">
                            <span className="citation-list-label">Sources</span>
                            {msg.sources.map((source, si) => (
                              <CitationBadge key={source.pageId} source={source} index={si + 1} />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {chatMutation.isPending && (
                <motion.div
                  className="neo-thinking"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="neo-ai-label" style={{ margin: 0 }}><Bot size={12} /></div>
                  <div className="neo-thinking-dots">
                    <span /><span /><span />
                  </div>
                </motion.div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="neo-input-wrap">
              <div className="neo-input-row">
                <input
                  id="neo-input"
                  placeholder={`Ask from this ${chatScope}…`}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                  disabled={chatMutation.isPending}
                />
                <button
                  className="neo-send-btn"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || chatMutation.isPending}
                  aria-label="Send"
                >
                  <SendHorizontal size={14} />
                </button>
              </div>
            </div>

          </aside>
        </div>
      </section>
    </main>
  );
}
