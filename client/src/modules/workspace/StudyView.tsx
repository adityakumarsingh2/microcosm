import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listDueCards, gradeCard, type Card } from "../study/study.api";
import { Check, HelpCircle, RefreshCw } from "lucide-react";

type StudyViewProps = {
  accessToken: string;
  workspaceId: string;
};

export function StudyView({ accessToken, workspaceId }: StudyViewProps) {
  const queryClient = useQueryClient();
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // 1. Fetch due cards
  const dueQuery = useQuery({
    queryKey: ["dueCards", workspaceId],
    queryFn: () => listDueCards(accessToken, workspaceId),
    enabled: Boolean(accessToken && workspaceId),
  });

  const cards = dueQuery.data?.data.cards ?? [];

  // 2. Submit card grade
  const gradeMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: "again" | "good" | "easy" }) =>
      gradeCard(accessToken, id, rating),
    onSuccess: () => {
      // Invalidate queries so review count stays fresh
      void queryClient.invalidateQueries({ queryKey: ["dueCards", workspaceId] });
      // Reset flip state and move to next card or stay at index if deck shrank
      setIsFlipped(false);
      // Wait for React Query update to complete; index resets naturally
    },
  });

  const handleGradeClick = (rating: "again" | "good" | "easy") => {
    if (cards.length === 0) return;
    const card = cards[activeCardIndex] || cards[0];
    gradeMutation.mutate({ id: card.id, rating });
  };

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  if (dueQuery.isLoading) {
    return (
      <div className="editor-panel" style={{ display: "grid", placeItems: "center", height: "100%" }}>
        <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>
          Loading active review deck...
        </div>
      </div>
    );
  }

  // Active card matching the current index bounds
  const activeCard = cards[activeCardIndex] || cards[0];

  return (
    <div className="editor-panel" style={{ height: "100%", padding: "20px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      
      {/* Top Header Stats */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid var(--border-strong)", paddingBottom: "12px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <HelpCircle size={16} style={{ color: "var(--purple)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", fontWeight: "bold" }}>
            // spaced repetition review
          </span>
        </div>
        <div style={{
          fontFamily: "var(--font-mono)",
          fontSize: "0.78rem",
          background: "var(--bg-soft)",
          border: "1.5px solid var(--border-strong)",
          borderRadius: "4px",
          padding: "2px 8px",
          boxShadow: "1.5px 1.5px 0px var(--border-strong)",
          color: "var(--text-2)"
        }}>
          {cards.length} cards due today
        </div>
      </div>

      {cards.length === 0 ? (
        // Empty review state
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "16px", padding: "40px 20px" }}>
          <div style={{
            display: "grid",
            placeItems: "center",
            width: "56px",
            height: "56px",
            borderRadius: "50%",
            border: "2px solid #22c55e",
            background: "#4ade8020",
            color: "#22c55e"
          }}>
            <Check size={28} />
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "bold", textAlign: "center", color: "var(--text, #f0ede8)" }}>
            Zero Cards Due!
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-2)", textAlign: "center", maxWidth: "340px", lineHeight: "1.5" }}>
            You are completely caught up on your studies for today. Go write some notes or click <strong>Generate Study Cards</strong> inside your notes to add new concepts to your review queue!
          </p>
        </div>
      ) : (
        // Active flashcard render block
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "24px" }}>
          
          {/* Deck progress indicator */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--dim)" }}>
            Card {Math.min(activeCardIndex + 1, cards.length)} of {cards.length}
          </div>

          {/* Flashcard container (Neo-Brutalist clickable box) */}
          <div
            onClick={handleCardClick}
            style={{
              width: "100%",
              maxWidth: "460px",
              minHeight: "220px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: isFlipped ? "var(--surface-hover, #1a1a1f)" : "var(--surface-raised, #111116)",
              border: `2px solid ${isFlipped ? "var(--purple, #a673ff)" : "var(--border-strong, rgba(255, 255, 255, 0.24))"}`,
              borderRadius: "12px",
              boxShadow: `5px 5px 0px 0px ${isFlipped ? "var(--purple, #a673ff)" : "var(--border-strong, rgba(255, 255, 255, 0.24))"}`,
              padding: "32px",
              cursor: "pointer",
              transition: "transform 0.15s ease, background 0.15s ease",
              textAlign: "center",
              userSelect: "none"
            }}
          >
            {isFlipped ? (
              // Flipped state
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--purple, #a673ff)", display: "block", marginBottom: "12px" }}>
                  // answer
                </span>
                <p style={{ fontSize: "1.05rem", fontWeight: "bold", color: "var(--text, #f0ede8)", lineHeight: "1.5", margin: 0 }}>
                  {activeCard.back}
                </p>
              </div>
            ) : (
              // Default Front state
              <div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted, #8a8a8a)", display: "block", marginBottom: "12px" }}>
                  // question (click to flip)
                </span>
                <p style={{ fontSize: "1.05rem", fontWeight: "bold", color: "var(--text, #f0ede8)", lineHeight: "1.5", margin: 0 }}>
                  {activeCard.front}
                </p>
              </div>
            )}
          </div>

          {/* Review actions / SM-2 score trigger selectors */}
          {isFlipped ? (
            <div style={{ display: "flex", gap: "10px", width: "100%", maxWidth: "460px", justifyContent: "space-between", marginTop: "12px" }}>
              <button
                onClick={() => handleGradeClick("again")}
                disabled={gradeMutation.isPending}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  background: "transparent",
                  border: "2px solid #ef4444",
                  borderRadius: "6px",
                  boxShadow: "2px 2px 0px #ef4444",
                  color: "#ef4444",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                again (hard)
              </button>
              <button
                onClick={() => handleGradeClick("good")}
                disabled={gradeMutation.isPending}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  background: "transparent",
                  border: "2px solid #3b82f6",
                  borderRadius: "6px",
                  boxShadow: "2px 2px 0px #3b82f6",
                  color: "#3b82f6",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                good (medium)
              </button>
              <button
                onClick={() => handleGradeClick("easy")}
                disabled={gradeMutation.isPending}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  fontSize: "0.78rem",
                  fontFamily: "var(--font-mono)",
                  background: "transparent",
                  border: "2px solid #10b981",
                  borderRadius: "6px",
                  boxShadow: "2px 2px 0px #10b981",
                  color: "#10b981",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                easy (easy)
              </button>
            </div>
          ) : (
            <button
              onClick={handleCardClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                fontSize: "0.78rem",
                fontFamily: "var(--font-mono)",
                background: "var(--bg-soft)",
                border: "2px solid var(--border-strong)",
                borderRadius: "6px",
                boxShadow: "2px 2px 0px var(--border-strong)",
                color: "var(--text-1)",
                cursor: "pointer",
                marginTop: "12px",
                fontWeight: "bold",
              }}
            >
              <RefreshCw size={12} /> Flip Card
            </button>
          )}

        </div>
      )}

      {/* Footer Navigation */}
      {cards.length > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1.5px solid var(--border-strong)", paddingTop: "12px", marginTop: "20px" }}>
          <button
            disabled={activeCardIndex === 0}
            onClick={() => { setActiveCardIndex(prev => prev - 1); setIsFlipped(false); }}
            style={{
              padding: "4px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              background: "transparent",
              border: "1px solid var(--border-strong)",
              borderRadius: "4px",
              cursor: "pointer",
              opacity: activeCardIndex === 0 ? 0.4 : 1
            }}
          >
            ← Previous
          </button>
          <button
            disabled={activeCardIndex >= cards.length - 1}
            onClick={() => { setActiveCardIndex(prev => prev + 1); setIsFlipped(false); }}
            style={{
              padding: "4px 10px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.7rem",
              background: "transparent",
              border: "1px solid var(--border-strong)",
              borderRadius: "4px",
              cursor: "pointer",
              opacity: activeCardIndex >= cards.length - 1 ? 0.4 : 1
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
