import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Mic, Square, X } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

/**
 * V3 채팅/음성 Bottom Sheet.
 *
 * 현재는 mock — 사용자 입력에 대해 하드코딩된 응답 반환.
 * 실 연결 시 useAIChat 훅 통해 chat-ai edge function 호출.
 */

interface V3ChatSheetProps {
  open: boolean;
  onClose: () => void;
  initialUserText?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// Mock AI responses — 특정 키워드에 반응
function mockAIReply(userText: string): string {
  const t = userText.trim().toLowerCase();
  if (/매출|sales/i.test(t)) {
    return "오늘 매출은 3,240,000원이에요. 지난주 같은 요일 대비 18% 올랐습니다. 카드 매출이 특히 강세(+23%)입니다.";
  }
  if (/부가세|vat/i.test(t)) {
    return "다음 부가세 예상 납부액은 180만원이고, 7월 25일 납부 마감이에요. 지금까지 세금계산서 매입 증빙은 78% 수집됐습니다.";
  }
  if (/직원|employee/i.test(t)) {
    return "현재 등록된 직원은 3명, 이번달 총 급여 예상은 890만원입니다. 김하진님 연차 잔여 3일 남아있어요.";
  }
  if (/연동|동기화|sync/i.test(t)) {
    return "연동 4개 중 3개가 정상이에요. 홈택스 연동이 인증서 만료로 끊겼습니다. 헤더 우측 [+] 버튼에서 재연결 가능해요.";
  }
  return "대표님, 구체적인 질문 주시면 수집된 데이터로 답변 드릴게요. 예: '오늘 매출 어때?', '다음 부가세 얼마야?', '직원 급여 현황'";
}

export function V3ChatSheet({ open, onClose, initialUserText }: V3ChatSheetProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 스크롤 맨 아래로
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // 초기 입력 텍스트가 있으면 자동 전송 (음성 커밋 시)
  useEffect(() => {
    if (open && initialUserText) {
      handleSend(initialUserText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialUserText]);

  // 포커스
  useEffect(() => {
    if (open && !initialUserText) {
      // 약간 지연 — sheet 애니메이션 완료 후
      const t = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(t);
    }
  }, [open, initialUserText]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    // Mock 1~1.5초 후 응답
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: mockAIReply(trimmed),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 900 + Math.random() * 500);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(input);
  };

  const toggleMic = () => {
    // Mock 음성 — 실제로는 ElevenLabs Scribe 연결
    if (isListening) {
      setIsListening(false);
      // 가짜 음성 결과를 input 에 채우기
      setInput("오늘 매출 어때?");
    } else {
      setIsListening(true);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="
              fixed bottom-0 left-0 right-0 z-50
              h-[85vh] max-h-[720px]
              rounded-t-3xl
              border-t border-white/[0.08]
              text-white
              flex flex-col
              overflow-hidden
            "
            style={{
              background: "linear-gradient(180deg, #13131D 0%, #0E0E16 100%)",
            }}
          >
            {/* Grabber + Header */}
            <div className="pt-2 pb-1 flex items-center justify-center">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>
            <div className="flex items-center justify-between px-5 py-2">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 shadow-[0_0_16px_rgba(120,120,255,0.4)]">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </span>
                <div>
                  <p className="text-base font-semibold">김비서</p>
                  <p className="text-[11px] text-white/50">무엇이든 물어보세요</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="h-11 w-11 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center active:scale-95 transition"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-none"
            >
              {messages.length === 0 && (
                <div className="py-8 flex flex-col items-center gap-3">
                  <p className="text-sm text-white/70">이렇게 물어보세요</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "오늘 매출 어때?",
                      "다음 부가세 얼마야?",
                      "직원 급여 현황",
                      "홈택스 연동 상태",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="
                          h-9 px-3 rounded-full
                          bg-white/[0.06] border border-white/[0.08]
                          text-xs text-white/85
                          active:scale-95 transition
                        "
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {isThinking && <ThinkingBubble />}
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-white/[0.06] px-4 pt-3"
              style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-label={isListening ? "음성 중지" : "음성 시작"}
                  className={`
                    h-12 w-12 rounded-full flex items-center justify-center
                    active:scale-95 transition
                    ${
                      isListening
                        ? "bg-rose-500/90 text-white shadow-[0_0_24px_rgba(244,63,94,0.4)]"
                        : "bg-white/[0.08] border border-white/[0.08] text-white/80"
                    }
                  `}
                >
                  {isListening ? (
                    <Square className="h-4 w-4" strokeWidth={2} fill="currentColor" />
                  ) : (
                    <Mic className="h-5 w-5" strokeWidth={1.5} />
                  )}
                </button>

                <div className="flex-1 flex items-center h-12 rounded-full bg-white/[0.06] border border-white/[0.08] pl-4 pr-1.5">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "듣는 중..." : "메시지 입력"}
                    disabled={isListening}
                    className="
                      flex-1 bg-transparent outline-none
                      text-[15px] text-white placeholder:text-white/40
                    "
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isThinking}
                    aria-label="보내기"
                    className={`
                      h-9 w-9 rounded-full flex items-center justify-center
                      transition
                      ${
                        input.trim() && !isThinking
                          ? "bg-gradient-to-br from-indigo-400 to-violet-500 text-white active:scale-95"
                          : "bg-white/[0.06] text-white/30"
                      }
                    `}
                  >
                    <ArrowUp className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`
          max-w-[80%] px-4 py-2.5 text-[15px] leading-relaxed
          ${
            isUser
              ? "bg-gradient-to-br from-indigo-500/90 to-violet-500/90 text-white rounded-2xl rounded-tr-md"
              : "bg-white/[0.06] border border-white/[0.06] text-white/90 rounded-2xl rounded-tl-md"
          }
        `}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

function ThinkingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="px-4 py-3 rounded-2xl rounded-tl-md bg-white/[0.06] border border-white/[0.06]">
        <div className="flex gap-1">
          {[0, 0.15, 0.3].map((delay, i) => (
            <motion.span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-white/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
