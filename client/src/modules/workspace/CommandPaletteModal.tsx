import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, BookOpen, Folder, Layers3, ArrowRight, X, Sparkles } from "lucide-react";
import type { Notebook, Section, Page } from "./content.api";

type CommandPaletteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  notebooks: Notebook[];
  sections: Section[];
  pages: Page[];
  onSelectPage: (notebookId: string, sectionId: string, pageId: string) => void;
  onSelectView: (view: "editor" | "graph" | "study") => void;
};

export function CommandPaletteModal({
  isOpen,
  onClose,
  notebooks,
  sections,
  pages,
  onSelectPage,
  onSelectView,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered results
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items: Array<{
      id: string;
      title: string;
      subtitle: string;
      type: "page" | "notebook" | "section" | "view";
      icon: React.ReactNode;
      action: () => void;
    }> = [];

    // Views
    if (!q || "graph".includes(q) || "knowledge graph".includes(q)) {
      items.push({
        id: "view-graph",
        title: "Knowledge Graph View",
        subtitle: "View visual network of connected notes & documents",
        type: "view",
        icon: <Layers3 size={14} className="text-purple-400" />,
        action: () => { onSelectView("graph"); onClose(); },
      });
    }

    if (!q || "study".includes(q) || "flashcards".includes(q) || "deck".includes(q)) {
      items.push({
        id: "view-study",
        title: "Spaced Repetition Review Deck",
        subtitle: "Review due study flashcards",
        type: "view",
        icon: <Sparkles size={14} className="text-yellow-400" />,
        action: () => { onSelectView("study"); onClose(); },
      });
    }

    // Pages
    pages.forEach((p) => {
      if (!q || p.title.toLowerCase().includes(q)) {
        const section = sections.find((s) => s.id === p.sectionId);
        const notebook = notebooks.find((n) => n.id === p.notebookId);
        items.push({
          id: `page-${p.id}`,
          title: p.title || "Untitled Page",
          subtitle: `${notebook?.title ?? "Notebook"} › ${section?.title ?? "Section"}`,
          type: "page",
          icon: <FileText size={14} className="text-blue-400" />,
          action: () => {
            onSelectPage(p.notebookId, p.sectionId, p.id);
            onSelectView("editor");
            onClose();
          },
        });
      }
    });

    // Notebooks
    notebooks.forEach((n) => {
      if (q && n.title.toLowerCase().includes(q)) {
        items.push({
          id: `nb-${n.id}`,
          title: n.title,
          subtitle: "Notebook",
          type: "notebook",
          icon: <BookOpen size={14} className="text-orange-400" />,
          action: () => {
            const sec = sections.find((s) => s.notebookId === n.id);
            const pg = pages.find((p) => p.sectionId === sec?.id);
            if (sec && pg) onSelectPage(n.id, sec.id, pg.id);
            onSelectView("editor");
            onClose();
          },
        });
      }
    });

    return items;
  }, [query, pages, notebooks, sections, onSelectPage, onSelectView, onClose]);

  // Reset index when query changes
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === "Enter" && filteredResults[selectedIndex]) {
      e.preventDefault();
      filteredResults[selectedIndex].action();
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-xl bg-card border-2 border-foreground overflow-hidden font-sans text-foreground"
            style={{ boxShadow: "8px 8px 0px 0px rgba(255,255,255,0.15)" }}
          >
            {/* Search Input bar */}
            <div className="flex items-center px-4 py-3 border-b-2 border-foreground bg-secondary gap-3">
              <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search notes, notebooks, or commands… (Press Esc to exit)"
                autoFocus
                className="flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              <span className="font-mono text-[10px] bg-background border border-foreground/30 px-1.5 py-0.5 text-muted-foreground font-bold">
                ESC
              </span>
            </div>

            {/* Results list */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredResults.length === 0 ? (
                <div className="p-6 text-center text-sm font-mono text-muted-foreground">
                  No matching notes or views found for "{query}".
                </div>
              ) : (
                filteredResults.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center gap-3 w-full px-3 py-2.5 text-left transition-all
                                  ${isSelected
                                    ? "bg-foreground text-background font-semibold"
                                    : "hover:bg-secondary text-foreground/80"}`}
                    >
                      <span className={`flex-shrink-0 ${isSelected ? "text-background" : ""}`}>
                        {item.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{item.title}</div>
                        <div className={`text-[11px] font-mono truncate ${isSelected ? "text-background/70" : "text-muted-foreground"}`}>
                          {item.subtitle}
                        </div>
                      </div>
                      {isSelected && <ArrowRight size={14} className="flex-shrink-0 text-background" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer tips */}
            <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-t border-foreground/10 text-[10px] font-mono text-muted-foreground">
              <span>Use ↑ ↓ to navigate</span>
              <span>↵ Select</span>
              <span>Ctrl+K to toggle anytime</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
