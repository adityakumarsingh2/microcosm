import { useState } from "react";
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
    if (!isDoc) {
      onNavigate?.(source.pageId);
    }
  };

  return (
    <div className="citation-badge-wrapper">
      <button
        className="citation-badge"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={handleClick}
        style={{ cursor: isDoc ? "default" : "pointer" }}
        title={source.pageTitle}
      >
        <span className="citation-index" style={{ backgroundColor: isDoc ? "var(--purple)" : "var(--blue)" }}>
          {index}
        </span>
        <span className="citation-title">
          {source.pageTitle}
          {isDoc && source.pageNum ? ` (p. ${source.pageNum})` : ""}
        </span>
      </button>
      {showTooltip && source.snippet && (
        <div className="citation-tooltip">
          <p className="citation-snippet">"{source.snippet}..."</p>
          <span className="citation-page-label">
            from {source.pageTitle} {isDoc && source.pageNum ? `(page ${source.pageNum})` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
