import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { Bot } from "lucide-react";

interface OnboardingStep {
  id: string;
  question: string;
  type: "text" | "choice" | "action";
  placeholder?: string;
  choices?: { label: string; value: string }[];
  actionLabel?: string;
}

const steps: OnboardingStep[] = [
  {
    id: "name",
    question: "반갑습니다! 어떻게 불러드릴까요?",
    type: "text",
    placeholder: "예: 홍길동",
  },
  {
    id: "business_type",
    question: "어떤 사업을 하고 계세요?",
    type: "choice",
    choices: [
      { label: "음식점", value: "restaurant" },
      { label: "카페", value: "cafe" },
      { label: "소매/유통", value: "retail" },
      { label: "기타", value: "other" },
    ],
  },
  {
    id: "business_number",
    question: "사업자등록번호를 알려주시면\n세무 현황을 바로 확인해드릴게요.",
    type: "text",
    placeholder: "000-00-00000",
  },
  {
    id: "connect",
    question: "계좌나 카드를 연동하면\n매출을 자동으로 집계해드려요.",
    type: "action",
    actionLabel: "연동 시작하기",
  },
];

interface ChatOnboardingProps {
  onComplete: (data: Record<string, string>) => void;
  secretaryAvatarUrl?: string | null;
}

// Ambient wave ring component
const WaveRings = () => (
  <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-none">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="absolute rounded-full"
        style={{
          width: 120 + i * 60,
          height: 120 + i * 60,
          left: -(60 + i * 30),
          top: -(60 + i * 30),
          border: `1.5px solid rgba(88,86,214,${0.15 - i * 0.04})`,
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4 - i * 0.1, 0.15 - i * 0.04, 0.4 - i * 0.1],
        }}
        transition={{
          duration: 3,
          delay: i * 0.6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    ))}
    {/* Center glow dot */}
    <motion.div
      className="absolute w-3 h-3 rounded-full"
      style={{
        left: -6,
        top: -6,
        background: "linear-gradient(135deg, #007AFF, #5856D6)",
        boxShadow: "0 0 16px rgba(88,86,214,0.5)",
      }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 1, 0.8] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

export const ChatOnboarding = ({ onComplete, secretaryAvatarUrl }: ChatOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);

  const step = steps[currentStep];

  // Show first question on mount
  useEffect(() => {
    const t = setTimeout(() => {
      setMessages([{ from: "bot", text: steps[0].question }]);
      setTimeout(() => setShowInput(true), 500);
      // Show text fallback after a delay — user realizes voice isn't working
      setTimeout(() => setShowTextFallback(true), 3000);
    }, 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = useCallback((value: string) => {
    const newAnswers = { ...answers, [step.id]: value };
    setAnswers(newAnswers);
    setMessages((prev) => [...prev, { from: "user", text: value }]);
    setShowInput(false);
    setShowTextFallback(false);
    setInputValue("");

    if (currentStep < steps.length - 1) {
      const nextIdx = currentStep + 1;
      setTimeout(() => {
        setMessages((prev) => [...prev, { from: "bot", text: steps[nextIdx].question }]);
        setCurrentStep(nextIdx);
        setTimeout(() => setShowInput(true), 500);
        setTimeout(() => setShowTextFallback(true), 3000);
      }, 600);
    } else {
      onComplete(newAnswers);
    }
  }, [answers, currentStep, step, onComplete]);

  const SecretaryBubble = ({ text }: { text: string }) => (
    <div className="flex items-start gap-2.5 mb-3">
      {secretaryAvatarUrl ? (
        <img src={secretaryAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <div
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, rgba(0,122,255,0.3), rgba(88,86,214,0.3))",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <Bot size={14} style={{ color: "rgba(255,255,255,0.6)" }} />
        </div>
      )}
      <div
        className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[260px]"
        style={{
          background: "rgba(255,255,255,0.07)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.85)" }}>
          {text}
        </p>
      </div>
    </div>
  );

  const UserBubble = ({ text }: { text: string }) => (
    <div className="flex justify-end mb-3">
      <div
        className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[240px]"
        style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}
      >
        <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.95)" }}>{text}</p>
      </div>
    </div>
  );

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col"
      style={{ background: "linear-gradient(180deg, #0A0A0F 0%, #12121A 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(88,86,214,0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Always-on wave rings — signals listening mode */}
      {showInput && step.type !== "action" && <WaveRings />}

      {/* Skip */}
      <div className="relative z-10 flex justify-end px-5 pt-4">
        <button
          className="text-[12px] font-medium px-3 py-1.5 rounded-full"
          style={{
            color: "rgba(255,255,255,0.35)",
            background: "rgba(255,255,255,0.05)",
          }}
          onClick={() => onComplete(answers)}
        >
          건너뛰기
        </button>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 pt-8 pb-4 relative z-10 no-scrollbar">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {msg.from === "bot" ? <SecretaryBubble text={msg.text} /> : <UserBubble text={msg.text} />}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom input area */}
      <AnimatePresence>
        {showInput && step && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative z-10 px-4 pb-8 pt-3 flex flex-col items-center gap-2.5"
          >
            {/* Listening indicator — always on for text/choice */}
            {step.type !== "action" && (
              <motion.p
                className="text-[11px] font-medium"
                style={{
                  background: "linear-gradient(90deg, #007AFF, #AF52DE)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                듣고 있어요...
              </motion.p>
            )}

            {/* Choice chips — for choice type */}
            {step.type === "choice" && (
              <>
                <div className="flex items-center gap-3 w-full max-w-[280px] mt-1">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>또는 선택</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {step.choices?.map((c) => (
                    <motion.button
                      key={c.value}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => advance(c.label)}
                      className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.8)",
                      }}
                    >
                      {c.label}
                    </motion.button>
                  ))}
                </div>
              </>
            )}

            {/* Text fallback — appears after 3s delay for text steps */}
            {step.type === "text" && (
              <AnimatePresence>
                {showTextFallback && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full mt-1"
                  >
                    <div className="flex items-center gap-3 w-full max-w-[280px] mx-auto mb-2">
                      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.15)" }}>직접 입력</span>
                      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                    </div>
                    <div
                      className="flex items-center gap-2 rounded-xl px-4 py-2.5 w-full"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                      }}
                    >
                      <input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && inputValue.trim() && advance(inputValue.trim())}
                        placeholder={step.placeholder}
                        className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/20"
                        style={{ color: "rgba(255,255,255,0.8)" }}
                      />
                      <button
                        onClick={() => inputValue.trim() && advance(inputValue.trim())}
                        className="px-2.5 py-1 rounded-lg text-[12px] font-semibold"
                        style={{
                          background: inputValue.trim()
                            ? "linear-gradient(135deg, #007AFF, #5856D6)"
                            : "rgba(255,255,255,0.04)",
                          color: inputValue.trim()
                            ? "rgba(255,255,255,0.95)"
                            : "rgba(255,255,255,0.2)",
                        }}
                      >
                        확인
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Action type */}
            {step.type === "action" && (
              <div className="flex flex-col items-center gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => advance("연동 시작")}
                  className="w-full py-3.5 rounded-xl text-[14px] font-semibold"
                  style={{
                    background: "linear-gradient(135deg, #007AFF, #5856D6, #AF52DE)",
                    color: "rgba(255,255,255,0.95)",
                    boxShadow: "0 0 24px rgba(88,86,214,0.3)",
                  }}
                >
                  {step.actionLabel}
                </motion.button>
                <button
                  onClick={() => onComplete(answers)}
                  className="text-[12px]"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  나중에 할게요
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
