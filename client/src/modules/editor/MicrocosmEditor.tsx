import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";

const initialContent = `
  <h1>Deadlock in Operating Systems</h1>
  <p>Deadlock occurs when a set of processes wait indefinitely for resources held by each other.</p>
  <h2>Necessary Conditions</h2>
  <ul>
    <li>Mutual exclusion</li>
    <li>Hold and wait</li>
    <li>No preemption</li>
    <li>Circular wait</li>
  </ul>
  <blockquote>Microcosm will turn these notes into retrievable knowledge for the AI Companion.</blockquote>
`;

export function MicrocosmEditor() {
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
    content: initialContent,
    editorProps: {
      attributes: {
        class: "microcosm-editor",
      },
    },
  });

  return (
    <div className="editor-wrap">
      <div className="editor-toolbar">
        <span>// page</span>
        <div className="toolbar-actions">
          <button>Text</button>
          <button>Image</button>
          <button>AI</button>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
