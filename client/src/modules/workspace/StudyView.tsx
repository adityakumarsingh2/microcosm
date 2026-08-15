import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listDueCards, gradeCard } from "../study/study.api";
import { Check, HelpCircle, RefreshCw, Loader2 } from "lucide-react";

type StudyViewProps = {
  accessToken: string;
  workspaceId: string;
};

export function StudyView({ accessToken, workspaceId }: StudyViewProps) {
  const queryClient = useQueryClient();
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const dueQuery = useQuery({
    queryKey: ["dueCards", workspaceId],
    queryFn: () => listDueCards(accessToken, workspaceId),
    enabled: Boolean(accessToken && workspaceId),
  });

  const cards = dueQuery.data?.data.cards ?? [];

  const gradeMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: "again" | "good" | "easy" }) =>
      gradeCard(accessToken, id, rating),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dueCards", workspaceId] });
      setIsFlipped(false);
    },
  });

  const handleGradeClick = (rating: "again" | "good" | "easy") => {
    if (cards.length === 0) return;
    const card = cards[activeCardIndex] || cards[0];
    gradeMutation.mutate({ id: card.id, rating });
  };

  if (dueQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
          <Loader2 size={14} className="animate-spin" />
          Loading review deck…
        </div>
      </div>
    );
  }

  const activeCard = cards[activeCardIndex] || cards[0];

  return (
    <div className="flex flex-col h-full min-h-[400px] p-5 gap-0">

      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-5 border-b-2 border-foreground/15">
        <div className="flex items-center gap-2">
          <HelpCircle size={15} className="text-purple-400" />
          <span className="font-mono text-sm font-bold text-foreground/70">// spaced repetition</span>
        </div>
        <div className="font-mono text-xs bg-secondary border border-foreground/20 px-2.5 py-1 text-foreground/60"
             style={{ boxShadow: "2px 2px 0px 0px rgba(255,255,255,0.1)" }}>
          {cards.length} cards due today
        </div>
      </div>

      {cards.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center flex-1 gap-4 py-10">
          <div className="flex items-center justify-center w-14 h-14 rounded-full border-2 border-emerald-500 bg-emerald-500/10 text-emerald-400">
            <Check size={28} />
          </div>
          <h2 className="font-serif text-xl font-bold text-foreground text-center">Zero Cards Due!</h2>
          <p className="text-sm text-muted-foreground text-center max-w-[340px] leading-relaxed">
            You're completely caught up for today. Write some notes or click{" "}
            <strong className="text-foreground">Generate Study Cards</strong> inside a page to add new concepts.
          </p>
        </div>
      ) : (
        /* Flashcard view */
        <div className="flex flex-col items-center justify-center flex-1 gap-6">
          {/* Progress */}
          <div className="font-mono text-xs text-muted-foreground">
            Card {Math.min(activeCardIndex + 1, cards.length)} of {cards.length}
          </div>

          {/* Flashcard */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full max-w-[460px] min-h-[220px] flex flex-col items-center justify-center p-8
                       border-2 text-center cursor-pointer select-none transition-all duration-150
                       hover:-translate-y-0.5"
            style={{
              background: isFlipped ? "rgba(166,115,255,0.06)" : "hsl(var(--secondary))",
              borderColor: isFlipped ? "rgba(166,115,255,0.8)" : "rgba(255,255,255,0.2)",
              boxShadow: isFlipped
                ? "5px 5px 0px 0px rgba(166,115,255,0.5)"
                : "5px 5px 0px 0px rgba(255,255,255,0.12)",
            }}
          >
            {isFlipped ? (
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-purple-400 mb-3">
                  // answer
                </span>
                <p className="text-base font-bold text-foreground leading-relaxed m-0">
                  {activeCard.back}
                </p>
              </div>
            ) : (
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                  // question — click to flip
                </span>
                <p className="text-base font-bold text-foreground leading-relaxed m-0">
                  {activeCard.front}
                </p>
              </div>
            )}
          </div>

          {/* Grade buttons */}
          {isFlipped ? (
            <div className="flex gap-2.5 w-full max-w-[460px]">
              {[
                { label: "again (hard)", rating: "again" as const, color: "#ef4444" },
                { label: "good (medium)", rating: "good" as const, color: "#3b82f6" },
                { label: "easy (easy)", rating: "easy" as const, color: "#10b981" },
              ].map(({ label, rating, color }) => (
                <button
                  key={rating}
                  onClick={() => handleGradeClick(rating)}
                  disabled={gradeMutation.isPending}
                  className="flex-1 py-2 px-3 font-mono text-xs font-bold border-2 bg-transparent
                             transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: color,
                    color,
                    boxShadow: `2px 2px 0px 0px ${color}`,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setIsFlipped(true)}
              className="flex items-center gap-2 px-4 py-2 font-mono text-xs font-bold
                         border-2 border-foreground/20 bg-secondary text-foreground/70
                         hover:border-foreground/40 hover:text-foreground transition-all hover:-translate-y-0.5"
              style={{ boxShadow: "2px 2px 0px 0px rgba(255,255,255,0.1)" }}
            >
              <RefreshCw size={12} /> Flip Card
            </button>
          )}
        </div>
      )}

      {/* Footer navigation */}
      {cards.length > 1 && (
        <div className="flex justify-between pt-3 mt-5 border-t border-foreground/10">
          <button
            disabled={activeCardIndex === 0}
            onClick={() => { setActiveCardIndex(p => p - 1); setIsFlipped(false); }}
            className="font-mono text-xs px-3 py-1.5 border border-foreground/15 text-foreground/50
                       hover:border-foreground/30 hover:text-foreground disabled:opacity-30
                       disabled:cursor-not-allowed transition-all"
          >
            ← Previous
          </button>
          <button
            disabled={activeCardIndex >= cards.length - 1}
            onClick={() => { setActiveCardIndex(p => p + 1); setIsFlipped(false); }}
            className="font-mono text-xs px-3 py-1.5 border border-foreground/15 text-foreground/50
                       hover:border-foreground/30 hover:text-foreground disabled:opacity-30
                       disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
