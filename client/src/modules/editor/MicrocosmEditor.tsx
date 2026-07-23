import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { useEffect, useRef, useState } from "react";
import type { PageBlock } from "../workspace/content.api";

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
          attrs: { level: 1 },
          content: [{ type: "text", text: "Untitled Page" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Start writing your knowledge here..." }],
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
            attrs: { level: Number(block.properties?.level || 1) },
            content: [{ type: "text", text: String(block.content || "") }],
          };
        }

        if (block.type === "quote") {
          return {
            type: "blockquote",
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
            attrs: { language: String(block.properties?.language || "") },
            content: [{ type: "text", text: String(block.content || "") }],
          };
        }

        if (block.type === "image") {
          return {
            type: "image",
            attrs: {
              src: String(block.content || ""),
              alt: String(block.properties?.alt || ""),
            },
          };
        }

        return {
          type: "paragraph",
          content: [{ type: "text", text: String(block.content || "") }],
        };
      }),
  };
}

function documentToBlocks(document: RichNode, previousBlocks: PageBlock[]): PageBlock[] {
  const sortedPreviousBlocks = [...previousBlocks].sort((a, b) => a.position - b.position);

  return (document.content || [])
    .map((node, index): PageBlock | null => {
      const previousBlock = sortedPreviousBlocks[index];
      const position = (index + 1) * 1000;
      const blockId = previousBlock?.blockId || createBlockId();

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
      Image,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: "Press / for blocks, or start writing...",
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
      <EditorContent editor={editor} />
    </div>
  );
}
