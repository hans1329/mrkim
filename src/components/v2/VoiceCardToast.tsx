import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect } from "react";

export interface VoiceCard {
  id: string;
  question: string;
  answer: string;
}

interface VoiceCardToastProps {
  card: VoiceCard | null;
  onExpand: () => void;
  onDismiss: () => void;
  autoHideMs?: number;
}

/**
 * 단답형 음성 응답을 화면 하단 카드로 표시.
 * 자동 사라짐 + 탭하면 드로어로 확장.
 */
export const VoiceCardToast = ({ card, onExpand, onDismiss, autoHideMs = 6000 }: VoiceCardToastProps) => {
  useEffect(() => {
    if (!card) return;
    const t = setTimeout(onDismiss, autoHideMs);
    return () => clearTimeout(t);
  }, [card, autoHideMs, onDismiss]);

  return (
    <AnimatePresence>
      {card && (
        <motion.button
          key={card.id}
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={onExpand}
          className="fixed left-1/2 -translate-x-1/2 z-40 text-left rounded-2xl px-5 py-4 active:scale-[0.98] transition-transform"
          style={{
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
            width: "min(calc(100vw - 32px), 420px)",
            background: "linear-gradient(135deg, rgba(88,86,214,0.92), rgba(0,122,255,0.85))",
            border: "1px solid rgba(255,255,255,0.14)",
            boxShadow: "0 12px 40px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)",
            backdropFilter: "blur(24px)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles size={11} style={{ color: "rgba(255,255,255,0.85)" }} />
            <p
              className="text-[10.5px] uppercase tracking-wider truncate"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              {card.question.length > 30 ? card.question.slice(0, 30) + "…" : card.question}
            </p>
          </div>
          <p
            className="text-[19px] font-semibold leading-snug"
            style={{ color: "rgba(255,255,255,0.98)" }}
          >
            {card.answer}
          </p>
          <p className="text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            탭하여 자세히 보기
          </p>
        </motion.button>
      )}
    </AnimatePresence>
  );
};
