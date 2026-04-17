import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useV2Voice } from "./V2VoiceContext";
import { detectVoiceIntent } from "@/lib/voiceIntent";

interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  card?: {
    title: string;
    value?: string;
    hint?: string;
  };
}

interface VoiceChatOverlayProps {
  open: boolean;
  onClose: () => void;
}

export const VoiceChatOverlay = ({ open, onClose }: VoiceChatOverlayProps) => {
  const { partialTranscript, onCommit, isConnected } = useV2Voice();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    onCommit(async (text: string) => {
      if (processingRef.current || !text.trim()) return;
      processingRef.current = true;

      const userTurn: ChatTurn = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
      };
      setTurns((prev) => [...prev, userTurn]);
      setIsThinking(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke("chat-ai", {
          body: {
            messages: [{ role: "user", content: text }],
            userId: session?.user?.id,
          },
        });

        const reply = error
          ? "죄송해요, 응답을 가져오지 못했어요."
          : data?.response || "응답이 비어 있어요.";

        setTurns((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", content: reply },
        ]);
      } catch (e) {
        console.error("Voice chat error:", e);
        setTurns((prev) => [
          ...prev,
          { id: `a-${Date.now()}`, role: "assistant", content: "오류가 발생했어요. 다시 시도해주세요." },
        ]);
      } finally {
        setIsThinking(false);
        processingRef.current = false;
      }
    });
  }, [open, onCommit]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, partialTranscript, isThinking]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-x-0 bottom-0 top-16 z-30 flex flex-col"
          style={{
            background: "linear-gradient(180deg, rgba(10,10,15,0.85) 0%, rgba(18,18,26,0.95) 100%)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div>
              <p className="text-[15px] font-semibold" style={{ color: "rgba(255,255,255,0.95)" }}>
                김비서와 대화
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                {isConnected ? "🎤 듣고 있어요" : "마이크가 꺼져 있어요"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <X size={16} style={{ color: "rgba(255,255,255,0.7)" }} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar">
            {turns.length === 0 && !partialTranscript && (
              <div className="text-center py-12">
                <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                  마이크에 대고 질문해보세요
                </p>
                <p className="text-[12px] mt-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                  예: "이번 달 매출 어때?", "지난주 지출 알려줘"
                </p>
              </div>
            )}

            {turns.map((turn) => (
              <motion.div
                key={turn.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-2xl px-4 py-2.5 max-w-[80%] ${
                    turn.role === "user" ? "rounded-tr-md" : "rounded-tl-md"
                  }`}
                  style={{
                    background:
                      turn.role === "user"
                        ? "linear-gradient(135deg, rgba(0,122,255,0.85), rgba(88,86,214,0.85))"
                        : "rgba(255,255,255,0.08)",
                  }}
                >
                  <p
                    className="text-[14px] whitespace-pre-wrap leading-relaxed"
                    style={{ color: "rgba(255,255,255,0.95)" }}
                  >
                    {turn.content}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Live partial transcript */}
            {partialTranscript && (
              <div className="flex justify-end">
                <div
                  className="rounded-2xl rounded-tr-md px-4 py-2.5 max-w-[80%]"
                  style={{ background: "rgba(0,122,255,0.3)" }}
                >
                  <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.7)" }}>
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
                  <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                    생각 중...
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
