import { useState } from "react";
import type { Source } from "../workspace/companion.api";

type CitationBadgeProps = {
  source: Source;
  index: number;
  onNavigate?: (pageId: string) => void;
};

export function CitationBadge({ source, index, onNavigate }: CitationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="citation-badge-wrapper">
      <button
        className="citation-badge"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => onNavigate?.(source.pageId)}
        title={source.pageTitle}
      >
        <span className="citation-index">{index}</span>
        <span className="citation-title">{source.pageTitle}</span>
      </button>
      {showTooltip && source.snippet && (
        <div className="citation-tooltip">
          <p className="citation-snippet">"{source.snippet}..."</p>
          <span className="citation-page-label">from {source.pageTitle}</span>
        </div>
      )}
    </div>
  );
}
