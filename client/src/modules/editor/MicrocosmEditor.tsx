import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Code, Strikethrough, Heading1, Heading2, List, CheckSquare, Quote } from "lucide-react";
import type { PageBlock } from "../workspace/content.api";
import { BlockIdExtension } from "./BlockIdExtension";

type RichNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  text?: string;
};

type MicrocosmEditorProps = {
  blocks: PageBlock[];
  disabled?: boolean;
  isSaving?: boolean;
  onSave: (blocks: PageBlock[]) => void;
};

const AUTOSAVE_DELAY_MS = 1400;

function createBlockId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `block-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function textFromNode(node: RichNode): string {
  if (node.text) return node.text;
  return node.content?.map(textFromNode).join("") || "";
}

function blocksToDocument(blocks: PageBlock[]) {
  if (blocks.length === 0) {
    return {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 1, blockId: createBlockId() },
        },
      ],
    };
  }

  return {
    type: "doc",
    content: [...blocks]
      .sort((a, b) => a.position - b.position)
      .map((block) => {
        if (block.type === "heading") {
          return {
            type: "heading",
            attrs: { level: Number(block.properties?.level || 1), blockId: block.blockId },
            content: [{ type: "text", text: String(block.content || "") }],
          };
        }

        if (block.type === "quote") {
          return {
            type: "blockquote",
            attrs: { blockId: block.blockId },
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: String(block.content || "") }],
              },
            ],
          };
        }

        if (block.type === "code") {
          return {
            type: "codeBlock",
            attrs: { language: String(block.properties?.language || ""), blockId: block.blockId },
            content: [{ type: "text", text: String(block.content || "") }],
          };
        }

        if (block.type === "image") {
          return {
            type: "image",
            attrs: {
              src: String(block.content || ""),
              alt: String(block.properties?.alt || ""),
              blockId: block.blockId,
            },
          };
        }

        return {
          type: "paragraph",
          attrs: { blockId: block.blockId },
          content: [{ type: "text", text: String(block.content || "") }],
        };
      }),
  };
}

function documentToBlocks(document: RichNode, previousBlocks: PageBlock[]): PageBlock[] {
  const seenIds = new Set<string>();

  return (document.content || [])
    .map((node, index): PageBlock | null => {
      const position = (index + 1) * 1000;
      let blockId = (node.attrs?.blockId as string) || "";
      if (!blockId || seenIds.has(blockId)) {
        blockId = createBlockId();
      }
      seenIds.add(blockId);

      if (node.type === "heading") {
        return {
          blockId,
          type: "heading",
          content: textFromNode(node),
          properties: { level: node.attrs?.level || 1 },
          position,
        };
      }

      if (node.type === "blockquote") {
        return {
          blockId,
          type: "quote",
          content: textFromNode(node),
          properties: {},
          position,
        };
      }

      if (node.type === "codeBlock") {
        return {
          blockId,
          type: "code",
          content: textFromNode(node),
          properties: { language: node.attrs?.language || "" },
          position,
        };
      }

      if (node.type === "image") {
        return {
          blockId,
          type: "image",
          content: node.attrs?.src || "",
          properties: { alt: node.attrs?.alt || "" },
          position,
        };
      }

      const text = textFromNode(node);
      if (!text.trim()) return null;

      return {
        blockId,
        type: "paragraph",
        content: text,
        properties: {},
        position,
      };
    })
    .filter((block): block is PageBlock => Boolean(block));
}

export function MicrocosmEditor({ blocks, disabled, isSaving, onSave }: MicrocosmEditorProps) {
  const blocksRef = useRef(blocks);
  const onSaveRef = useRef(onSave);
  const autosaveTimerRef = useRef<number | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "scheduled">("saved");

  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      BlockIdExtension,
      Image,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: "Type to write, or select text to format...",
      }),
    ],
    content: blocksToDocument(blocks),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: "microcosm-editor",
      },
    },
    onUpdate: ({ editor }) => {
      if (disabled) return;

      setSaveState("dirty");

      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }

      autosaveTimerRef.current = window.setTimeout(() => {
        setSaveState("scheduled");
        onSaveRef.current(documentToBlocks(editor.getJSON() as RichNode, blocksRef.current));
      }, AUTOSAVE_DELAY_MS);
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(blocksToDocument(blocks), false);
    setSaveState("saved");
  }, [blocks, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!isSaving && saveState === "scheduled") {
      setSaveState("saved");
    }
  }, [isSaving, saveState]);

  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  function saveNow() {
    if (!editor) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    setSaveState("scheduled");
    onSave(documentToBlocks(editor.getJSON() as RichNode, blocksRef.current));
  }

  const saveLabel = isSaving ? "Saving" : saveState === "dirty" ? "Unsaved" : saveState === "scheduled" ? "Queued" : "Saved";

  return (
    <div className="editor-wrap">
      <div className="editor-toolbar">
        <span>// page</span>
        <div className="toolbar-actions">
          <span className={`save-state ${saveState}`}>{saveLabel}</span>
          <button>Text</button>
          <button>Image</button>
          <button>AI</button>
          <button disabled={!editor || disabled || isSaving} onClick={saveNow}>
            Save now
          </button>
        </div>
      </div>
      {editor && (
        <BubbleMenu editor={editor} className="bubble-menu">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "is-active" : ""}
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "is-active" : ""}
          >
            <Italic size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive("strike") ? "is-active" : ""}
          >
            <Strikethrough size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive("code") ? "is-active" : ""}
          >
            <Code size={14} />
          </button>
        </BubbleMenu>
      )}

      {editor && (
        <FloatingMenu editor={editor} className="floating-menu" tippyOptions={{ duration: 100 }}>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive("heading", { level: 1 }) ? "is-active" : ""}
          >
            <Heading1 size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive("heading", { level: 2 }) ? "is-active" : ""}
          >
            <Heading2 size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive("bulletList") ? "is-active" : ""}
          >
            <List size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={editor.isActive("taskList") ? "is-active" : ""}
          >
            <CheckSquare size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive("blockquote") ? "is-active" : ""}
          >
            <Quote size={14} />
          </button>
        </FloatingMenu>
      )}

      <EditorContent editor={editor} />
    </div>
  );
}
