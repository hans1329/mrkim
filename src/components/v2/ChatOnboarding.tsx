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

// Oscilloscope-style colorful waveform component
const OscilloscopeWave = () => (
  <div className="absolute bottom-44 left-0 right-0 h-16 pointer-events-none overflow-hidden">
    <svg
      viewBox="0 0 390 64"
      preserveAspectRatio="none"
      className="w-full h-full"
      style={{ filter: "blur(1px)" }}
    >
      <defs>
        <linearGradient id="wave1Grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#007AFF" stopOpacity="0" />
          <stop offset="30%" stopColor="#007AFF" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#5856D6" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#AF52DE" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#AF52DE" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wave2Grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF6B9D" stopOpacity="0" />
          <stop offset="25%" stopColor="#FF6B9D" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#007AFF" stopOpacity="0.5" />
          <stop offset="75%" stopColor="#34C759" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#34C759" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wave3Grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#5856D6" stopOpacity="0" />
          <stop offset="35%" stopColor="#AF52DE" stopOpacity="0.3" />
          <stop offset="65%" stopColor="#FF9F0A" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF9F0A" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Primary wave */}
      <motion.path
        d="M0,32 Q50,32 97,32 Q145,32 195,32 Q243,32 293,32 Q340,32 390,32"
        fill="none"
        stroke="url(#wave1Grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        animate={{
          d: [
            "M0,32 Q50,20 97,28 Q145,36 195,24 Q243,38 293,30 Q340,22 390,32",
            "M0,32 Q50,38 97,26 Q145,18 195,36 Q243,20 293,34 Q340,40 390,32",
            "M0,32 Q50,24 97,38 Q145,30 195,20 Q243,34 293,26 Q340,36 390,32",
            "M0,32 Q50,20 97,28 Q145,36 195,24 Q243,38 293,30 Q340,22 390,32",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Secondary wave */}
      <motion.path
        d="M0,32 Q50,32 97,32 Q145,32 195,32 Q243,32 293,32 Q340,32 390,32"
        fill="none"
        stroke="url(#wave2Grad)"
        strokeWidth="1.8"
        strokeLinecap="round"
        animate={{
          d: [
            "M0,32 Q50,36 97,22 Q145,40 195,28 Q243,18 293,36 Q340,28 390,32",
            "M0,32 Q50,26 97,40 Q145,24 195,38 Q243,42 293,22 Q340,34 390,32",
            "M0,32 Q50,42 97,28 Q145,34 195,42 Q243,26 293,38 Q340,20 390,32",
            "M0,32 Q50,36 97,22 Q145,40 195,28 Q243,18 293,36 Q340,28 390,32",
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Tertiary soft wave */}
      <motion.path
        d="M0,32 Q50,32 97,32 Q145,32 195,32 Q243,32 293,32 Q340,32 390,32"
        fill="none"
        stroke="url(#wave3Grad)"
        strokeWidth="1.2"
        strokeLinecap="round"
        animate={{
          d: [
            "M0,32 Q50,28 97,36 Q145,26 195,40 Q243,30 293,24 Q340,38 390,32",
            "M0,32 Q50,38 97,24 Q145,38 195,22 Q243,36 293,40 Q340,26 390,32",
            "M0,32 Q50,22 97,34 Q145,42 195,30 Q243,22 293,36 Q340,30 390,32",
            "M0,32 Q50,28 97,36 Q145,26 195,40 Q243,30 293,24 Q340,38 390,32",
          ],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
    {/* Glow backdrop */}
    <div
      className="absolute inset-0"
      style={{
        background: "radial-gradient(ellipse 60% 100% at 50% 50%, rgba(88,86,214,0.08) 0%, transparent 70%)",
      }}
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

      {/* Oscilloscope waveform — signals listening mode */}
      {showInput && step.type !== "action" && <OscilloscopeWave />}

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
            {/* Choice chips — for choice type */}
            {step.type === "choice" && (
              <>
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
                    className="w-full"
                  >
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
