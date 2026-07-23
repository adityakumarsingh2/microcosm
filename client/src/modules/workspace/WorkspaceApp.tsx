import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Bot,
  ChevronDown,
  FileText,
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
import { createWorkspace, listWorkspaces } from "./workspace.api";

const fallbackNotebooks = [
  { name: "Operating Systems", active: true },
  { name: "DBMS", active: false },
  { name: "Machine Learning", active: false },
];

export function WorkspaceApp() {
  const queryClient = useQueryClient();
  const { accessToken, logout, user } = useAuth();

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => listWorkspaces(accessToken!),
    enabled: Boolean(accessToken),
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: () =>
      createWorkspace(accessToken!, {
        name: "My Knowledge",
        description: "Your first Microcosm workspace",
        icon: "sparkles",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const workspaces = workspacesQuery.data?.data.workspaces || [];
  const activeWorkspace = workspaces[0];

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

          {workspacesQuery.isError ? (
            <p className="sidebar-note error-text">Unable to load workspaces.</p>
          ) : null}

          {!workspacesQuery.isLoading && workspaces.length === 0 ? (
            <div className="empty-sidebar-state">
              <p>No workspaces yet.</p>
              <button onClick={() => createWorkspaceMutation.mutate()} disabled={createWorkspaceMutation.isPending}>
                Create starter workspace
              </button>
            </div>
          ) : null}

          {workspaces.map((workspace, index) => (
            <div className="workspace-tree" key={workspace.id}>
              <button className="tree-root">
                <ChevronDown size={15} />
                {workspace.name}
              </button>
              <div className="tree-children">
                {(index === 0 ? fallbackNotebooks : []).map((child) => (
                  <button className={child.active ? "tree-item active" : "tree-item"} key={child.name}>
                    <BookOpen size={15} />
                    {child.name}
                  </button>
                ))}
                {index !== 0 ? <span className="tree-muted">No notebooks yet</span> : null}
              </div>
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
              <span>Operating Systems</span>
              <span>/</span>
              <strong>Deadlock Notes</strong>
            </div>
            <MicrocosmEditor />
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
                Your notes connect <strong>Deadlock</strong> with resource allocation and process synchronization.
              </p>
            </section>

            <section className="companion-list">
              <h2>Context</h2>
              <button>
                <FileText size={16} />
                Current page summary
              </button>
              <button>
                <Layers3 size={16} />
                Related notes
              </button>
              <button>
                <Image size={16} />
                Image blocks
              </button>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
