import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, BookOpen, Folder, FileText } from "lucide-react";

type CreateItemModalProps = {
  isOpen: boolean;
  itemType: "notebook" | "section" | "page";
  defaultTitle?: string;
  isPending?: boolean;
  onConfirm: (title: string, emoji?: string) => void;
  onClose: () => void;
};

const ICONS = {
  notebook: <BookOpen size={18} className="text-orange-400" />,
  section:  <Folder size={18} className="text-blue-400" />,
  page:     <FileText size={18} className="text-purple-400" />,
};

const DEFAULT_EMOJIS = ["📝", "🚀", "💡", "📚", "🎯", "⚡", "🔬", "🧠"];

export function CreateItemModal({
  isOpen,
  itemType,
  defaultTitle = "",
  isPending,
  onConfirm,
  onClose,
}: CreateItemModalProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [selectedEmoji, setSelectedEmoji] = useState(DEFAULT_EMOJIS[0]);

  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle || (itemType === "notebook" ? "My Notebook" : itemType === "section" ? "General" : "Untitled Page"));
    }
  }, [isOpen, itemType, defaultTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onConfirm(title.trim(), itemType === "page" ? selectedEmoji : undefined);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm p-6 bg-card border-2 border-foreground text-foreground relative"
          style={{ boxShadow: "6px 6px 0px 0px rgba(255,255,255,0.15)" }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 border border-foreground/20 bg-secondary">
              {ICONS[itemType]}
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-muted-foreground block">
                // Create New
              </span>
              <h3 className="font-serif text-lg font-bold text-foreground capitalize leading-snug">
                New {itemType}
              </h3>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-xs text-muted-foreground uppercase font-bold">
                {itemType} Title
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                placeholder={`Enter ${itemType} title…`}
                className="w-full bg-secondary border-2 border-foreground/20 focus:border-foreground
                           px-3 py-2 text-sm font-sans text-foreground outline-none transition-colors"
              />
            </label>

            {itemType === "page" && (
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-xs text-muted-foreground uppercase font-bold">
                  Icon / Emoji
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedEmoji(emoji)}
                      className={`w-8 h-8 flex items-center justify-center text-sm border transition-all
                                  ${selectedEmoji === emoji
                                    ? "bg-foreground text-background border-foreground font-bold"
                                    : "bg-secondary border-foreground/15 hover:border-foreground/40"}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 mt-2 font-mono text-xs">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-3.5 py-2 border border-foreground/20 text-foreground/70
                           hover:border-foreground/40 hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!title.trim() || isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background font-bold
                           border-2 border-foreground hover:bg-secondary hover:text-foreground
                           transition-all disabled:opacity-50"
                style={{ boxShadow: "2px 2px 0px 0px rgba(255,255,255,0.15)" }}
              >
                <Plus size={14} />
                {isPending ? "Creating…" : `Create ${itemType}`}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
