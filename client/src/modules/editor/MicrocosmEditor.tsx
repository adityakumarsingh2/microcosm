import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import ImageExtension from "@tiptap/extension-image";
import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Code,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  CheckSquare,
  Quote,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Database,
} from "lucide-react";
import type { PageBlock } from "../workspace/content.api";
import { BlockIdExtension } from "./BlockIdExtension";
import { ImagePasteExtension } from "./ImagePasteExtension";
import { ResizableImageExtension } from "./ResizableImageExtension";
import { SlashCommandExtension, getSuggestionItems, renderItems } from "./SlashCommandExtension";
import { uploadImageFile } from "../uploads/uploads.api";

// ── Types ──────────────────────────────────────────────────────────────────

type RichNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  text?: string;
};

type KnowledgeStatus = "not_indexed" | "pending" | "indexed" | "failed";

type MicrocosmEditorProps = {
  blocks: PageBlock[];
  disabled?: boolean;
  isSaving?: boolean;
  knowledgeStatus?: KnowledgeStatus;
  onSave: (blocks: PageBlock[]) => void;
};

// ── Constants ──────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY_MS = 1400;

// ── Helpers ────────────────────────────────────────────────────────────────

function createBlockId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function textFromNode(node: RichNode): string {
  if (node.text) return node.text;
  return node.content?.map(textFromNode).join("") ?? "";
}

function blocksToDocument(blocks: PageBlock[]) {
  if (blocks.length === 0) {
    return {
      type: "doc",
      content: [{ type: "heading", attrs: { level: 1, blockId: createBlockId() } }],
    };
  }

  return {
    type: "doc",
    content: [...blocks]
      .sort((a, b) => a.position - b.position)
      .map((block) => {
        switch (block.type) {
          case "heading":
            return {
              type: "heading",
              attrs: { level: Number(block.properties?.level ?? 1), blockId: block.blockId },
              content: block.content ? [{ type: "text", text: String(block.content) }] : [],
            };
          case "quote":
            return {
              type: "blockquote",
              attrs: { blockId: block.blockId },
              content: [
                {
                  type: "paragraph",
                  content: block.content ? [{ type: "text", text: String(block.content) }] : [],
                },
              ],
            };
          case "code":
            return {
              type: "codeBlock",
              attrs: { language: String(block.properties?.language ?? ""), blockId: block.blockId },
              content: block.content ? [{ type: "text", text: String(block.content) }] : [],
            };
          case "image":
            return {
              type: "image",
              attrs: {
                src: String(block.content ?? ""),
                alt: String(block.properties?.alt ?? ""),
                width: block.properties?.width ?? "100%",
                blockId: block.blockId,
              },
            };
          default:
            return {
              type: "paragraph",
              attrs: { blockId: block.blockId },
              content: block.content ? [{ type: "text", text: String(block.content) }] : [],
            };
        }
      }),
  };
}

function documentToBlocks(document: RichNode): PageBlock[] {
  const seenIds = new Set<string>();

  return (document.content ?? [])
    .map((node, index): PageBlock | null => {
      const position = (index + 1) * 1000;
      let blockId = (node.attrs?.blockId as string) ?? "";
      if (!blockId || seenIds.has(blockId)) blockId = createBlockId();
      seenIds.add(blockId);

      switch (node.type) {
        case "heading":
          return {
            blockId, type: "heading",
            content: textFromNode(node),
            properties: { level: node.attrs?.level ?? 1 },
            position,
          };
        case "blockquote":
          return { blockId, type: "quote", content: textFromNode(node), properties: {}, position };
        case "codeBlock":
          return {
            blockId, type: "code",
            content: textFromNode(node),
            properties: { language: node.attrs?.language ?? "" },
            position,
          };
        case "image":
          return {
            blockId, type: "image",
            content: node.attrs?.src ?? "",
            properties: { alt: node.attrs?.alt ?? "", width: node.attrs?.width ?? "100%" },
            position,
          };
        default: {
          const text = textFromNode(node);
          if (!text.trim()) return null;
          return { blockId, type: "paragraph", content: text, properties: {}, position };
        }
      }
    })
    .filter((block): block is PageBlock => block !== null);
}

// ── Knowledge status pill ──────────────────────────────────────────────────

const KNOWLEDGE_CONFIG: Record<
  KnowledgeStatus,
  { label: string; icon: React.ReactNode; className: string }
> = {
  not_indexed: {
    label: "Not indexed",
    icon: <Database size={10} />,
    className: "knowledge-pill",
  },
  pending: {
    label: "Pending",
    icon: <Clock size={10} />,
    className: "knowledge-pill pending",
  },
  indexed: {
    label: "Indexed",
    icon: <CheckCircle2 size={10} />,
    className: "knowledge-pill indexed",
  },
  failed: {
    label: "Failed",
    icon: <AlertCircle size={10} />,
    className: "knowledge-pill failed",
  },
};

