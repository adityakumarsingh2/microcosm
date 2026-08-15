import { useState } from "react";
import { FileText, BookOpen } from "lucide-react";
import type { Source } from "../workspace/companion.api";

type CitationBadgeProps = {
  source: Source;
  index: number;
  onNavigate?: (pageId: string) => void;
};

export function CitationBadge({ source, index, onNavigate }: CitationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isDoc = source.type === "document";

  const handleClick = () => {
    if (!isDoc) onNavigate?.(source.pageId);
  };

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={handleClick}
        title={source.pageTitle}
        className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold
                   bg-secondary border border-foreground/20 rounded-none
                   px-2 py-1 text-foreground transition-all
                   hover:border-foreground hover:-translate-y-px active:translate-y-0"
        style={{
          cursor: isDoc ? "default" : "pointer",
          boxShadow: "1px 1px 0px 0px rgba(255,255,255,0.1)",
        }}
      >
        {isDoc
          ? <BookOpen className="w-3 h-3 text-purple-400 flex-shrink-0" />
          : <FileText className="w-3 h-3 text-blue-400 flex-shrink-0" />
        }
        <span className="w-4 h-4 rounded-none bg-foreground text-background text-[9px] flex items-center justify-center font-black flex-shrink-0">
          {index}
        </span>
        <span className="truncate max-w-[140px]">
          {source.pageTitle}
          {isDoc && source.pageNum ? ` (p. ${source.pageNum})` : ""}
        </span>
      </button>

      {/* Tooltip */}
      {showTooltip && source.snippet && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-64 p-3
                        bg-card border-2 border-foreground text-foreground text-xs
                        font-sans leading-relaxed"
             style={{ boxShadow: "4px 4px 0px 0px rgba(255,255,255,0.15)" }}
        >
          <p className="text-foreground/70 italic mb-1.5">"{source.snippet}..."</p>
          <span className="font-mono text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
            from {source.pageTitle} {isDoc && source.pageNum ? `(page ${source.pageNum})` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
