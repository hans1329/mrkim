import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface VoiceChatDrawerProps {
  open: boolean;
  turns: ChatTurn[];
  isThinking: boolean;
  partialTranscript: string;
  isConnected: boolean;
  onClose: () => void;
}

/**
 * 반높이(60vh) 슬라이드업 시트.
 * 누적 대화 표시. 마이크는 외부에서 켜진 채 유지.
 */
export const VoiceChatDrawer = ({
  open,
  turns,
  isThinking,
  partialTranscript,
  isConnected,
  onClose,
}: VoiceChatDrawerProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, partialTranscript, isThinking, open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl"
            style={{
              height: "62vh",
              background: "linear-gradient(180deg, rgba(18,18,26,0.96) 0%, rgba(10,10,15,0.98) 100%)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              boxShadow: "0 -20px 60px -10px rgba(0,0,0,0.6)",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 flex-shrink-0">
              <div>
                <p className="text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.95)" }}>
                  김비서와 대화
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {isConnected ? "🎤 듣고 있어요 · 계속 말씀하세요" : "마이크가 꺼져 있어요"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.08)" }}
                aria-label="닫기"
              >
                <X size={15} style={{ color: "rgba(255,255,255,0.7)" }} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar">
              {turns.length === 0 && !partialTranscript && !isThinking && (
                <div className="text-center py-8">
                  <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    음성으로 계속 질문하실 수 있어요
                  </p>
                </div>
              )}

              {turns.map((t) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-2.5 max-w-[82%] ${
                      t.role === "user" ? "rounded-tr-md" : "rounded-tl-md"
                    }`}
                    style={{
                      background:
                        t.role === "user"
                          ? "linear-gradient(135deg, #007AFF, #5856D6)"
                          : "rgba(255,255,255,0.08)",
                    }}
                  >
                    {t.role === "assistant" ? (
                      <div
                        className="text-[14px] leading-relaxed prose prose-invert prose-sm max-w-none prose-p:my-1 prose-strong:text-white"
                        style={{ color: "rgba(255,255,255,0.95)" }}
                      >
                        <ReactMarkdown>{t.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-[14px] whitespace-pre-wrap leading-relaxed" style={{ color: "rgba(255,255,255,0.95)" }}>
                        {t.content}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}

              {partialTranscript && (
                <div className="flex justify-end">
                  <div
                    className="rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[82%] opacity-60"
                    style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}
                  >
                    <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.9)" }}>
                      {partialTranscript}
                    </p>
                  </div>
                </div>
              )}

              {isThinking && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl rounded-tl-md px-4 py-2.5 flex items-center gap-2"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <Loader2 size={14} className="animate-spin" style={{ color: "rgba(255,255,255,0.6)" }} />
                    <span className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                      생각 중…
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