function KnowledgePill({ status }: { status: KnowledgeStatus }) {
  const cfg = KNOWLEDGE_CONFIG[status];
  return (
    <span className={cfg.className} title={`Knowledge layer: ${status}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Save state label ───────────────────────────────────────────────────────

type SaveState = "saved" | "dirty" | "scheduled" | "saving";

const SAVE_LABELS: Record<SaveState, string> = {
  saved:     "Saved",
  dirty:     "Unsaved",
  scheduled: "Queued",
  saving:    "Saving",
};

// ── Main component ─────────────────────────────────────────────────────────

export function MicrocosmEditor({
  blocks,
  disabled,
  isSaving,
  knowledgeStatus,
  onSave,
}: MicrocosmEditorProps) {
  const onSaveRef         = useRef(onSave);
  const autosaveTimerRef  = useRef<number | null>(null);
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const [saveState, setSaveState]     = useState<SaveState>("saved");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  // ── Editor instance ──────────────────────────────────────────────────────

  const editor = useEditor({
    extensions: [
      StarterKit,
      BlockIdExtension,
      ResizableImageExtension,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: "Type '/' for commands, or just start writing…" }),
      ImagePasteExtension,
      SlashCommandExtension.configure({
        suggestion: { items: getSuggestionItems, render: renderItems },
      }),
    ],
    content: blocksToDocument(blocks),
    editable: !disabled,
    editorProps: { attributes: { class: "microcosm-editor" } },
    onUpdate: ({ editor }) => {
      if (disabled) return;
      setSaveState("dirty");
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = window.setTimeout(() => {
        setSaveState("scheduled");
        onSaveRef.current(documentToBlocks(editor.getJSON() as RichNode));
      }, AUTOSAVE_DELAY_MS);
    },
  });

  // ── Sync blocks when page changes ────────────────────────────────────────

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(blocksToDocument(blocks), false);
    setSaveState("saved");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  // Transition from "scheduled" → "saving" → "saved"
  useEffect(() => {
    if (isSaving && saveState === "scheduled") setSaveState("saving");
    if (!isSaving && saveState === "saving")   setSaveState("saved");
  }, [isSaving, saveState]);

  // Cleanup autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    };
  }, []);

  // Listen for text insertion events from AI Companion
  useEffect(() => {
    if (!editor) return;
    const handleInsertText = (e: Event) => {
      const customEvent = e as CustomEvent<{ text: string }>;
      if (customEvent.detail?.text) {
        editor.chain().focus().insertContent(customEvent.detail.text).run();
      }
    };
    window.addEventListener("insert-ai-text", handleInsertText);
    return () => window.removeEventListener("insert-ai-text", handleInsertText);
  }, [editor]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function saveNow() {
    if (!editor) return;
    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current);
    setSaveState("scheduled");
    onSave(documentToBlocks(editor.getJSON() as RichNode));
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editor) return;
    try {
      setIsUploading(true);
      const asset = await uploadImageFile(file);
      editor.chain().focus().setImage({ src: asset.url, alt: file.name }).run();
    } catch {
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const effectiveSaveState: SaveState = isSaving ? "saving" : saveState;

  return (
    <div className="border border-foreground/10 rounded-none overflow-hidden"
         style={{ background: "rgba(6,6,8,0.7)" }}>
      {/* Hidden file input */}
      <input
        id="microcosm-image-upload-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5
                      border-b border-foreground/10 bg-black/20 font-mono text-xs text-foreground/40">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-foreground/25">// page</span>
          {knowledgeStatus && knowledgeStatus !== "not_indexed" && (
            <KnowledgePill status={knowledgeStatus} />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Save state pill */}
          <span className={`save-state ${effectiveSaveState}`}>
            {effectiveSaveState === "saving" && (
              <Loader2 size={10} className="animate-spin" />
            )}
            {SAVE_LABELS[effectiveSaveState]}
          </span>

          <div className="w-px h-4 bg-foreground/10 flex-shrink-0" />

          {/* Image upload */}
          <button
            disabled={!editor || disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
            title="Insert image"
            className="inline-flex items-center gap-1.5 min-h-[26px] px-2.5 border border-foreground/10
                       rounded-none bg-transparent text-foreground/50 text-[11px]
                       hover:border-foreground/25 hover:bg-secondary/50 hover:text-foreground
                       disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {isUploading ? (
              <><Loader2 size={11} className="animate-spin" /> Uploading</>
            ) : (
              <><ImageIcon size={11} /> Image</>
            )}
          </button>

          {/* Save now */}
          <button
            disabled={!editor || disabled || isSaving || saveState === "saved"}
            onClick={saveNow}
            title="Save now"
            className="inline-flex items-center gap-1.5 min-h-[26px] px-2.5 border border-foreground/10
                       rounded-none bg-transparent text-foreground/50 text-[11px]
                       hover:border-foreground/25 hover:bg-secondary/50 hover:text-foreground
                       disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Save now
          </button>
        </div>
      </div>

      {/* ── Bubble menu (text selection) ─────────────────────────────────── */}
      {editor && (
        <BubbleMenu editor={editor} className="bubble-menu">
          <button onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "is-active" : ""} title="Bold">
            <Bold size={13} />
          </button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "is-active" : ""} title="Italic">
            <Italic size={13} />
          </button>
          <button onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive("strike") ? "is-active" : ""} title="Strikethrough">
            <Strikethrough size={13} />
          </button>
          <button onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive("code") ? "is-active" : ""} title="Inline code">
            <Code size={13} />
          </button>
        </BubbleMenu>
      )}

      {/* ── Floating menu (empty line) ───────────────────────────────────── */}
      {editor && (
        <FloatingMenu editor={editor} className="floating-menu" tippyOptions={{ duration: 80 }}>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""} title="Heading 1">
            <Heading1 size={13} />
          </button>
          <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""} title="Heading 2">
            <Heading2 size={13} />
          </button>
          <button onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive("bulletList") ? "is-active" : ""} title="Bullet list">
            <List size={13} />
          </button>
          <button onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={editor.isActive("taskList") ? "is-active" : ""} title="Task list">
            <CheckSquare size={13} />
          </button>
          <button onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive("blockquote") ? "is-active" : ""} title="Quote">
            <Quote size={13} />
          </button>
        </FloatingMenu>
      )}

      {/* ── Editor content ───────────────────────────────────────────────── */}
      <EditorContent editor={editor} />
    </div>
  );
}
