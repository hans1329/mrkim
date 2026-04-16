import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAIChat } from "@/hooks/useAIChat";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { DataVisualization } from "@/components/chat/DataVisualization";

const quickPrompts = [
  "오늘 매출 얼마야?",
  "이번 달 지출 현황",
  "부가세 현황 확인",
  "오늘 브리핑해줘",
];

export const V2ChatHistoryPanel = () => {
  const {
    messages,
    isLoading,
    sendMessage,
  } = useAIChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage(trimmed);
    setInput("");
  }, [input, isLoading, sendMessage]);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#007AFF" }} />
          <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
            김비서 대화
          </span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="px-3 py-3 space-y-3">
          {!hasMessages && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Sparkles className="w-8 h-8" style={{ color: "rgba(255,255,255,0.15)" }} />
              <p className="text-[13px] text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                김비서에게 무엇이든 물어보세요
              </p>
              <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => { setInput(""); sendMessage(p); }}
                    className="text-[11px] px-2.5 py-1.5 rounded-full transition-colors"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className="max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed"
                style={{
                  background: msg.role === "user"
                    ? "rgba(0,122,255,0.25)"
                    : "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.visualization && (
                      <div className="mt-2">
                        <DataVisualization data={msg.visualization} />
                      </div>
                    )}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div
                  className="rounded-2xl px-3 py-2 flex items-center gap-2"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    생각 중...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="px-3 py-3 border-t border-white/5">
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-2"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="메시지 입력..."
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-white/20"
            style={{ color: "rgba(255,255,255,0.9)" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ background: "rgba(0,122,255,0.8)" }}
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
