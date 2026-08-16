import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

type ConfirmDeleteModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  itemType: "notebook" | "section" | "page" | "document" | "workspace";
  isPending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  itemType,
  isPending,
  onConfirm,
  onClose,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm p-6 bg-card border-2 border-red-500/80 text-foreground relative"
          style={{ boxShadow: "6px 6px 0px 0px rgba(239,68,68,0.3)" }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3 mb-3 text-red-400">
            <div className="p-2 border border-red-500/30 bg-red-500/10">
              <AlertTriangle size={20} />
            </div>
            <div>
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-red-400 block">
                // Confirm Delete
              </span>
              <h3 className="font-serif text-lg font-bold text-foreground leading-snug">
                Delete {itemType}?
              </h3>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-6">
            Are you sure you want to delete <strong className="text-foreground">{title}</strong>? {description}
          </p>

          <div className="flex items-center justify-end gap-2.5 font-mono text-xs">
            <button
              onClick={onClose}
              disabled={isPending}
              className="px-3.5 py-2 border border-foreground/20 text-foreground/70
                         hover:border-foreground/40 hover:text-foreground transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white font-bold
                         border-2 border-red-500 hover:bg-red-600 transition-all disabled:opacity-50"
              style={{ boxShadow: "2px 2px 0px 0px rgba(0,0,0,0.5)" }}
            >
              <Trash2 size={13} />
              {isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
