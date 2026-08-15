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
    <div className="fixed inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm z-50 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm p-8 bg-card border-2 border-foreground text-foreground"
        style={{ boxShadow: "8px 8px 0px 0px rgba(255,255,255,0.12)" }}
      >
        <div className="flex items-center justify-center w-12 h-12 mb-6 border-2 border-foreground text-[hsl(var(--orange))]">
          <Sparkles size={22} />
        </div>
        <h2 className="font-serif text-2xl font-bold mb-2 text-foreground">Welcome to Microcosm</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Let's set up your first notebook. What area of knowledge will you start with?
        </p>
        <input
          className="w-full bg-background border-2 border-foreground/25 focus:border-foreground px-3 py-2.5
                     text-sm text-foreground placeholder:text-muted-foreground outline-none mb-4 transition-colors"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && !isPending && onStart(name)}
          disabled={isPending}
          placeholder="e.g. Personal, Engineering, Research…"
        />
        <button
          className="flex items-center justify-center gap-2 w-full min-h-[42px] px-6
                     bg-foreground text-background border-2 border-foreground font-bold text-sm
                     hover:bg-secondary hover:text-foreground disabled:opacity-40
                     hover:-translate-y-0.5 active:translate-y-0 transition-all"
          style={{ boxShadow: "3px 3px 0px 0px rgba(255,255,255,0.15)" }}
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
    mutationFn: () => createNotebook(accessToken!, activeWorkspaceId!, { title: "New Notebook" }),
    onSuccess: (result) => {
      setActiveNotebookId(result.data.notebook.id);
      void queryClient.invalidateQueries({ queryKey: ["notebooks", activeWorkspaceId] });
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
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["sections", activeNotebookId] }); setRenamingItemId(null); },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (id: string) => deleteSection(accessToken!, id),
    onSuccess: (_, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ["sections", activeNotebookId] });
      if (activeSectionId === deletedId) { setActiveSectionId(null); setActivePageId(null); }
    },
  });

  const createPageMutation = useMutation({
    mutationFn: () => createPage(accessToken!, activeSectionId!, { title: "Untitled Page", emoji: "", blocks: emptyBlocks }),
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
    <main className="flex min-h-screen bg-background text-foreground font-sans">

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
                        border-r border-foreground/8 overflow-y-auto
                        scrollbar-thin custom-scrollbar transition-all duration-200
                        ${sidebarCollapsed ? "w-16" : "w-[272px]"}`}
             style={{ background: "rgba(4,4,5,0.96)", backdropFilter: "blur(24px)" }}>

        {/* Brand row */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-foreground/8 flex-shrink-0 mb-2">
          {!sidebarCollapsed && (
            <span className="font-mono text-[0.92rem] font-black tracking-tight text-foreground">
              <span className="text-blue-400">&lt;</span>
              Microcosm
              <span className="text-blue-400"> /&gt;</span>
            </span>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="grid place-items-center w-7 h-7 border border-foreground/15 text-muted-foreground
                         hover:border-foreground/30 hover:text-foreground transition-all"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={13} /> : <PanelLeftClose size={13} />}
            </button>
            {!sidebarCollapsed && (
              <button
                className="grid place-items-center w-7 h-7 border border-foreground/15 text-muted-foreground
                           hover:border-foreground/30 hover:text-foreground transition-all"
                aria-label="New space"
                onClick={() => createWorkspaceMutation.mutate()}
                disabled={createWorkspaceMutation.isPending}
              >
                <Plus size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Primary nav */}
        <nav className="flex flex-col gap-0.5 px-2 pb-3 border-b border-foreground/8 mb-1">
          <button
            onClick={() => setViewMode("editor")}
            className="flex items-center gap-2.5 min-h-[33px] px-2.5 text-muted-foreground text-[0.87rem]
                       hover:text-foreground hover:bg-foreground/5 transition-all rounded-none text-left"
          >
            <Home size={14} /> {!sidebarCollapsed && "Home"}
          </button>
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center justify-between min-h-[33px] px-2.5 text-muted-foreground text-[0.87rem]
                       hover:text-foreground hover:bg-foreground/5 transition-all rounded-none text-left"
          >
            <span className="flex items-center gap-2.5"><Search size={14} /> {!sidebarCollapsed && "Search"}</span>
            {!sidebarCollapsed && (
              <span className="font-mono text-[9px] border border-foreground/20 px-1 py-0.5 text-foreground/40 font-bold">Ctrl+K</span>
            )}
          </button>
          <button
            onClick={() => setCompanionOpen((o) => !o)}
            className="flex items-center gap-2.5 min-h-[33px] px-2.5 text-muted-foreground text-[0.87rem]
                       hover:text-foreground hover:bg-foreground/5 transition-all rounded-none text-left"
          >
            <Bot size={14} /> {!sidebarCollapsed && "Companion"}
          </button>
        </nav>

        {/* Library tree */}
        <div className="flex-1 min-h-0 overflow-y-auto px-2 pt-3 custom-scrollbar">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="font-mono text-[0.67rem] font-bold tracking-widest uppercase text-foreground/30">
              // library
            </span>
            {activeWorkspaceId && (
              <button
                className="grid place-items-center w-5 h-5 border border-foreground/12 text-foreground/30
                           hover:border-foreground/25 hover:text-foreground transition-all"
                disabled={createNotebookMutation.isPending}
                onClick={() => createNotebookMutation.mutate()}
              >
                <Plus size={10} />
              </button>
            )}
          </div>

          {activeWorkspaceId && notebooks.length === 0 && !notebooksQuery.isLoading && (
            <div className="border border-dashed border-foreground/10 p-2.5 mb-2">
              <p className="text-foreground/30 text-xs mb-2">No notebooks yet.</p>
              <button
                onClick={() => createNotebookMutation.mutate()}
                disabled={createNotebookMutation.isPending}
                className="text-xs text-blue-400 border border-blue-400/25 px-2.5 py-1 hover:bg-blue-400/8 transition-all"
              >
                + New notebook
              </button>
            </div>
          )}

          <div className="flex flex-col gap-px">
            {notebooks.map((notebook) => (
              <div key={notebook.id}>
                {/* Notebook row */}
                <div className={`flex items-center w-full min-h-[33px] group
                                 ${notebook.id === activeNotebookId ? "bg-foreground/5 text-foreground" : "text-foreground/65 hover:bg-foreground/4 hover:text-foreground/85"}
                                 transition-all`}>
                  <button
                    className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1.5 text-[0.87rem] font-semibold text-left"
                    onClick={() => { setActiveNotebookId(notebook.id); setActiveSectionId(null); setActivePageId(null); }}
                  >
                    <ChevronDown size={11} className="flex-shrink-0 transition-transform"
                      style={{ transform: notebook.id === activeNotebookId ? "rotate(0deg)" : "rotate(-90deg)" }} />
                    <BookOpen size={12} className="flex-shrink-0" />
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
                    <button onClick={() => startRenaming(notebook.id, notebook.title)}
                      className="grid place-items-center w-5 h-5 text-foreground/40 hover:text-foreground transition-colors">
                      <Edit2 size={10} />
                    </button>
                    <button onClick={() => { if (window.confirm("Delete this notebook?")) deleteNotebookMutation.mutate(notebook.id); }}
                      disabled={deleteNotebookMutation.isPending}
                      className="grid place-items-center w-5 h-5 text-red-500/60 hover:text-red-400 transition-colors">
                      <Trash2 size={10} />
                    </button>
                    {notebook.id === activeNotebookId && (
                      <button onClick={() => createSectionMutation.mutate()} disabled={createSectionMutation.isPending}
                        className="grid place-items-center w-5 h-5 text-blue-400/60 hover:text-blue-400 transition-colors">
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
                        <div className={`flex items-center w-full min-h-[29px] group
                                         ${section.id === activeSectionId ? "text-foreground/85" : "text-foreground/45 hover:text-foreground/70"}
                                         transition-all`}>
                          <button
                            className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1 text-[0.83rem] text-left"
                            onClick={() => { setActiveSectionId(section.id); setActivePageId(null); }}
                          >
                            <Folder size={11} className="flex-shrink-0" />
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
                            <button onClick={() => startRenaming(section.id, section.title)}
                              className="grid place-items-center w-4.5 h-4.5 text-foreground/35 hover:text-foreground transition-colors">
                              <Edit2 size={9} />
                            </button>
                            <button onClick={() => { if (window.confirm("Delete this section?")) deleteSectionMutation.mutate(section.id); }}
                              disabled={deleteSectionMutation.isPending}
                              className="grid place-items-center w-4.5 h-4.5 text-red-500/50 hover:text-red-400 transition-colors">
                              <Trash2 size={9} />
                            </button>
                            {section.id === activeSectionId && (
                              <button onClick={() => createPageMutation.mutate()} disabled={createPageMutation.isPending}
                                className="grid place-items-center w-4.5 h-4.5 text-blue-400/50 hover:text-blue-400 transition-colors">
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
                                className={`flex items-center min-h-[27px] relative group
                                             ${page.id === activePageId ? "text-foreground" : "text-foreground/35 hover:text-foreground/60"}
                                             transition-all`}>
                                {page.id === activePageId && (
                                  <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-[hsl(var(--orange))]" />
                                )}
                                <button
                                  className="flex items-center gap-1.5 flex-1 min-w-0 px-2 py-1 text-[0.81rem] text-left"
                                  onClick={() => setActivePageId(page.id)}
                                >
                                  <FileText size={10} className="flex-shrink-0" />
                                  <span className="truncate">{page.title}</span>
                                </button>
                                <button
                                  onClick={() => { if (window.confirm("Delete this page?")) deletePageMutation.mutate(page.id); }}
                                  disabled={deletePageMutation.isPending}
                                  className="hidden group-hover:grid place-items-center w-4 h-4 mr-1 text-red-500/50 hover:text-red-400 transition-colors">
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
        </div>

        {/* Documents section */}
        <div className="px-2 pt-3 border-t border-foreground/10 mt-2">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="font-mono text-[0.67rem] font-bold tracking-widest uppercase text-foreground/30">
              // documents
            </span>
            {activeWorkspaceId && (
              <button
                className="grid place-items-center w-5 h-5 border border-foreground/12 text-foreground/30
                           hover:border-foreground/25 hover:text-foreground transition-all"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadDocumentMutation.isPending}
              >
                <Plus size={10} />
              </button>
            )}
          </div>

          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileChange} />

          {activeWorkspaceId && documents.length === 0 && !documentsQuery.isLoading && (
            <div className="border border-dashed border-foreground/10 p-2.5 mb-2">
              <p className="text-foreground/30 text-xs mb-2">No documents yet.</p>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadDocumentMutation.isPending}
                className="text-xs text-blue-400 border border-blue-400/25 px-2.5 py-1 hover:bg-blue-400/8 transition-all">
                + Upload PDF
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1.5 pb-2">
            {documents.map((doc) => (
              <div key={doc.id}
                className="flex items-center justify-between px-2 py-1.5 border border-foreground/10 bg-foreground/2 gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <FileText size={10} className="flex-shrink-0 text-foreground/30" />
                  <span className="text-[0.77rem] font-mono text-foreground/55 truncate" title={doc.title}>
                    {doc.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(doc.status === "pending" || doc.status === "processing") ? (
                    <span className="text-[0.55rem] font-mono font-bold px-1.5 py-0.5 border border-blue-400/30 text-blue-400">syncing</span>
                  ) : doc.status === "indexed" ? (
                    <span className="text-[0.55rem] font-mono font-bold px-1.5 py-0.5 border border-emerald-500/30 text-emerald-400">ready</span>
                  ) : (
                    <span className="text-[0.55rem] font-mono font-bold px-1.5 py-0.5 border border-red-500/30 text-red-400">failed</span>
                  )}
                  <button
                    onClick={() => { if (window.confirm("Delete this document?")) deleteDocumentMutation.mutate(doc.id); }}
                    className="text-foreground/25 hover:text-red-400 transition-colors">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-foreground/8 px-2 pb-3 flex-shrink-0 flex flex-col gap-1">
          <div className="flex items-center gap-2.5 px-2 py-2.5 border border-foreground/10 bg-foreground/2 mb-1">
            <div className="grid place-items-center w-7 h-7 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black flex-shrink-0">
              {user?.name?.slice(0, 1).toUpperCase() ?? "M"}
            </div>
            <div className="min-w-0">
              <strong className="block text-[0.83rem] font-semibold text-foreground truncate">{user?.name ?? "Microcosm User"}</strong>
              <small className="block text-[0.71rem] text-foreground/35 truncate">{user?.email}</small>
            </div>
          </div>
          <a href="#"
            className="flex items-center gap-2 min-h-[30px] px-2.5 text-foreground/45 text-[0.85rem]
                       hover:text-foreground hover:bg-foreground/5 transition-all">
            <Settings size={13} /> Settings
          </a>
          <button
            onClick={() => void logout()}
            className="flex items-center gap-2 min-h-[30px] px-2.5 text-foreground/45 text-[0.85rem]
                       hover:text-foreground hover:bg-foreground/5 transition-all text-left">
            <LogOut size={13} /> Logout
          </button>
        </div>
      </aside>

      {/* ── WORKSPACE ────────────────────────────────────────────────────── */}
      <section className="flex flex-col flex-1 min-w-0 min-h-screen px-7 pt-6 pb-7 gap-0">

        {/* Topbar */}
        <header className="flex items-center justify-between gap-5 pb-5 border-b border-foreground/8 mb-5 flex-shrink-0">
          <div className="min-w-0">
            <p className="font-mono text-xs text-blue-400 tracking-wider mb-1">
              import {"{ Knowledge }"} from "@you/memory"
            </p>
            <h1 className="font-serif text-[1.85rem] font-bold leading-[1.1] tracking-tight text-foreground m-0">
              {activeWorkspace?.name
                ? <span className="text-[hsl(var(--orange))]">{activeWorkspace.name}</span>
                : <span>Microcosm</span>}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* View mode segmented control */}
            {activeWorkspaceId && (
              <div className="flex gap-1.5 border border-foreground/20 bg-secondary p-1"
                   style={{ boxShadow: "2px 2px 0px rgba(255,255,255,0.08)" }}>
                {(["editor", "graph", "study"] as const).map((mode) => (
                  <button key={mode} onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 font-mono text-[0.77rem] transition-all ${
                      viewMode === mode
                        ? "bg-purple-500 text-white font-bold"
                        : "bg-transparent text-foreground/50 hover:text-foreground"
                    }`}>
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
                className="flex items-center gap-2 min-h-[36px] px-4 border border-foreground/20 bg-secondary
                           text-foreground/70 text-sm font-semibold hover:text-foreground hover:border-foreground/35
                           transition-all"
                style={{ boxShadow: "2px 2px 0px rgba(255,255,255,0.08)" }}
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
            <div className="border border-foreground/12 min-h-[calc(100vh-160px)] overflow-hidden p-2.5"
                 style={{ background: "rgba(8,8,10,0.7)" }}>
              <KnowledgeGraph nodes={graphData.nodes} edges={graphData.edges} onNodeClick={handleGraphNodeClick} />
            </div>
          ) : viewMode === "study" ? (
            <StudyView accessToken={accessToken!} workspaceId={activeWorkspaceId!} />
          ) : (
            <div className="border border-foreground/12 min-h-[calc(100vh-160px)] overflow-hidden"
                 style={{ background: "rgba(8,8,10,0.7)" }}>
              {activePage ? (
                <>
                  {/* Page meta */}
                  <div className="flex items-center justify-between px-5 pt-4">
                    <div className="flex items-center gap-1.5 font-mono text-[0.73rem] text-foreground/30">
                      <span>{activeWorkspace?.name ?? "Space"}</span>
                      <span className="text-foreground/20">›</span>
                      <span>{activeNotebook?.title ?? "Notebook"}</span>
                      <span className="text-foreground/20">›</span>
                      <span>{activeSection?.title ?? "Section"}</span>
                      <span className="text-foreground/20">›</span>
                      <strong className="text-foreground/50 font-medium">{activePage.title}</strong>
                    </div>
                    <button
                      onClick={() => generateFlashcardsMutation.mutate()}
                      disabled={generateFlashcardsMutation.isPending}
                      className="flex items-center gap-1.5 px-2.5 py-1 font-mono text-[0.73rem] font-bold
                                 border border-foreground/15 text-foreground/50 hover:border-foreground/30
                                 hover:text-foreground disabled:opacity-40 transition-all"
                      style={{ boxShadow: "1.5px 1.5px 0px rgba(255,255,255,0.08)" }}
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
                          className="font-mono text-[0.74rem] border border-foreground/10 px-2 py-0.5 text-foreground/40"
                          style={{ boxShadow: "1px 1px 0px rgba(255,255,255,0.06)" }}>
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
                    <div className="mt-10 border-t-2 border-dashed border-foreground/10 pt-5 px-5 pb-5">
                      <h3 className="font-mono text-[0.84rem] lowercase text-foreground/30 mb-3">
                        // related notes
                      </h3>
                      <div className="flex flex-col gap-1.5">
                        {relatedPages.map((relPage) => (
                          <button
                            key={relPage.id}
                            onClick={() => handleNavigateToPage(relPage.id)}
                            className="flex items-center gap-2 px-3 py-2 border border-foreground/10 bg-foreground/2
                                       text-left font-mono text-[0.81rem] w-full
                                       hover:border-foreground/25 hover:bg-foreground/4 transition-all"
                            style={{ boxShadow: "1.5px 1.5px 0px rgba(255,255,255,0.06)" }}
                          >
                            <FileText size={11} className="text-purple-400 flex-shrink-0" />
                            <strong className="text-foreground/70">{relPage.title}</strong>
                            <div className="flex gap-1 ml-auto">
                              {relPage.tags.map((t) => (
                                <span key={t} className="text-[0.65rem] px-1 py-0.5 border border-foreground/10 text-foreground/30">
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
                  <Sparkles size={26} className="text-[hsl(var(--orange))] opacity-70" />
                  <h2 className="font-serif text-[1.55rem] font-bold text-foreground/70 tracking-tight m-0">
                    {hierarchyState}
                  </h2>
                  <p className="text-foreground/35 text-[0.9rem] leading-relaxed max-w-[440px] m-0">
                    Microcosm needs a space, notebook, section, and page before the editor can save knowledge blocks.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {workspaces.length === 0 && (
                      <button onClick={() => createWorkspaceMutation.mutate()} disabled={createWorkspaceMutation.isPending}
                        className="flex items-center gap-1.5 min-h-[33px] px-4 border border-foreground/25 text-[hsl(var(--orange))] text-sm font-semibold hover:bg-foreground/5 transition-all">
                        <Plus size={12} /> Create space
                      </button>
                    )}
                    {activeWorkspaceId && notebooks.length === 0 && (
                      <button onClick={() => createNotebookMutation.mutate()} disabled={createNotebookMutation.isPending}
                        className="flex items-center gap-1.5 min-h-[33px] px-4 border border-foreground/25 text-[hsl(var(--orange))] text-sm font-semibold hover:bg-foreground/5 transition-all">
                        <Plus size={12} /> Create notebook
                      </button>
                    )}
                    {activeNotebookId && sections.length === 0 && (
                      <button onClick={() => createSectionMutation.mutate()} disabled={createSectionMutation.isPending}
                        className="flex items-center gap-1.5 min-h-[33px] px-4 border border-foreground/25 text-[hsl(var(--orange))] text-sm font-semibold hover:bg-foreground/5 transition-all">
                        <Plus size={12} /> Create section
                      </button>
                    )}
                    {activeSectionId && pages.length === 0 && (
                      <button onClick={() => createPageMutation.mutate()} disabled={createPageMutation.isPending}
                        className="flex items-center gap-1.5 min-h-[33px] px-4 border border-foreground/25 text-[hsl(var(--orange))] text-sm font-semibold hover:bg-foreground/5 transition-all">
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
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col sticky top-6 border-2 border-foreground overflow-hidden font-sans"
                style={{
                  height: "calc(100vh - 148px)",
                  background: "hsl(var(--card))",
                  boxShadow: "5px 5px 0px 0px rgba(255,255,255,0.12)",
                }}
              >
                {/* Header — Mac-style code bar */}
                <div className="flex items-center justify-between p-3 border-b-2 border-foreground bg-secondary flex-shrink-0 font-mono text-xs">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      {/* Mac traffic lights */}
                      <div className="flex gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 border border-foreground/20" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 border border-foreground/20" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-foreground/20" />
                      </div>
                      <div className="ml-1 flex items-center gap-1 text-foreground font-semibold">
                        <span className="text-blue-400">const</span>
                        <span>companion</span>
                        <span className="text-foreground/50">=</span>
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
                        className="w-7 h-7 flex items-center justify-center hover:bg-card border border-transparent hover:border-foreground/20 transition-all text-purple-400 hover:text-purple-300"
                        title="Export AI conversation as a new note page"
                      >
                        <FilePlus className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {chatHistory.length > 0 && (
                      <button
                        onClick={() => setChatHistory([])}
                        className="w-7 h-7 flex items-center justify-center hover:bg-card border border-transparent hover:border-foreground/20 transition-all text-foreground/60 hover:text-foreground"
                        title="Clear conversation"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setCompanionOpen(false)}
                      className="w-7 h-7 flex items-center justify-center hover:bg-card border border-transparent hover:border-foreground/20 transition-all text-foreground/60 hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Scope selector */}
                <div className="grid grid-cols-3 gap-0.5 mx-3 my-2.5 p-0.5 border border-foreground/12 bg-background/40 flex-shrink-0">
                  {(["workspace", "notebook", "page"] as const).map((scope) => (
                    <button
                      key={scope}
                      onClick={() => setChatScope(scope)}
                      disabled={(scope === "notebook" && !activeNotebookId) || (scope === "page" && !activePageId)}
                      className={`flex items-center justify-center gap-1.5 h-7 text-xs font-semibold transition-all
                                  ${chatScope === scope
                                    ? "bg-foreground/10 text-foreground"
                                    : "bg-transparent text-muted-foreground hover:text-foreground/70"}
                                  disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {scope === "workspace" && <Layers3 size={10} />}
                      {scope === "notebook" && <BookOpen size={10} />}
                      {scope === "page" && <FileText size={10} />}
                      {scope.charAt(0).toUpperCase() + scope.slice(1)}
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
                          <div className={`w-7 h-7 flex items-center justify-center text-xs flex-shrink-0 border border-foreground
                                           ${isUser ? "bg-foreground text-background" : "bg-secondary text-foreground"}`}
                               style={{ boxShadow: "1px 1px 0px rgba(255,255,255,0.1)" }}>
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
                            <div className={`px-3.5 py-2.5 border text-sm leading-relaxed
                                             ${isUser
                                               ? "bg-foreground text-background border-foreground rounded-xl rounded-tr-none"
                                               : "bg-secondary text-foreground border-foreground/15 rounded-xl rounded-tl-none"}`}>
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
                      <div className="w-7 h-7 bg-secondary border border-foreground flex items-center justify-center text-xs flex-shrink-0"
                           style={{ boxShadow: "1px 1px 0px rgba(255,255,255,0.1)" }}>
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                      <div className="bg-secondary border border-foreground/15 px-4 py-3 rounded-xl rounded-tl-none flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Chat input */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                  className="p-3 border-t-2 border-foreground bg-secondary/40 flex items-center gap-2 flex-shrink-0"
                >
                  <input
                    ref={chatInputRef}
                    id="neo-input"
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Ask from this ${chatScope}…`}
                    disabled={chatMutation.isPending}
                    className="flex-1 min-w-0 bg-card border-2 border-foreground px-3 py-2 text-xs
                               focus:outline-none font-mono text-foreground placeholder:text-muted-foreground
                               disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatMutation.isPending}
                    className="p-2.5 bg-foreground text-background border-2 border-foreground
                               hover:bg-secondary hover:text-foreground hover:-translate-y-px
                               active:translate-y-0 disabled:opacity-40 transition-all flex-shrink-0"
                    style={{ boxShadow: "2px 2px 0px rgba(255,255,255,0.1)" }}
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
