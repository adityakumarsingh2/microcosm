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
  Edit2,
  Trash2,
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

const emptyBlocks: PageBlock[] = [];

const onboardingBlocks: PageBlock[] = [
  {
    blockId: "block-welcome-1",
    type: "heading",
    content: "Getting Started with Microcosm 🚀",
    properties: { level: 1 },
    position: 1000,
  },
  {
    blockId: "block-welcome-2",
    type: "paragraph",
    content: "Welcome to your new knowledge base! Here's how to use the editor:",
    properties: {},
    position: 2000,
  },
  {
    blockId: "block-welcome-3",
    type: "paragraph",
    content: "1. Type anything to start writing.",
    properties: {},
    position: 3000,
  },
  {
    blockId: "block-welcome-4",
    type: "paragraph",
    content: "2. Highlight text to see the Bubble Menu for bold, italic, and code formatting.",
    properties: {},
    position: 4000,
  },
  {
    blockId: "block-welcome-5",
    type: "paragraph",
    content: "3. Press Enter on an empty line to see the Floating Menu, where you can insert checklists, quotes, and headings.",
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
          <Sparkles size={32} />
        </div>
        <h2>Welcome to Microcosm</h2>
        <p>Let's set up your first notebook. What would you like to call it?</p>
        <input 
          className="onboarding-input"
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          autoFocus 
          onKeyDown={(e) => e.key === "Enter" && onStart(name)}
          disabled={isPending}
        />
        <button 
          className="onboarding-button primary-button" 
          onClick={() => onStart(name)} 
          disabled={isPending}
        >
          {isPending ? "Setting up..." : "Get Started"}
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

  function startRenaming(id: string, currentTitle: string) {
    setRenamingItemId(id);
    setRenameDraft(currentTitle);
  }

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
        setActiveWorkspaceId(null);
        setActiveNotebookId(null);
        setActiveSectionId(null);
        setActivePageId(null);
      }
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: async (notebookName: string) => {
      const wsRes = await createWorkspace(accessToken!, {
        name: user?.name ? `${user.name}'s Knowledge` : "Primary Workspace",
        description: "Your primary workspace",
        icon: "sparkles",
      });
      const wsId = wsRes.data.workspace.id;

      const nbRes = await createNotebook(accessToken!, wsId, {
        title: notebookName || "Personal",
      });
      const nbId = nbRes.data.notebook.id;

      const secRes = await createSection(accessToken!, nbId, {
        title: "Home",
      });
      const secId = secRes.data.section.id;

      const pgRes = await createPage(accessToken!, secId, {
        title: "Getting Started 🚀",
        emoji: "🚀",
        blocks: onboardingBlocks,
      });
      const pgId = pgRes.data.page.id;

      return { wsId, nbId, secId, pgId };
    },
    onSuccess: (ids) => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setActiveWorkspaceId(ids.wsId);
      setActiveNotebookId(ids.nbId);
      setActiveSectionId(ids.secId);
      setActivePageId(ids.pgId);
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
        setActiveNotebookId(null);
        setActiveSectionId(null);
        setActivePageId(null);
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
      if (activeSectionId === deletedId) {
        setActiveSectionId(null);
        setActivePageId(null);
      }
    },
  });

  const createPageMutation = useMutation({
    mutationFn: () =>
      createPage(accessToken!, activeSectionId!, {
        title: "Untitled Page",
        emoji: "",
        blocks: emptyBlocks,
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

  const deletePageMutation = useMutation({
    mutationFn: (id: string) => deletePage(accessToken!, id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["pages", activeSectionId] });
      if (activePageId === deletedId) {
        setActivePageId(null);
      }
    },
  });

  const hierarchyState = useMemo(() => {
    if (workspacesQuery.isLoading) return "Loading your space...";
    if (workspaces.length === 0) return "Create a space to start writing.";
    if (notebooksQuery.isLoading) return "Loading notebooks...";
    if (notebooks.length === 0) return "Create your first notebook.";
    if (sectionsQuery.isLoading) return "Create a section inside this notebook.";
    if (sections.length === 0) return "Create a section inside this notebook.";
    if (pagesQuery.isLoading) return "Loading pages...";
    if (pages.length === 0) return "Create your first page.";
    return "Select a page to write.";
  }, [notebooks.length, notebooksQuery.isLoading, pages.length, pagesQuery.isLoading, sections.length, sectionsQuery.isLoading, workspaces.length, workspacesQuery.isLoading]);

  if (workspacesQuery.isSuccess && workspaces.length === 0) {
    return (
      <OnboardingOverlay 
        onStart={(name) => onboardingMutation.mutate(name)} 
        isPending={onboardingMutation.isPending} 
      />
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <span className="brand-mark">&lt;Microcosm /&gt;</span>
          <button
            className="icon-button subtle"
            aria-label="Create space"
            title="Create space"
            onClick={() => createWorkspaceMutation.mutate()}
            disabled={createWorkspaceMutation.isPending}
          >
            <Plus size={17} />
          </button>
        </div>

        <nav className="primary-nav" aria-label="Primary">
          <a className="nav-item active" href="#">
            <Home size={16} />
            Home
          </a>
          <a className="nav-item" href="#">
            <Search size={16} />
            Search
          </a>
          <a className="nav-item" href="#">
            <Bot size={16} />
            Companion
          </a>
        </nav>



        <div className="sidebar-section hierarchy-section">
          <div className="sidebar-section-head">
            <span className="section-label">// library</span>
            {activeWorkspaceId ? (
              <button
                className="sidebar-inline-action"
                aria-label="Create notebook"
                title="New notebook"
                disabled={createNotebookMutation.isPending}
                onClick={() => createNotebookMutation.mutate()}
              >
                <Plus size={13} />
              </button>
            ) : null}
          </div>

          {activeWorkspaceId && notebooks.length === 0 && !notebooksQuery.isLoading ? (
            <div className="empty-sidebar-state compact">
              <p>No notebooks in this space.</p>
              <button onClick={() => createNotebookMutation.mutate()} disabled={createNotebookMutation.isPending}>
                New notebook
              </button>
            </div>
          ) : null}

          <div className="library-tree">
            {notebooks.map((notebook) => (
              <div className="notebook-group" key={notebook.id}>
                <div className={notebook.id === activeNotebookId ? "notebook-row active" : "notebook-row"}>
                  <button
                    className="row-main-action"
                    onClick={() => {
                      setActiveNotebookId(notebook.id);
                      setActiveSectionId(null);
                      setActivePageId(null);
                    }}
                  >
                    <ChevronDown size={13} />
                    <BookOpen size={14} />
                    {renamingItemId === notebook.id ? (
                      <input
                        autoFocus
                        className="inline-rename-input"
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => setRenamingItemId(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && renameDraft.trim()) {
                            updateNotebookMutation.mutate({ title: renameDraft.trim() });
                          }
                          if (e.key === "Escape") setRenamingItemId(null);
                        }}
                      />
                    ) : (
                      <span>{notebook.title}</span>
                    )}
                  </button>
                  <button
                    className="inline-edit-action"
                    title="Rename"
                    onClick={() => startRenaming(notebook.id, notebook.title)}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="inline-delete-action"
                    title="Delete"
                    disabled={deleteNotebookMutation.isPending}
                    onClick={() => {
                      if (window.confirm("Delete this notebook?")) deleteNotebookMutation.mutate(notebook.id);
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                  {notebook.id === activeNotebookId ? (
                    <button
                      className="inline-create-action"
                      aria-label="New section"
                      title="New section"
                      disabled={createSectionMutation.isPending}
                      onClick={() => createSectionMutation.mutate()}
                    >
                      <Plus size={13} />
                    </button>
                  ) : null}
                </div>

                {notebook.id === activeNotebookId ? (
                  <div className="section-list">
                    {sections.map((section) => (
                      <div className="section-group" key={section.id}>
                        <div className={section.id === activeSectionId ? "section-row active" : "section-row"}>
                          <button
                            className="row-main-action"
                            onClick={() => {
                              setActiveSectionId(section.id);
                              setActivePageId(null);
                            }}
                          >
                            <Folder size={13} />
                            {renamingItemId === section.id ? (
                              <input
                                autoFocus
                                className="inline-rename-input"
                                value={renameDraft}
                                onChange={(e) => setRenameDraft(e.target.value)}
                                onBlur={() => setRenamingItemId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && renameDraft.trim()) {
                                    updateSectionMutation.mutate({ title: renameDraft.trim() });
                                  }
                                  if (e.key === "Escape") setRenamingItemId(null);
                                }}
                              />
                            ) : (
                              <span>{section.title}</span>
                            )}
                          </button>
                          <button
                            className="inline-edit-action"
                            title="Rename"
                            onClick={() => startRenaming(section.id, section.title)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="inline-delete-action"
                            title="Delete"
                            disabled={deleteSectionMutation.isPending}
                            onClick={() => {
                              if (window.confirm("Delete this section?")) deleteSectionMutation.mutate(section.id);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                          {section.id === activeSectionId ? (
                            <button
                              className="inline-create-action"
                              aria-label="New page"
                              title="New page"
                              disabled={createPageMutation.isPending}
                              onClick={() => createPageMutation.mutate()}
                            >
                              <Plus size={13} />
                            </button>
                          ) : null}
                        </div>

                        {section.id === activeSectionId ? (
                          <div className="page-list">
                            {pages.map((page) => (
                              <div
                                className={page.id === activePageId ? "page-row active" : "page-row"}
                                key={page.id}
                              >
                                <button
                                  className="row-main-action"
                                  onClick={() => setActivePageId(page.id)}
                                >
                                  <FileText size={13} />
                                  <span>{page.title}</span>
                                </button>
                                <button
                                  className="inline-delete-action"
                                  title="Delete"
                                  disabled={deletePageMutation.isPending}
                                  onClick={() => {
                                    if (window.confirm("Delete this page?")) deletePageMutation.mutate(page.id);
                                  }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
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
        </div>

        <div className="sidebar-footer">
          <div className="user-chip refined">
            <span>{user?.name?.slice(0, 1).toUpperCase() || "M"}</span>
            <div>
              <strong>{user?.name || "Microcosm User"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
          <a className="nav-item" href="#">
            <Settings size={16} />
            Settings
          </a>
          <button className="nav-item nav-button" onClick={() => void logout()}>
            <LogOut size={16} />
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
              <span>{activeWorkspace?.name || "Space"}</span>
              <span>/</span>
              <span>{activeNotebook?.title || "Notebook"}</span>
              <span>/</span>
              <strong>{activePage?.title || "Page"}</strong>
            </div>

            {activePage ? (
              <MicrocosmEditor
                key={activePage.id}
                blocks={activePage.blocks}
                disabled={pageQuery.isLoading}
                isSaving={updatePageMutation.isPending}
                knowledgeStatus={activePage.knowledgeStatus}
                onSave={(blocks) => {
                  const firstBlock = blocks.length > 0 ? blocks[0] : null;
                  const newTitle = firstBlock && firstBlock.content ? firstBlock.content.trim() : "Untitled Page";
                  updatePageMutation.mutate({ title: newTitle, blocks });
                }}
              />
            ) : (
              <div className="editor-empty-state">
                <Sparkles size={22} />
                <h2>{hierarchyState}</h2>
                <p>Microcosm needs a space, notebook, section, and page before the editor can save knowledge blocks.</p>
                <div className="empty-actions">
                  {workspaces.length === 0 ? <button onClick={() => createWorkspaceMutation.mutate()}>Create space</button> : null}
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
              <input placeholder="Ask from this space..." />
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
