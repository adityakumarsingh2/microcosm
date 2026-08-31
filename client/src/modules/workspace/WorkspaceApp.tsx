import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  ChevronDown,
  FileText,
  Folder,
  Home,
  Layers3,
  LogOut,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Edit2,
  Trash2,
  Zap,
  Copy,
  PlusSquare,
  RotateCcw,
  Check,
  Loader2,
  X,
  User,
  MessageSquare,
  BookOpen,
  PanelLeftClose,
  PanelLeftOpen,
  FilePlus,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { MicrocosmEditor } from "../editor/MicrocosmEditor";
import { CommandPaletteModal } from "./CommandPaletteModal";
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
  getRelatedPages,
  getWorkspaceGraph,
  type PageBlock,
  type RelatedPage,
  type GraphNode,
  type GraphEdge,
} from "./content.api";
import { createWorkspace, listWorkspaces, updateWorkspace, deleteWorkspace } from "./workspace.api";
import { chatWithCompanion } from "./companion.api";
import type { Source } from "./companion.api";
import { CitationBadge } from "./CitationBadge";
import { listDocuments, uploadDocument, deleteDocument } from "../documents/document.api";
import { KnowledgeGraph } from "./KnowledgeGraph";
import { generateFlashcards as apiGenerateFlashcards } from "../study/study.api";
import { StudyView } from "./StudyView";
import { MayIHelpYouPopup } from "../../shared/MayIHelpYouPopup";
import { ConfirmDeleteModal } from "../../shared/ConfirmDeleteModal";
import { CreateItemModal } from "../../shared/CreateItemModal";

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

