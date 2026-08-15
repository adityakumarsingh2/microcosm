import { useState, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X } from "lucide-react";

interface MayIHelpYouPopupProps {
  onOpenChat: () => void;
  className?: string;
  autoHideDuration?: number; // ms visible (default: 6000ms)
  entranceDelay?: number;    // initial ms delay after load (default: 4500ms)
  repeatInterval?: number;   // ms pause between auto-hiding and re-appearing (default: 35000ms)
  text?: string;             // Custom popup text
  title?: string;            // Tooltip title attribute
}

export const MayIHelpYouPopup = memo(function MayIHelpYouPopup({
  onOpenChat,
  className = "",
  autoHideDuration = 6000,
  entranceDelay = 4500,
  repeatInterval = 35000,
  text = "May I help you?",
  title = "Click to ask AI Assistant",
}: MayIHelpYouPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const repeatTimerRef   = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial entrance delay
  useEffect(() => {
    if (isDismissed) return;
    const t = setTimeout(() => { if (!isDismissed) setIsVisible(true); }, entranceDelay);
    return () => clearTimeout(t);
  }, [isDismissed, entranceDelay]);

  // 2. Auto-dismiss timer (pauses when hovered)
  useEffect(() => {
    if (!isVisible || isDismissed || isHovered) {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
      return;
    }
    autoHideTimerRef.current = setTimeout(() => setIsVisible(false), autoHideDuration);
    return () => { if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current); };
  }, [isVisible, isDismissed, isHovered, autoHideDuration]);

  // 3. Recurring timer: after auto-hiding, re-appear after repeatInterval
  useEffect(() => {
    if (isVisible || isDismissed) {
      if (repeatTimerRef.current) clearTimeout(repeatTimerRef.current);
      return;
    }
    repeatTimerRef.current = setTimeout(() => { if (!isDismissed) setIsVisible(true); }, repeatInterval);
    return () => { if (repeatTimerRef.current) clearTimeout(repeatTimerRef.current); };
  }, [isVisible, isDismissed, repeatInterval]);

  return (
    <AnimatePresence>
      {isVisible && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.85 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`mb-3 relative flex flex-col items-end z-50 select-none ${className}`}
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            onClick={onOpenChat}
            className="bg-card text-foreground border-2 border-foreground rounded-none px-3.5 py-2
                       flex items-center gap-2 cursor-pointer hover:bg-secondary transition-all
                       group font-sans text-xs font-semibold relative overflow-hidden"
            style={{ boxShadow: "3px 3px 0px 0px rgba(255,255,255,0.15)" }}
            title={title}
          >
            {/* Subtle glow accent */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 blur-sm opacity-0 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none" />

            {/* Bot icon */}
            <div className="w-5 h-5 bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 group-hover:scale-110 transition-transform">
              <Bot className="w-3.5 h-3.5" />
            </div>

            <span className="whitespace-nowrap font-medium text-foreground">{text}</span>

            {/* Live indicator */}
            <span className="flex h-2 w-2 relative ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>

            {/* Dismiss */}
            <button
              onClick={(e) => { e.stopPropagation(); setIsDismissed(true); }}
              className="ml-1 p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Dismiss help popup"
              title="Dismiss"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Countdown bar */}
            <motion.div
              key={isVisible ? "visible" : "hidden"}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: isHovered ? 1 : 0 }}
              transition={{ duration: isHovered ? 0.2 : autoHideDuration / 1000, ease: "linear" }}
              style={{ originX: 0 }}
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500/60"
            />
          </motion.div>

          {/* Speech bubble tail */}
          <div className="mr-5 w-3 h-3 bg-card border-r-2 border-b-2 border-foreground rotate-45 -mt-1.5 z-10"
               style={{ boxShadow: "1px 1px 0px 0px rgba(255,255,255,0.12)" }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default MayIHelpYouPopup;
