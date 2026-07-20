import {
  BookOpen,
  Bot,
  ChevronDown,
  FileText,
  Home,
  Image,
  Layers3,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import { MicrocosmEditor } from "../editor/MicrocosmEditor";

const notebooks = [
  {
    name: "College",
    children: [
      { name: "Operating Systems", active: true },
      { name: "DBMS", active: false },
      { name: "Machine Learning", active: false },
    ],
  },
  {
    name: "Ideas",
    children: [
      { name: "Microcosm", active: false },
      { name: "Startup Notes", active: false },
    ],
  },
];

export function App() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <span className="brand-mark">&lt;Microcosm /&gt;</span>
          <button className="icon-button" aria-label="Create">
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
          {notebooks.map((workspace) => (
            <div className="workspace-tree" key={workspace.name}>
              <button className="tree-root">
                <ChevronDown size={15} />
                {workspace.name}
              </button>
              <div className="tree-children">
                {workspace.children.map((child) => (
                  <button
                    className={child.active ? "tree-item active" : "tree-item"}
                    key={child.name}
                  >
                    <BookOpen size={15} />
                    {child.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <a className="nav-item" href="#">
            <Settings size={17} />
            Settings
          </a>
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
              <span>College</span>
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
                Your notes connect <strong>Deadlock</strong> with resource
                allocation and process synchronization.
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