// ── Onboarding overlay ────────────────────────────────────────────────────
function OnboardingOverlay({ onStart, isPending }: { onStart: (name: string) => void; isPending: boolean }) {
  const [name, setName] = useState("Personal");
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 font-sans"
         style={{ background: "rgba(5,5,10,0.75)", backdropFilter: "blur(20px)" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm p-8 text-foreground rounded-2xl"
        style={{
          background: "rgba(14,14,22,0.85)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(28px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center justify-center w-12 h-12 mb-6 rounded-xl text-[hsl(var(--orange))]"
             style={{ background: "rgba(240,125,42,0.12)", boxShadow: "0 0 20px rgba(240,125,42,0.15)" }}>
          <Sparkles size={22} />
        </div>
        <h2 className="font-serif text-2xl font-bold mb-2 text-foreground">Welcome to Microcosm</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Let's set up your first notebook. What area of knowledge will you start with?
        </p>
        <input
          className="input-smooth mb-4"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && !isPending && onStart(name)}
          disabled={isPending}
          placeholder="e.g. Personal, Engineering, Research…"
        />
        <button
          className="flex items-center justify-center gap-2 w-full min-h-[42px] px-6 rounded-xl
                     font-bold text-sm text-white disabled:opacity-40
                     hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-sm), var(--glow-orange)" }}
          onClick={() => onStart(name)}
          disabled={isPending}
        >
          {isPending ? (
            <><Loader2 size={14} className="animate-spin" /> Setting up…</>
          ) : (
            <><Sparkles size={14} /> Get Started</>
          )}
        </button>
      </motion.div>
    </div>
  );
}

// ── Welcome sequence for AI Companion (matching portfolio RAGChatWidget) ──
const COMPANION_SUGGESTIONS = {
  workspace: [
    { label: "Explain my recent notes", icon: <FileText size={12} /> },
    { label: "What did I write about this week?", icon: <Sparkles size={12} /> },
    { label: "What are the key insights in my space?", icon: <Bot size={12} /> },
  ],
  notebook: [
    { label: "Summarize this notebook", icon: <BookOpen size={12} /> },
    { label: "Find connections across pages", icon: <Sparkles size={12} /> },
    { label: "What are the action items here?", icon: <Bot size={12} /> },
  ],
  page: [
    { label: "Summarize this page", icon: <FileText size={12} /> },
    { label: "Find key concepts", icon: <Sparkles size={12} /> },
    { label: "Create a study quiz from this page", icon: <Bot size={12} /> },
  ],
};

const GREETING_DELAY    = 300;
const LABEL_DELAY       = 1000;
const FIRST_CHIP_DELAY  = 1300;
const CHIP_STAGGER      = 180;

const CompanionWelcomeSequence = React.memo(function CompanionWelcomeSequence({
  chatScope,
  onSend,
}: {
  chatScope: "workspace" | "notebook" | "page";
  onSend: (text: string) => void;
}) {
  const [showGreeting, setShowGreeting]   = useState(false);
  const [showLabel, setShowLabel]         = useState(false);
  const [visibleChips, setVisibleChips]   = useState(0);
  const suggestions = COMPANION_SUGGESTIONS[chatScope];

  useEffect(() => {
    const t1 = setTimeout(() => setShowGreeting(true), GREETING_DELAY);
    const t2 = setTimeout(() => setShowLabel(true), LABEL_DELAY);
    const chipTimers = suggestions.map((_, i) =>
      setTimeout(() => setVisibleChips(i + 1), FIRST_CHIP_DELAY + i * CHIP_STAGGER)
    );
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      chipTimers.forEach(clearTimeout);
    };
  }, [suggestions]);

  return (
    <div className="space-y-3">
      {/* Greeting bubble */}
      <AnimatePresence>
        {showGreeting && (
          <motion.div
            className="flex items-start gap-2.5"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="w-7 h-7 bg-secondary border border-foreground flex items-center justify-center text-xs flex-shrink-0"
                 style={{ boxShadow: "1px 1px 0px rgba(255,255,255,0.1)" }}>
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="px-3.5 py-2.5 border bg-secondary text-foreground border-foreground/20
                            rounded-xl rounded-tl-none text-sm leading-relaxed max-w-[75%] font-sans font-normal">
              Hi! I'm your AI Companion. Ask me anything about your{" "}
              {chatScope === "workspace" ? "workspace" : chatScope === "notebook" ? "active notebook" : "active page"}.
              📚
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Label */}
      <AnimatePresence>
        {showLabel && (
          <motion.p
            className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 pt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <Sparkles className="w-3 h-3 text-yellow-500 animate-pulse" />
            SUGGESTED QUERIES:
          </motion.p>
        )}
      </AnimatePresence>

      {/* Suggestion chips */}
      <div className="flex flex-col gap-2">
        {suggestions.map((sug, i) => (
          <AnimatePresence key={sug.label}>
            {visibleChips > i && (
              <motion.button
                onClick={() => onSend(sug.label)}
                className="text-xs font-mono text-left px-3 py-2 border border-foreground/20
                           bg-card hover:bg-secondary hover:border-foreground/40
                           hover:-translate-y-px transition-all duration-200 text-foreground"
                style={{ boxShadow: "1px 1px 0px rgba(255,255,255,0.08)" }}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="text-blue-400 mr-1.5">{">"}</span>
                {sug.label}
              </motion.button>
            )}
          </AnimatePresence>
        ))}
      </div>
    </div>
  );
});

// ── Main WorkspaceApp ─────────────────────────────────────────────────────
export function WorkspaceApp() {
  const queryClient = useQueryClient();
  const { accessToken, logout, user } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [activeNotebookId, setActiveNotebookId]   = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId]     = useState<string | null>(null);
  const [activePageId, setActivePageId]           = useState<string | null>(null);
  const [renamingItemId, setRenamingItemId]       = useState<string | null>(null);
  const [renameDraft, setRenameDraft]             = useState("");

  // Companion state
  const [chatScope, setChatScope]     = useState<"workspace" | "notebook" | "page">("workspace");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string; sources?: Source[] }[]>([]);
  const [chatInput, setChatInput]     = useState("");
  const [companionOpen, setCompanionOpen] = useState(true);
  const chatBodyRef    = useRef<HTMLDivElement>(null);
  const chatInputRef   = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode]       = useState<"editor" | "graph" | "study">("editor");
  const [copiedMessageIndex, setCopiedMessageIndex]   = useState<number | null>(null);
  const [insertedMessageIndex, setInsertedMessageIndex] = useState<number | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen]   = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed]       = useState(false);

  // Creation & Deletion modal states
  const [createModal, setCreateModal] = useState<{
    isOpen: boolean;
    itemType: "notebook" | "section" | "page";
    targetId?: string;
  }>({ isOpen: false, itemType: "page" });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    itemType: "notebook" | "section" | "page" | "document" | "workspace";
    id: string;
    title: string;
    description?: string;
  }>({ isOpen: false, itemType: "page", id: "", title: "" });

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

  const handleSaveChatToPage = () => {
    if (!activeSectionId || chatHistory.length === 0) return;
    const blocks: PageBlock[] = chatHistory.flatMap((msg, i) => [
      {
        blockId: `chat-header-${i}`,
        type: "heading",
        content: msg.role === "user" ? `User Query: ${msg.content}` : `AI Companion Response`,
        properties: { level: msg.role === "user" ? 2 : 3 },
        position: (i * 2 + 1) * 1000,
      },
      {
        blockId: `chat-body-${i}`,
        type: "paragraph",
        content: msg.content,
        properties: {},
        position: (i * 2 + 2) * 1000,
      },
    ]);
    createPage(accessToken!, activeSectionId, {
      title: `AI Insights — ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      emoji: "🤖",
      blocks,
    }).then((res) => {
      setActivePageId(res.data.page.id);
      void queryClient.invalidateQueries({ queryKey: ["pages", activeSectionId] });
      alert("Exported AI chat conversation to a new page!");
    });
  };

  useEffect(() => {
    if (!activePageId && chatScope === "page") setChatScope("workspace");
  }, [activePageId, chatScope]);

  useEffect(() => {
    if (!activeNotebookId && chatScope === "notebook") setChatScope("workspace");
  }, [activeNotebookId, chatScope]);

  // Document state
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentsQuery = useQuery({
    queryKey: ["documents", activeWorkspaceId],
    queryFn: () => listDocuments(accessToken!, activeWorkspaceId!),
    enabled: Boolean(accessToken && activeWorkspaceId),
    refetchInterval: (query) => {
      const docs = query.state.data?.data.documents ?? [];
      return docs.some((d) => d.status === "pending" || d.status === "processing") ? 3000 : false;
    },
  });
  const documents = documentsQuery.data?.data.documents ?? [];

  const uploadDocumentMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(accessToken!, activeWorkspaceId!, file),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["documents", activeWorkspaceId] }),
    onError: (err) => alert(`Failed to upload: ${err instanceof Error ? err.message : "unknown"}`),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => deleteDocument(accessToken!, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["documents", activeWorkspaceId] }),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { alert("Only PDF files are supported."); return; }
    uploadDocumentMutation.mutate(file);
    e.target.value = "";
  }

  function startRenaming(id: string, currentTitle: string) {
    setRenamingItemId(id);
    setRenameDraft(currentTitle);
  }

  // ── Queries ──────────────────────────────────────────────────────────────

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
      setActiveNotebookId(null); setActiveSectionId(null); setActivePageId(null);
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
    if (sections.length === 0) { setActiveSectionId(null); setActivePageId(null); }
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

  const graphQuery = useQuery({
    queryKey: ["graph", activeWorkspaceId],
    queryFn: () => getWorkspaceGraph(accessToken!, activeWorkspaceId!),
    enabled: Boolean(accessToken && activeWorkspaceId && viewMode === "graph"),
  });
  const graphData = graphQuery.data?.data ?? { nodes: [], edges: [] };

  const relatedPagesQuery = useQuery({
    queryKey: ["relatedPages", activePageId],
    queryFn: () => getRelatedPages(accessToken!, activePageId!),
    enabled: Boolean(accessToken && activePageId),
  });
  const relatedPages = relatedPagesQuery.data?.data.related ?? [];

  const generateFlashcardsMutation = useMutation({
    mutationFn: () => apiGenerateFlashcards(accessToken!, activePageId!),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dueCards", activeWorkspaceId] });
      alert("Flashcards generated! Switch to the 'Study' tab to review them.");
    },
    onError: (err) => alert(`Failed: ${err instanceof Error ? err.message : "unknown"}`),
  });

  function handleGraphNodeClick(nodeId: string) {
    const node = graphData.nodes.find((n) => n.id === nodeId);
    if (!node || node.type !== "page") return;
    if (node.notebookId) setActiveNotebookId(node.notebookId);
    if (node.sectionId) setActiveSectionId(node.sectionId);
    setActivePageId(node.id);
    setViewMode("editor");
  }

  function handleNavigateToPage(pageId: string) {
    const relPage = relatedPages.find((p) => p.id === pageId);
    if (!relPage) return;
    if (relPage.notebookId) setActiveNotebookId(relPage.notebookId);
    if (relPage.sectionId) setActiveSectionId(relPage.sectionId);
    setActivePageId(relPage.id);
    setViewMode("editor");
  }

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
        { role: "ai", content: `Something went wrong: ${err instanceof Error ? err.message : "unknown"}`, sources: [] },
      ]);
    },
  });

  // Scroll chat body to bottom on new messages
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [chatHistory, chatMutation.isPending]);

  // Focus input when companion opens
  useEffect(() => {
    if (companionOpen) {
      setTimeout(() => chatInputRef.current?.focus({ preventScroll: true }), 100);
    }
  }, [companionOpen]);

  function handleSendChat() {
    const prompt = chatInput.trim();
    if (!prompt || chatMutation.isPending) return;
    setChatHistory((prev) => [...prev, { role: "user", content: prompt }]);
    chatMutation.mutate(prompt);
    setChatInput("");
  }

  function handleSendSuggestion(text: string) {
    setChatHistory((prev) => [...prev, { role: "user", content: text }]);
    chatMutation.mutate(text);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createWorkspaceMutation = useMutation({
    mutationFn: () => createWorkspace(accessToken!, { name: "My Knowledge", description: "Your first workspace", icon: "sparkles" }),
    onSuccess: (result) => {
      setActiveWorkspaceId(result.data.workspace.id);
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: (input: { name: string }) => updateWorkspace(accessToken!, renamingItemId!, input),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["workspaces"] }); setRenamingItemId(null); },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: (id: string) => deleteWorkspace(accessToken!, id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      if (activeWorkspaceId === deletedId) {
        setActiveWorkspaceId(null); setActiveNotebookId(null);
        setActiveSectionId(null); setActivePageId(null);
      }
    },
  });

  const onboardingMutation = useMutation({
    mutationFn: async (notebookName: string) => {
      const wsRes  = await createWorkspace(accessToken!, { name: user?.name ? `${user.name}'s Knowledge` : "Primary Workspace", description: "Your primary workspace", icon: "sparkles" });
      const wsId   = wsRes.data.workspace.id;
      const nbRes  = await createNotebook(accessToken!, wsId, { title: notebookName || "Personal" });
      const nbId   = nbRes.data.notebook.id;
      const secRes = await createSection(accessToken!, nbId, { title: "Home" });
      const secId  = secRes.data.section.id;
      const pgRes  = await createPage(accessToken!, secId, { title: "Getting Started", emoji: "🚀", blocks: onboardingBlocks });
      return { wsId, nbId, secId, pgId: pgRes.data.page.id };
    },
    onSuccess: (ids) => {
      void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      setActiveWorkspaceId(ids.wsId); setActiveNotebookId(ids.nbId);
      setActiveSectionId(ids.secId); setActivePageId(ids.pgId);
    },
  });

  const createNotebookMutation = useMutation({
    mutationFn: (title?: string) =>
      createNotebook(accessToken!, activeWorkspaceId!, { title: title || "New Notebook" }),
    onSuccess: (result) => {
      setActiveNotebookId(result.data.notebook.id);
      void queryClient.invalidateQueries({ queryKey: ["notebooks", activeWorkspaceId] });
      setCreateModal({ isOpen: false, itemType: "notebook" });
    },
  });

  const updateNotebookMutation = useMutation({
    mutationFn: (input: { title: string }) => updateNotebook(accessToken!, renamingItemId!, input),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["notebooks", activeWorkspaceId] }); setRenamingItemId(null); },
  });

  const deleteNotebookMutation = useMutation({
    mutationFn: (id: string) => deleteNotebook(accessToken!, id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["notebooks", activeWorkspaceId] });
      if (activeNotebookId === deletedId) { setActiveNotebookId(null); setActiveSectionId(null); setActivePageId(null); }
      setDeleteModal({ isOpen: false, itemType: "notebook", id: "", title: "" });
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: ({ notebookId, title }: { notebookId?: string; title?: string }) =>
      createSection(accessToken!, notebookId || activeNotebookId!, { title: title || "New Section" }),
    onSuccess: (result) => {
      setActiveSectionId(result.data.section.id);
      void queryClient.invalidateQueries({ queryKey: ["sections", result.data.section.notebookId] });
      setCreateModal({ isOpen: false, itemType: "section" });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: (input: { title: string }) => updateSection(accessToken!, renamingItemId!, input),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["sections", activeNotebookId] }); setRenamingItemId(null); },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => deleteSection(accessToken!, id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["sections", activeNotebookId] });
      if (activeSectionId === deletedId) { setActiveSectionId(null); setActivePageId(null); }
      setDeleteModal({ isOpen: false, itemType: "section", id: "", title: "" });
    },
  });

  const createPageMutation = useMutation({
    mutationFn: ({ sectionId, title, emoji }: { sectionId?: string; title?: string; emoji?: string }) =>
      createPage(accessToken!, sectionId || activeSectionId!, {
        title: title || "Untitled Page",
        emoji: emoji || "",
        blocks: emptyBlocks,
      }),
    onSuccess: (result) => {
      setActivePageId(result.data.page.id);
      void queryClient.invalidateQueries({ queryKey: ["pages", result.data.page.sectionId] });
      setCreateModal({ isOpen: false, itemType: "page" });
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
      if (activePageId === deletedId) setActivePageId(null);
      setDeleteModal({ isOpen: false, itemType: "page", id: "", title: "" });
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
    <main className="flex min-h-screen bg-background text-foreground font-sans">

      {/* Creation Modal */}
      <CreateItemModal
        isOpen={createModal.isOpen}
        itemType={createModal.itemType}
        isPending={createNotebookMutation.isPending || createSectionMutation.isPending || createPageMutation.isPending}
        onClose={() => setCreateModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={(title, emoji) => {
          if (createModal.itemType === "notebook") {
            createNotebookMutation.mutate(title);
          } else if (createModal.itemType === "section") {
            createSectionMutation.mutate({ notebookId: createModal.targetId, title });
          } else if (createModal.itemType === "page") {
            createPageMutation.mutate({ sectionId: createModal.targetId, title, emoji });
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        description={deleteModal.description || "This action cannot be undone."}
        itemType={deleteModal.itemType}
        isPending={deleteNotebookMutation.isPending || deleteSectionMutation.isPending || deletePageMutation.isPending || deleteDocumentMutation.isPending}
        onClose={() => setDeleteModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          if (deleteModal.itemType === "notebook") deleteNotebookMutation.mutate(deleteModal.id);
          else if (deleteModal.itemType === "section") deleteSectionMutation.mutate(deleteModal.id);
          else if (deleteModal.itemType === "page") deletePageMutation.mutate(deleteModal.id);
          else if (deleteModal.itemType === "document") deleteDocumentMutation.mutate(deleteModal.id);
        }}
      />

      {/* Command Palette Modal (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        notebooks={notebooks}
        sections={sections}
        pages={pages}
        onSelectPage={(nbId, secId, pgId) => {
          setActiveNotebookId(nbId);
          setActiveSectionId(secId);
          setActivePageId(pgId);
        }}
        onSelectView={setViewMode}
      />

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className={`flex flex-col sticky top-0 h-screen flex-shrink-0
                        overflow-y-auto scrollbar-thin custom-scrollbar
                        transition-all duration-300
                        ${sidebarCollapsed ? "w-16 items-center px-2" : "w-[272px] px-0"}`}
             style={{
               background: "linear-gradient(180deg, rgba(12,12,18,0.97) 0%, rgba(8,8,13,0.99) 100%)",
               backdropFilter: "blur(28px)",
               borderRight: "1px solid rgba(255,255,255,0.055)",
             }}>

        {/* Brand row */}
        <div className={`flex items-center flex-shrink-0 py-4 mb-2
                        ${sidebarCollapsed ? "justify-center w-full" : "justify-between px-4"}`}
             style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
          {!sidebarCollapsed ? (
            <span className="font-mono text-[0.92rem] font-black tracking-tight text-foreground">
              <span className="text-blue-400">&lt;</span>
              Microcosm
              <span className="text-blue-400"> /&gt;</span>
            </span>
          ) : (
            <span className="font-mono text-sm font-black text-blue-400" title="Microcosm">&lt;M/&gt;</span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="grid place-items-center w-7 h-7 rounded-lg text-muted-foreground
                         hover:bg-white/6 hover:text-foreground transition-all duration-150"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar (Focus Mode)"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
            </button>
            {!sidebarCollapsed && (
              <button
                className="grid place-items-center w-7 h-7 rounded-lg text-muted-foreground
                           hover:bg-white/6 hover:text-foreground transition-all duration-150"
                aria-label="New notebook"
                title="Create Notebook"
                onClick={() => setCreateModal({ isOpen: true, itemType: "notebook" })}
              >
                <Plus size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Primary nav */}
        <nav className={`flex flex-col gap-0.5 pb-3 mb-1
                        ${sidebarCollapsed ? "w-full items-center px-0" : "px-2"}`}
             style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
          <button
            onClick={() => setViewMode("editor")}
            title="Home"
            className={`flex items-center text-[0.87rem] rounded-lg transition-all duration-150
                       text-muted-foreground hover:text-foreground hover:bg-white/5
                       ${sidebarCollapsed ? "justify-center w-9 h-9 px-0" : "gap-2.5 px-2.5 min-h-[34px] w-full text-left"}`}
          >
            <Home size={14} /> {!sidebarCollapsed && "Home"}
          </button>
          <button
            onClick={() => setCommandPaletteOpen(true)}
            title="Search (Ctrl+K)"
            className={`flex items-center text-[0.87rem] rounded-lg transition-all duration-150
                       text-muted-foreground hover:text-foreground hover:bg-white/5
                       ${sidebarCollapsed ? "justify-center w-9 h-9 px-0" : "justify-between gap-2.5 px-2.5 min-h-[34px] w-full text-left"}`}
          >
            <span className="flex items-center gap-2.5"><Search size={14} /> {!sidebarCollapsed && "Search"}</span>
            {!sidebarCollapsed && (
              <span className="font-mono text-[9px] rounded-md px-1.5 py-0.5 text-foreground/35 font-bold"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>Ctrl+K</span>
            )}
          </button>
          <button
            onClick={() => setCompanionOpen((o) => !o)}
            title="AI Companion"
            className={`flex items-center text-[0.87rem] rounded-lg transition-all duration-150
                       text-muted-foreground hover:text-foreground hover:bg-white/5
                       ${sidebarCollapsed ? "justify-center w-9 h-9 px-0" : "gap-2.5 px-2.5 min-h-[34px] w-full text-left"}`}
          >
            <Bot size={14} /> {!sidebarCollapsed && "Companion"}
          </button>
        </nav>

        {/* Library tree */}
        <div className={`flex-1 min-h-0 overflow-y-auto pt-3 custom-scrollbar
                        ${sidebarCollapsed ? "w-full px-0 flex flex-col items-center" : "px-2"}`}>
          {!sidebarCollapsed ? (
            /* Expanded Library */
            <>
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="text-[0.65rem] font-bold tracking-widest uppercase text-foreground/25 px-1">
                  Library
                </span>
                {activeWorkspaceId && (
                  <button
                    className="grid place-items-center w-5 h-5 rounded-md text-foreground/30
                               hover:bg-white/6 hover:text-foreground transition-all duration-150"
                    title="Create Notebook"
                    onClick={() => setCreateModal({ isOpen: true, itemType: "notebook" })}
                  >
                    <Plus size={10} />
                  </button>
                )}
              </div>

              {activeWorkspaceId && notebooks.length === 0 && !notebooksQuery.isLoading && (
                <div className="rounded-xl p-3 mb-2" style={{ border: "1px dashed rgba(255,255,255,0.10)" }}>
                  <p className="text-foreground/30 text-xs mb-2">No notebooks yet.</p>
                  <button
                    onClick={() => setCreateModal({ isOpen: true, itemType: "notebook" })}
                    className="text-xs text-blue-400 rounded-lg px-2.5 py-1 hover:bg-blue-400/10 transition-all duration-150"
                    style={{ border: "1px solid rgba(96,165,250,0.25)" }}
                  >
                    + New notebook
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-px">
                {notebooks.map((notebook) => (
                  <div key={notebook.id}>
                    {/* Notebook row */}
                    <div className={`flex items-center w-full min-h-[33px] group rounded-lg
                                     ${notebook.id === activeNotebookId ? "text-foreground" : "text-foreground/60 hover:text-foreground/85"}
                                     transition-all duration-150`}
                         style={{ background: notebook.id === activeNotebookId ? "rgba(255,255,255,0.07)" : "transparent" }}
                         onMouseEnter={(e) => { if (notebook.id !== activeNotebookId) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                         onMouseLeave={(e) => { if (notebook.id !== activeNotebookId) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <button
                        className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 text-[0.87rem] font-semibold text-left"
                        onClick={() => { setActiveNotebookId(notebook.id); setActiveSectionId(null); setActivePageId(null); }}
                      >
                        <ChevronDown size={11} className="flex-shrink-0 transition-transform duration-200"
                          style={{ transform: notebook.id === activeNotebookId ? "rotate(0deg)" : "rotate(-90deg)" }} />
                        <BookOpen size={12} className="flex-shrink-0 text-orange-400" />
                        {renamingItemId === notebook.id ? (
                          <input autoFocus className="inline-rename-input flex-1"
                            value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => setRenamingItemId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && renameDraft.trim()) updateNotebookMutation.mutate({ title: renameDraft.trim() });
                              if (e.key === "Escape") setRenamingItemId(null);
                            }} />
                        ) : (
                          <span className="truncate">{notebook.title}</span>
                        )}
                      </button>
                      <div className="hidden group-hover:flex items-center gap-px pr-1.5">
                        <button onClick={() => startRenaming(notebook.id, notebook.title)} title="Rename"
                          className="grid place-items-center w-5 h-5 rounded text-foreground/40 hover:text-foreground hover:bg-white/8 transition-all duration-100">
                          <Edit2 size={10} />
                        </button>
                        <button onClick={() => setDeleteModal({ isOpen: true, itemType: "notebook", id: notebook.id, title: notebook.title })} title="Delete Notebook"
                          className="grid place-items-center w-5 h-5 rounded text-red-500/60 hover:text-red-400 hover:bg-red-500/8 transition-all duration-100">
                          <Trash2 size={10} />
                        </button>
                        {notebook.id === activeNotebookId && (
                          <button onClick={() => setCreateModal({ isOpen: true, itemType: "section", targetId: notebook.id })} title="Create Section"
                            className="grid place-items-center w-5 h-5 rounded text-blue-400/60 hover:text-blue-400 hover:bg-blue-400/8 transition-all duration-100">
                            <Plus size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sections */}
                    {notebook.id === activeNotebookId && (
                      <div className="ml-4 border-l border-foreground/8 pl-2 flex flex-col gap-px mt-0.5 mb-1">
                        {sections.map((section) => (
                          <div key={section.id}>
                            <div className={`flex items-center w-full min-h-[29px] group rounded-md
                                             ${section.id === activeSectionId ? "text-foreground/90" : "text-foreground/45 hover:text-foreground/70"}
                                             transition-all duration-150`}
                                 style={{ background: section.id === activeSectionId ? "rgba(255,255,255,0.05)" : "transparent" }}>
                              <button
                                className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1 text-[0.83rem] text-left"
                                onClick={() => { setActiveSectionId(section.id); setActivePageId(null); }}
                              >
                                <Folder size={11} className="flex-shrink-0 text-blue-400" />
                                {renamingItemId === section.id ? (
                                  <input autoFocus className="inline-rename-input flex-1"
                                    value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)}
                                    onBlur={() => setRenamingItemId(null)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && renameDraft.trim()) updateSectionMutation.mutate({ title: renameDraft.trim() });
                                      if (e.key === "Escape") setRenamingItemId(null);
                                    }} />
                                ) : (
                                  <span className="truncate">{section.title}</span>
                                )}
                              </button>
                              <div className="hidden group-hover:flex items-center gap-px pr-1">
                                <button onClick={() => startRenaming(section.id, section.title)} title="Rename"
                                  className="grid place-items-center w-4.5 h-4.5 rounded text-foreground/35 hover:text-foreground hover:bg-white/8 transition-all duration-100">
                                  <Edit2 size={9} />
                                </button>
                                <button onClick={() => setDeleteModal({ isOpen: true, itemType: "section", id: section.id, title: section.title })} title="Delete Section"
                                  className="grid place-items-center w-4.5 h-4.5 rounded text-red-500/50 hover:text-red-400 hover:bg-red-500/8 transition-all duration-100">
                                  <Trash2 size={9} />
                                </button>
                                {section.id === activeSectionId && (
                                  <button onClick={() => setCreateModal({ isOpen: true, itemType: "page", targetId: section.id })} title="Create Page"
                                    className="grid place-items-center w-4.5 h-4.5 rounded text-blue-400/50 hover:text-blue-400 hover:bg-blue-400/8 transition-all duration-100">
                                    <Plus size={9} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Pages */}
                            {section.id === activeSectionId && (
                              <div className="ml-3.5 border-l border-foreground/6 pl-2 flex flex-col gap-px mt-0.5 mb-1">
                                {pages.map((page) => (
                                  <div key={page.id}
                                    className={`flex items-center min-h-[27px] relative group rounded-md
                                                 ${page.id === activePageId ? "text-foreground font-semibold" : "text-foreground/35 hover:text-foreground/65"}
                                                 transition-all duration-150`}
                                    style={{ background: page.id === activePageId ? "rgba(240,125,42,0.10)" : "transparent" }}>
                                    {page.id === activePageId && (
                                      <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full"
                                           style={{ background: "hsl(var(--orange))", boxShadow: "0 0 6px rgba(240,125,42,0.5)" }} />
                                    )}
                                    <button
                                      className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1 text-[0.81rem] text-left"
                                      onClick={() => setActivePageId(page.id)}
                                    >
                                      {page.emoji ? <span className="text-xs">{page.emoji}</span> : <FileText size={10} className="flex-shrink-0 text-purple-400" />}
                                      <span className="truncate">{page.title}</span>
                                    </button>
                                    <button
                                      onClick={() => setDeleteModal({ isOpen: true, itemType: "page", id: page.id, title: page.title })}
                                      title="Delete Page"
                                      className="hidden group-hover:grid place-items-center w-4 h-4 mr-1 rounded text-red-500/50 hover:text-red-400 hover:bg-red-500/8 transition-all duration-100">
                                      <Trash2 size={9} />
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
            </>
          ) : (
            /* Collapsed Library Icon Bar */
            <div className="flex flex-col items-center gap-2 w-full py-1">
              <button
                onClick={() => setCreateModal({ isOpen: true, itemType: "notebook" })}
                title="Create Notebook"
                className="w-8 h-8 grid place-items-center border border-foreground/15 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
              >
                <Plus size={13} />
              </button>
              <div className="w-6 h-px bg-foreground/10 my-1" />
              {notebooks.map((notebook) => (
                <button
                  key={notebook.id}
                  onClick={() => { setActiveNotebookId(notebook.id); setActiveSectionId(null); setActivePageId(null); }}
                  title={`Notebook: ${notebook.title}`}
                  className={`w-8 h-8 grid place-items-center transition-all ${
                    notebook.id === activeNotebookId
                      ? "bg-foreground/10 text-orange-400 border border-orange-400/40"
                      : "text-foreground/45 hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  <BookOpen size={14} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Documents section */}
        <div className={`pt-3 mt-2 ${sidebarCollapsed ? "w-full px-0 flex flex-col items-center" : "px-2"}`}
             style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center justify-between px-1 mb-1.5">
                <span className="text-[0.65rem] font-bold tracking-widest uppercase text-foreground/25 px-1">
                  Documents
                </span>
                {activeWorkspaceId && (
                  <button
                    className="grid place-items-center w-5 h-5 rounded-md text-foreground/30
                               hover:bg-white/6 hover:text-foreground transition-all duration-150"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadDocumentMutation.isPending}
                    title="Upload PDF Document"
                  >
                    <Plus size={10} />
                  </button>
                )}
              </div>

              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />

              {activeWorkspaceId && documents.length === 0 && !documentsQuery.isLoading && (
                <div className="rounded-xl p-3 mb-2" style={{ border: "1px dashed rgba(255,255,255,0.10)" }}>
                  <p className="text-foreground/30 text-xs mb-2">No documents yet.</p>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadDocumentMutation.isPending}
                    className="text-xs text-blue-400 rounded-lg px-2.5 py-1 hover:bg-blue-400/10 transition-all duration-150"
                    style={{ border: "1px solid rgba(96,165,250,0.25)" }}>
                    + Upload PDF
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-1.5 pb-2">
                {documents.map((doc) => (
                  <div key={doc.id}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg gap-2 transition-all duration-150"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <FileText size={10} className="flex-shrink-0 text-foreground/30" />
                      <span className="text-[0.77rem] font-mono text-foreground/55 truncate" title={doc.title}>
                        {doc.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(doc.status === "pending" || doc.status === "processing") ? (
                        <span className="text-[0.55rem] font-mono font-bold px-1.5 py-0.5 rounded-full border border-blue-400/30 text-blue-400">syncing</span>
                      ) : doc.status === "indexed" ? (
                        <span className="text-[0.55rem] font-mono font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/30 text-emerald-400">ready</span>
                      ) : (
                        <span className="text-[0.55rem] font-mono font-bold px-1.5 py-0.5 rounded-full border border-red-500/30 text-red-400">failed</span>
                      )}
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, itemType: "document", id: doc.id, title: doc.title })}
                        title="Delete Document"
                        className="text-foreground/25 hover:text-red-400 transition-colors rounded">
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-1 py-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Upload PDF Document"
                className="w-8 h-8 grid place-items-center text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all"
              >
                <FileText size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`mt-auto pt-3 pb-3 flex-shrink-0 flex flex-col gap-1
                        ${sidebarCollapsed ? "w-full items-center px-0" : "px-2"}`}
             style={{ borderTop: "1px solid rgba(255,255,255,0.055)" }}>
          {!sidebarCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl mb-1 transition-all duration-150"
                   style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="grid place-items-center w-7 h-7 rounded-full text-blue-200 text-xs font-black flex-shrink-0"
                     style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(99,102,241,0.25) 100%)", border: "1px solid rgba(96,165,250,0.2)" }}>
                  {user?.name?.slice(0, 1).toUpperCase() ?? "M"}
                </div>
                <div className="min-w-0">
                  <strong className="block text-[0.83rem] font-semibold text-foreground truncate">{user?.name ?? "Microcosm User"}</strong>
                  <small className="block text-[0.71rem] text-foreground/35 truncate">{user?.email}</small>
                </div>
              </div>
              <a href="#"
                className="flex items-center gap-2 min-h-[30px] px-2.5 rounded-lg text-foreground/45 text-[0.85rem]
                           hover:text-foreground hover:bg-white/5 transition-all duration-150">
                <Settings size={13} /> Settings
              </a>
              <button
                onClick={() => void logout()}
                className="flex items-center gap-2 min-h-[30px] px-2.5 rounded-lg text-foreground/45 text-[0.85rem]
                           hover:text-foreground hover:bg-white/5 transition-all duration-150 text-left">
                <LogOut size={13} /> Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => void logout()}
              title={`Logout (${user?.email})`}
              className="w-8 h-8 grid place-items-center rounded-lg text-foreground/45 hover:text-red-400 hover:bg-white/5 transition-all duration-150"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </aside>

      {/* ── WORKSPACE ────────────────────────────────────────────────────── */}
      <section className="flex flex-col flex-1 min-w-0 min-h-screen px-7 pt-6 pb-7 gap-0">

        {/* Topbar */}
        <header className="flex items-center justify-between gap-5 pb-5 mb-5 flex-shrink-0"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.055)" }}>
          <div className="min-w-0">
            <h1 className="font-serif text-[1.85rem] font-bold leading-[1.1] tracking-tight text-foreground m-0">
              {activeWorkspace?.name
                ? <span className="text-[hsl(var(--orange))]">{activeWorkspace.name}</span>
                : <span>Microcosm</span>}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* View mode segmented control */}
            {activeWorkspaceId && (
              <div className="seg-control">
                {(["editor", "graph", "study"] as const).map((mode) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={`seg-btn ${viewMode === mode ? "active" : ""}`}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              {!companionOpen && (
                <div className="absolute right-0 bottom-full mb-1 z-50">
                  <MayIHelpYouPopup onOpenChat={() => setCompanionOpen(true)} />
                </div>
              )}
              <button
                onClick={() => setCompanionOpen((o) => !o)}
                className="flex items-center gap-2 min-h-[36px] px-4 rounded-xl
                           text-sm font-semibold transition-all duration-200
                           hover:-translate-y-px active:translate-y-0"
                style={{
                  background: companionOpen
                    ? "rgba(240,125,42,0.14)"
                    : "rgba(255,255,255,0.06)",
                  border: companionOpen
                    ? "1px solid rgba(240,125,42,0.3)"
                    : "1px solid rgba(255,255,255,0.10)",
                  color: companionOpen ? "hsl(var(--orange))" : "hsl(var(--foreground) / 0.7)",
                  boxShadow: companionOpen ? "var(--glow-orange)" : "none",
                }}
              >
                <MessageSquare size={14} />
                {companionOpen ? "Hide AI" : "Ask AI"}
              </button>
            </div>
          </div>
        </header>

        {/* Content grid */}
        <div className={`flex gap-5 flex-1 items-start ${companionOpen ? "grid-cols-[1fr_340px]" : ""}`}
             style={{ display: "grid", gridTemplateColumns: companionOpen ? "minmax(0,1fr) 340px" : "minmax(0,1fr)" }}>

          {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
          {viewMode === "graph" ? (
            <div className="rounded-2xl overflow-hidden min-h-[calc(100vh-160px)] p-2.5"
                 style={{
                   background: "rgba(8,8,12,0.7)",
                   border: "1px solid rgba(255,255,255,0.07)",
                   boxShadow: "var(--shadow-md)",
                 }}>
              <KnowledgeGraph nodes={graphData.nodes} edges={graphData.edges} onNodeClick={handleGraphNodeClick} />
            </div>
          ) : viewMode === "study" ? (
            <StudyView accessToken={accessToken!} workspaceId={activeWorkspaceId!} />
          ) : (
            <div className="rounded-2xl overflow-hidden min-h-[calc(100vh-160px)]"
                 style={{
                   background: "rgba(10,10,15,0.65)",
                   border: "1px solid rgba(255,255,255,0.07)",
                   backdropFilter: "blur(12px)",
                   boxShadow: "var(--shadow-md)",
                 }}>
              {activePage ? (
                <>
                  {/* Page meta */}
                  <div className="flex items-center justify-between px-5 pt-4">
                    <div className="flex items-center gap-1 font-mono text-[0.72rem] text-foreground/25">
                      <span className="truncate max-w-[80px]">{activeNotebook?.title ?? "Notebook"}</span>
                      <span className="text-foreground/15">›</span>
                      <span className="truncate max-w-[80px]">{activeSection?.title ?? "Section"}</span>
                      <span className="text-foreground/15">›</span>
                      <strong className="text-foreground/45 font-medium truncate max-w-[140px]">{activePage.title}</strong>
                    </div>
                    <button
                      onClick={() => generateFlashcardsMutation.mutate()}
                      disabled={generateFlashcardsMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[0.73rem] font-bold
                                 text-foreground/55 hover:text-foreground disabled:opacity-40 transition-all duration-200"
                      style={{
                        background: "rgba(167,139,250,0.08)",
                        border: "1px solid rgba(167,139,250,0.20)",
                      }}
                    >
                      <Zap size={10} className="text-purple-400" />
                      {generateFlashcardsMutation.isPending ? "Generating…" : "Generate Study Deck"}
                    </button>
                  </div>

                  {/* Tags */}
                  {activePage.tags && activePage.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-5 mt-2.5">
                      {activePage.tags.map((tag) => (
                        <span key={tag}
                          className="font-mono text-[0.74rem] rounded-full px-2.5 py-0.5 text-foreground/45"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <MicrocosmEditor
                    key={activePage.id}
                    blocks={activePage.blocks}
                    disabled={pageQuery.isLoading}
                    isSaving={updatePageMutation.isPending}
                    knowledgeStatus={activePage.knowledgeStatus}
                    onSave={(blocks) => {
                      const firstBlock = blocks[0];
                      const newTitle = firstBlock && typeof firstBlock.content === "string" && firstBlock.content.trim()
                        ? firstBlock.content.trim() : "Untitled Page";
                      updatePageMutation.mutate({ title: newTitle, blocks });
                    }}
                  />

                  {/* Related notes */}
                  {relatedPages.length > 0 && (
                    <div className="mt-10 pt-5 px-5 pb-5" style={{ borderTop: "1px dashed rgba(255,255,255,0.08)" }}>
                      <h3 className="text-[0.84rem] font-semibold text-foreground/30 mb-3 tracking-wider uppercase text-xs">Related Notes</h3>
                      <div className="flex flex-col gap-1.5">
                        {relatedPages.map((relPage) => (
                          <button
                            key={relPage.id}
                            onClick={() => handleNavigateToPage(relPage.id)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl
                                       text-left font-mono text-[0.81rem] w-full
                                       transition-all duration-150"
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.07)",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                          >
                            <FileText size={11} className="text-purple-400 flex-shrink-0" />
                            <strong className="text-foreground/70">{relPage.title}</strong>
                            <div className="flex gap-1 ml-auto">
                              {relPage.tags.map((t) => (
                                <span key={t} className="text-[0.65rem] px-1.5 py-0.5 rounded-full text-foreground/30"
                                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 min-h-[calc(100vh-220px)] px-8 py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-2"
                       style={{ background: "rgba(240,125,42,0.10)", boxShadow: "var(--glow-orange)" }}>
                    <Sparkles size={26} className="text-[hsl(var(--orange))]" />
                  </div>
                  <h2 className="font-serif text-[1.55rem] font-bold text-foreground/70 tracking-tight m-0">
                    {hierarchyState}
                  </h2>
                  <p className="text-foreground/35 text-[0.9rem] leading-relaxed max-w-[440px] m-0">
                    Microcosm needs a space, notebook, section, and page before the editor can save knowledge blocks.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {workspaces.length === 0 && (
                      <button onClick={() => createWorkspaceMutation.mutate()} disabled={createWorkspaceMutation.isPending}
                        className="flex items-center gap-1.5 min-h-[33px] px-4 rounded-xl text-[hsl(var(--orange))] text-sm font-semibold hover:-translate-y-px transition-all duration-200"
                        style={{ background: "rgba(240,125,42,0.10)", border: "1px solid rgba(240,125,42,0.25)" }}>
                        <Plus size={12} /> Create space
                      </button>
                    )}
                    {activeWorkspaceId && notebooks.length === 0 && (
                      <button onClick={() => createNotebookMutation.mutate()} disabled={createNotebookMutation.isPending}
                        className="flex items-center gap-1.5 min-h-[33px] px-4 rounded-xl text-[hsl(var(--orange))] text-sm font-semibold hover:-translate-y-px transition-all duration-200"
                        style={{ background: "rgba(240,125,42,0.10)", border: "1px solid rgba(240,125,42,0.25)" }}>
                        <Plus size={12} /> Create notebook
                      </button>
                    )}
                    {activeNotebookId && sections.length === 0 && (
                      <button onClick={() => createSectionMutation.mutate()} disabled={createSectionMutation.isPending}
                        className="flex items-center gap-1.5 min-h-[33px] px-4 rounded-xl text-[hsl(var(--orange))] text-sm font-semibold hover:-translate-y-px transition-all duration-200"
                        style={{ background: "rgba(240,125,42,0.10)", border: "1px solid rgba(240,125,42,0.25)" }}>
                        <Plus size={12} /> Create section
                      </button>
                    )}
                    {activeSectionId && pages.length === 0 && (
                      <button onClick={() => createPageMutation.mutate()} disabled={createPageMutation.isPending}
                        className="flex items-center gap-1.5 min-h-[33px] px-4 rounded-xl text-[hsl(var(--orange))] text-sm font-semibold hover:-translate-y-px transition-all duration-200"
                        style={{ background: "rgba(240,125,42,0.10)", border: "1px solid rgba(240,125,42,0.25)" }}>
                        <Plus size={12} /> Create page
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── AI COMPANION PANEL ────────────────────────────────────────── */}
          <AnimatePresence>
            {companionOpen && (
              <motion.aside
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sticky top-6 overflow-hidden font-sans"
                style={{
                  height: "calc(100vh - 148px)",
                  background: "rgba(10,10,16,0.82)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: "1.25rem",
                  backdropFilter: "blur(28px)",
                  boxShadow: "var(--shadow-lg)",
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 font-mono text-xs"
                     style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      {/* Mac traffic lights */}
                      <div className="flex gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      </div>
                      <div className="ml-1 flex items-center gap-1 text-foreground font-semibold">
                        <span className="text-blue-400">const</span>
                        <span>companion</span>
                        <span className="text-foreground/40">=</span>
                        <span className="text-gradient-warm font-bold font-sans">AI;</span>
                      </div>
                    </div>
                    {/* Live status */}
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground pl-0.5 mt-0.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                      </span>
                      <span>
                        {chatMutation.isPending
                          ? "Generating…"
                          : `Scope: ${chatScope.charAt(0).toUpperCase() + chatScope.slice(1)}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {chatHistory.length > 0 && activeSectionId && (
                      <button
                        onClick={handleSaveChatToPage}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 transition-all text-purple-400 hover:text-purple-300"
                        title="Export AI conversation as a new note page"
                      >
                        <FilePlus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {chatHistory.length > 0 && (
                      <button
                        onClick={() => setChatHistory([])}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 transition-all text-foreground/60 hover:text-foreground"
                        title="Clear conversation"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setCompanionOpen(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/8 transition-all text-foreground/60 hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scope selector */}
                <div className="grid grid-cols-3 gap-1 mx-3 my-2 p-1 rounded-xl flex-shrink-0"
                     style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {(["workspace", "notebook", "page"] as const).map((scope) => (
                    <button
                      key={scope}
                      onClick={() => setChatScope(scope)}
                      disabled={(scope === "notebook" && !activeNotebookId) || (scope === "page" && !activePageId)}
                      title={scope.charAt(0).toUpperCase() + scope.slice(1)}
                      className={`flex items-center justify-center h-7 rounded-lg transition-all duration-200
                                  ${
                                    chatScope === scope
                                      ? "text-foreground"
                                      : "bg-transparent text-muted-foreground hover:text-foreground/70"
                                  }
                                  disabled:opacity-30 disabled:cursor-not-allowed`}
                      style={chatScope === scope ? { background: "rgba(255,255,255,0.10)", boxShadow: "var(--shadow-xs)" } : {}}
                    >
                      {scope === "workspace" && <Layers3 size={12} />}
                      {scope === "notebook" && <BookOpen size={12} />}
                      {scope === "page" && <FileText size={12} />}
                    </button>
                  ))}
                </div>

                {/* Chat body */}
                <div ref={chatBodyRef}
                     className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 custom-scrollbar min-h-0">

                  {chatHistory.length === 0 && !chatMutation.isPending && (
                    <CompanionWelcomeSequence chatScope={chatScope} onSend={handleSendSuggestion} />
                  )}

                  <AnimatePresence initial={false}>
                    {chatHistory.map((msg, i) => {
                      const isUser = msg.role === "user";
                      return (
                        <motion.div
                          key={i}
                          className={`flex items-start gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        >
                          {/* Avatar */}
                          <div className={`w-7 h-7 flex items-center justify-center text-xs flex-shrink-0 rounded-full
                                           ${isUser
                                             ? "text-white"
                                             : "text-foreground"}`}
                               style={isUser
                                 ? { background: "var(--gradient-warm)" }
                                 : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                            {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                          </div>

                          <div className="flex flex-col max-w-[78%]">
                            {/* AI label + actions */}
                            {!isUser && (
                              <div className="flex items-center justify-between mb-1.5 w-full">
                                <div className="flex items-center gap-1.5 font-mono text-[0.63rem] font-bold tracking-widest uppercase text-purple-400">
                                  <Bot size={10} /> Assistant
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleCopyMessage(msg.content, i)} title="Copy"
                                    className="grid place-items-center w-5.5 h-5.5 border border-foreground/10 text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-all">
                                    {copiedMessageIndex === i ? <Check size={10} /> : <Copy size={10} />}
                                  </button>
                                  {activePageId && (
                                    <button onClick={() => handleInsertMessage(msg.content, i)} title="Insert into page"
                                      className="grid place-items-center w-5.5 h-5.5 border border-foreground/10 text-muted-foreground hover:text-foreground hover:border-foreground/25 transition-all">
                                      {insertedMessageIndex === i ? <Check size={10} className="text-emerald-400" /> : <PlusSquare size={10} />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Bubble */}
                            <div className={`px-3.5 py-2.5 text-sm leading-relaxed
                                             ${isUser
                                               ? "text-white rounded-2xl rounded-tr-sm"
                                               : "text-foreground rounded-2xl rounded-tl-sm"}`}
                                 style={isUser
                                   ? { background: "var(--gradient-user-bubble)" }
                                   : {
                                       background: "rgba(255,255,255,0.06)",
                                       border: "1px solid rgba(255,255,255,0.09)",
                                     }}>
                              {isUser
                                ? msg.content
                                : <ReactMarkdown className="markdown-prose">{msg.content}</ReactMarkdown>
                              }
                            </div>

                            {/* Source citations */}
                            {!isUser && msg.sources && msg.sources.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-dashed border-foreground/15">
                                <div className="w-full text-[9px] font-mono font-bold text-muted-foreground tracking-wider uppercase">
                                  Sources
                                </div>
                                {msg.sources.map((source, si) => (
                                  <CitationBadge
                                    key={source.pageId}
                                    source={source}
                                    index={si + 1}
                                    onNavigate={handleNavigateToPage}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  {chatMutation.isPending && (
                    <motion.div
                      className="flex items-start gap-2.5"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="w-7 h-7 flex items-center justify-center text-xs flex-shrink-0 rounded-full"
                           style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5"
                           style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                        <span className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Chat input */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                  className="p-3 flex items-center gap-2 flex-shrink-0"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
                >
                  <input
                    ref={chatInputRef}
                    id="neo-input"
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Ask from this ${chatScope}…`}
                    disabled={chatMutation.isPending}
                    className="flex-1 min-w-0 rounded-xl px-3 py-2 text-xs
                               focus:outline-none font-mono text-foreground placeholder:text-muted-foreground
                               disabled:opacity-50 transition-all duration-200"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.09)",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "rgba(240,125,42,0.40)";
                      e.target.style.boxShadow = "0 0 0 3px rgba(240,125,42,0.08)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "rgba(255,255,255,0.09)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatMutation.isPending}
                    className="p-2.5 rounded-xl text-white
                               hover:-translate-y-px active:translate-y-0
                               disabled:opacity-40 transition-all duration-200 flex-shrink-0"
                    style={{ background: "var(--gradient-warm)", boxShadow: "var(--shadow-sm)" }}
                  >
                    {chatMutation.isPending
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}
