import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Settings,
  Sparkles,
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
  type PageBlock,
} from "./content.api";
import { createWorkspace, listWorkspaces } from "./workspace.api";

const starterBlocks: PageBlock[] = [
  {
    blockId: "block-1",
    type: "heading",
    content: "My first Microcosm page",
    properties: { level: 1 },
    position: 1000,
  },
  {
    blockId: "block-2",
    type: "paragraph",
    content: "Write notes here. Later, the Knowledge Layer will turn these blocks into embeddings for RAG.",
    properties: {},
    position: 2000,
  },
];

export function WorkspaceApp() {
  const queryClient = useQueryClient();
  const { accessToken, logout, user } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [pageTitleDraft, setPageTitleDraft] = useState("");

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => listWorkspaces(accessToken!),
    enabled: Boolean(accessToken),
  });

  const workspaces = workspacesQuery.data?.data.workspaces || [];

  useEffect(() => {
    if (!activeWorkspaceId && workspaces[0]) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [activeWorkspaceId, workspaces]);

  const notebooksQuery = useQuery({
    queryKey: ["notebooks", activeWorkspaceId],
    queryFn: () => listNotebooks(accessToken!, activeWorkspaceId!),
    enabled: Boolean(accessToken && activeWorkspaceId),
  });

  const notebooks = notebooksQuery.data?.data.notebooks || [];

  useEffect(() => {
    if (notebooks[0] && !notebooks.some((notebook) => notebook.id === activeNotebookId)) {
      setActiveNotebookId(notebooks[0].id);
    }
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

  const sections = sectionsQuery.data?.data.sections || [];

  useEffect(() => {
    if (sections[0] && !sections.some((section) => section.id === activeSectionId)) {
      setActiveSectionId(sections[0].id);
    }
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

  const pages = pagesQuery.data?.data.pages || [];

  useEffect(() => {
    if (pages[0] && !pages.some((page) => page.id === activePageId)) {
      setActivePageId(pages[0].id);
    }
    if (pages.length === 0) {
      setActivePageId(null);
    }
  }, [activePageId, pages]);

  const pageQuery = useQuery({
    queryKey: ["page", activePageId],
    queryFn: () => getPage(accessToken!, activePageId!),
    enabled: Boolean(accessToken && activePageId),
  });

  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const activeNotebook = notebooks.find((notebook) => notebook.id === activeNotebookId);
  const activeSection = sections.find((section) => section.id === activeSectionId);
  const activePage = pageQuery.data?.data.page;

  useEffect(() => {
    if (activePage) {
      setPageTitleDraft(activePage.title);
    }
  }, [activePage]);

  const createWorkspaceMutation = useMutation({
    mutationFn: () =>
      createWorkspace(accessToken!, {
        name: "My Knowledge",
        description: "Your first Microcosm workspace",
        icon: "sparkles",
      }),
    onSuccess: (result) => {
      setActiveWorkspaceId(result.data.workspace.id);
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const createNotebookMutation = useMutation({
    mutationFn: () =>
      createNotebook(accessToken!, activeWorkspaceId!, {
        title: "New Notebook",
        description: "A focused space for connected notes",
      }),
    onSuccess: (result) => {
      setActiveNotebookId(result.data.notebook.id);
      void queryClient.invalidateQueries({ queryKey: ["notebooks", activeWorkspaceId] });
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: () => createSection(accessToken!, activeNotebookId!, { title: "General" }),
    onSuccess: (result) => {
      setActiveSectionId(result.data.section.id);
      void queryClient.invalidateQueries({ queryKey: ["sections", activeNotebookId] });
    },
  });

  const createPageMutation = useMutation({
    mutationFn: () =>
      createPage(accessToken!, activeSectionId!, {
        title: "Untitled Page",
        emoji: "",
        blocks: starterBlocks,
      }),
    onSuccess: (result) => {
      setActivePageId(result.data.page.id);
      void queryClient.invalidateQueries({ queryKey: ["pages", activeSectionId] });
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: (input: { title?: string; blocks?: PageBlock[] }) => updatePage(accessToken!, activePageId!, input),
    onSuccess: (result) => {
      void queryClient.setQueryData(["page", activePageId], result);
      void queryClient.invalidateQueries({ queryKey: ["pages", activeSectionId] });
    },
  });

  const hierarchyState = useMemo(() => {
    if (workspacesQuery.isLoading) return "Loading your workspace...";
    if (workspaces.length === 0) return "Create a workspace to start writing.";
    if (notebooksQuery.isLoading) return "Loading notebooks...";
    if (notebooks.length === 0) return "Create your first notebook.";
    if (sectionsQuery.isLoading) return "Loading sections...";
    if (sections.length === 0) return "Create your first section.";
    if (pagesQuery.isLoading) return "Loading pages...";
    if (pages.length === 0) return "Create your first page.";
    return "Select a page to write.";
  }, [notebooks.length, notebooksQuery.isLoading, pages.length, pagesQuery.isLoading, sections.length, sectionsQuery.isLoading, workspaces.length, workspacesQuery.isLoading]);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <span className="brand-mark">&lt;Microcosm /&gt;</span>
          <button
            className="icon-button"
            aria-label="Create workspace"
            onClick={() => createWorkspaceMutation.mutate()}
            disabled={createWorkspaceMutation.isPending}
          >
            <Plus size={18} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Primary">
          <a className="nav-item active" href="#">
            <Home size={17} />
            Dashboard
          </a>
          <a className="nav-item" href="#">
            <Search size={17} />
            Search
          </a>
          <a className="nav-item" href="#">
            <Bot size={17} />
            Companion
          </a>
        </nav>

        <div className="sidebar-section">
          <div className="section-label">// workspaces</div>

          {workspacesQuery.isLoading ? <p className="sidebar-note">Loading workspaces...</p> : null}
          {workspacesQuery.isError ? <p className="sidebar-note error-text">Unable to load workspaces.</p> : null}

          {workspaces.length === 0 && !workspacesQuery.isLoading ? (
            <div className="empty-sidebar-state">
              <p>No workspaces yet.</p>
              <button onClick={() => createWorkspaceMutation.mutate()} disabled={createWorkspaceMutation.isPending}>
                Create starter workspace
              </button>
            </div>
          ) : null}

          {workspaces.map((workspace) => (
            <div className="workspace-tree" key={workspace.id}>
              <button
                className={workspace.id === activeWorkspaceId ? "tree-root active" : "tree-root"}
                onClick={() => {
                  setActiveWorkspaceId(workspace.id);
                  setActiveNotebookId(null);
                  setActiveSectionId(null);
                  setActivePageId(null);
                }}
              >
                <ChevronDown size={15} />
                {workspace.name}
              </button>
            </div>
          ))}
        </div>

        <div className="sidebar-section hierarchy-section">
          <div className="section-label">// notebooks</div>
          {activeWorkspaceId ? (
            <button
              className="mini-create-button"
              disabled={createNotebookMutation.isPending}
              onClick={() => createNotebookMutation.mutate()}
            >
              <Plus size={14} /> Notebook
            </button>
          ) : null}

          {notebooks.map((notebook) => (
            <div className="workspace-tree" key={notebook.id}>
              <button
                className={notebook.id === activeNotebookId ? "tree-root active" : "tree-root"}
                onClick={() => {
                  setActiveNotebookId(notebook.id);
                  setActiveSectionId(null);
                  setActivePageId(null);
                }}
              >
                <BookOpen size={15} />
                {notebook.title}
              </button>

              {notebook.id === activeNotebookId ? (
                <div className="tree-children">
                  <button
                    className="mini-create-button nested"
                    disabled={createSectionMutation.isPending}
                    onClick={() => createSectionMutation.mutate()}
                  >
                    <Plus size={14} /> Section
                  </button>
                  {sections.map((section) => (
                    <div key={section.id}>
                      <button
                        className={section.id === activeSectionId ? "tree-item active" : "tree-item"}
                        onClick={() => {
                          setActiveSectionId(section.id);
                          setActivePageId(null);
                        }}
                      >
                        <Folder size={15} />
                        {section.title}
                      </button>
                      {section.id === activeSectionId ? (
                        <div className="tree-pages">
                          <button
                            className="mini-create-button nested"
                            disabled={createPageMutation.isPending}
                            onClick={() => createPageMutation.mutate()}
                          >
                            <Plus size={14} /> Page
                          </button>
                          {pages.map((page) => (
                            <button
                              className={page.id === activePageId ? "tree-page active" : "tree-page"}
                              key={page.id}
                              onClick={() => setActivePageId(page.id)}
                            >
                              <FileText size={14} />
                              {page.title}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-chip">
            <span>{user?.name?.slice(0, 1).toUpperCase() || "M"}</span>
            <div>
              <strong>{user?.name || "Microcosm User"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <a className="nav-item" href="#">
            <Settings size={17} />
            Settings
          </a>
          <button className="nav-item nav-button" onClick={() => void logout()}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <div className="eyebrow">import {"{ Knowledge }"} from "@you/memory"</div>
            <h1>
              const <span>Microcosm</span>:
            </h1>
          </div>
          <button className="primary-button">
            <Sparkles size={17} />
            Ask Companion
          </button>
        </header>

        <div className="content-grid">
          <section className="editor-panel">
            <div className="page-meta">
              <span>{activeWorkspace?.name || "Workspace"}</span>
              <span>/</span>
              <span>{activeNotebook?.title || "Notebook"}</span>
              <span>/</span>
              <strong>{activePage?.title || "Page"}</strong>
            </div>

            {activePage ? (
              <>
                <div className="page-title-row">
                  <input
                    value={pageTitleDraft}
                    onChange={(event) => setPageTitleDraft(event.target.value)}
                    onBlur={() => {
                      if (pageTitleDraft.trim() && pageTitleDraft !== activePage.title) {
                        updatePageMutation.mutate({ title: pageTitleDraft.trim() });
                      }
                    }}
                    aria-label="Page title"
                  />
                  <span className={`knowledge-pill ${activePage.knowledgeStatus}`}>{activePage.knowledgeStatus}</span>
                </div>
                <MicrocosmEditor
                  blocks={activePage.blocks}
                  disabled={pageQuery.isLoading}
                  isSaving={updatePageMutation.isPending}
                  onSave={(blocks) => updatePageMutation.mutate({ blocks })}
                />
              </>
            ) : (
              <div className="editor-empty-state">
                <Sparkles size={22} />
                <h2>{hierarchyState}</h2>
                <p>Microcosm needs a workspace, notebook, section, and page before the editor can save knowledge blocks.</p>
                <div className="empty-actions">
                  {workspaces.length === 0 ? <button onClick={() => createWorkspaceMutation.mutate()}>Create workspace</button> : null}
                  {activeWorkspaceId && notebooks.length === 0 ? <button onClick={() => createNotebookMutation.mutate()}>Create notebook</button> : null}
                  {activeNotebookId && sections.length === 0 ? <button onClick={() => createSectionMutation.mutate()}>Create section</button> : null}
                  {activeSectionId && pages.length === 0 ? <button onClick={() => createPageMutation.mutate()}>Create page</button> : null}
                </div>
              </div>
            )}
          </section>

          <aside className="companion-panel">
            <div className="companion-header">
              <span>// companion</span>
              <span className="status-pill">ready</span>
            </div>

            <div className="ask-box">
              <Bot size={18} />
              <input placeholder="Ask from this workspace..." />
            </div>

            <section className="insight-card">
              <div className="card-kicker">
                <Sparkles size={15} />
                Today's insight
              </div>
              <p>
                Your editor now saves real blocks. The next AI milestone will index these blocks into the Knowledge Layer.
              </p>
            </section>

            <section className="companion-list">
              <h2>Context</h2>
              <button>
                <FileText size={16} />
                {activePage ? activePage.title : "No page selected"}
              </button>
              <button>
                <Layers3 size={16} />
                {activePage?.blocks.length || 0} saved blocks
              </button>
              <button>
                <Image size={16} />
                Image blocks coming next
              </button>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
