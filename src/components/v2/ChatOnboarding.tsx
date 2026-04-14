import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect, useRef } from "react";
import { useScribe } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

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

// Colorful oscilloscope yarn-ball avatar for bot
const YarnBallAvatar = () => (
  <div className="w-8 h-8 flex-shrink-0 relative">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <defs>
        <linearGradient id="yb1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#007AFF" />
          <stop offset="100%" stopColor="#5856D6" />
        </linearGradient>
        <linearGradient id="yb2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#AF52DE" />
          <stop offset="100%" stopColor="#FF6B9D" />
        </linearGradient>
        <linearGradient id="yb3" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34C759" />
          <stop offset="100%" stopColor="#FF9F0A" />
        </linearGradient>
      </defs>
      {/* Yarn strands as oscilloscope-style curves */}
      <motion.path
        d="M6,16 Q10,6 16,10 Q22,14 26,8"
        fill="none" stroke="url(#yb1)" strokeWidth="2" strokeLinecap="round"
        animate={{ d: [
          "M6,16 Q10,6 16,10 Q22,14 26,8",
          "M6,14 Q10,8 16,12 Q22,10 26,10",
          "M6,16 Q10,6 16,10 Q22,14 26,8",
        ]}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M8,22 Q12,14 16,18 Q20,22 24,16"
        fill="none" stroke="url(#yb2)" strokeWidth="2" strokeLinecap="round"
        animate={{ d: [
          "M8,22 Q12,14 16,18 Q20,22 24,16",
          "M8,20 Q12,16 16,20 Q20,18 24,18",
          "M8,22 Q12,14 16,18 Q20,22 24,16",
        ]}}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M10,26 Q14,18 18,22 Q22,26 26,20"
        fill="none" stroke="url(#yb3)" strokeWidth="1.5" strokeLinecap="round"
        animate={{ d: [
          "M10,26 Q14,18 18,22 Q22,26 26,20",
          "M10,24 Q14,20 18,24 Q22,22 26,22",
          "M10,26 Q14,18 18,22 Q22,26 26,20",
        ]}}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M6,10 Q12,20 18,14 Q24,8 28,14"
        fill="none" stroke="url(#yb1)" strokeWidth="1.5" strokeLinecap="round" opacity={0.6}
        animate={{ d: [
          "M6,10 Q12,20 18,14 Q24,8 28,14",
          "M6,12 Q12,18 18,16 Q24,10 28,12",
          "M6,10 Q12,20 18,14 Q24,8 28,14",
        ]}}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M4,18 Q8,24 14,16 Q20,8 28,18"
        fill="none" stroke="url(#yb2)" strokeWidth="1.5" strokeLinecap="round" opacity={0.5}
        animate={{ d: [
          "M4,18 Q8,24 14,16 Q20,8 28,18",
          "M4,16 Q8,22 14,18 Q20,10 28,16",
          "M4,18 Q8,24 14,16 Q20,8 28,18",
        ]}}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  </div>
);

// Oscilloscope-style colorful waveform component
const OscilloscopeWave = () => (
  <div className="w-full h-10 pointer-events-none overflow-hidden mb-2">
    <svg
      viewBox="0 0 390 40"
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
      <motion.path
        fill="none" stroke="url(#wave1Grad)" strokeWidth="2.5" strokeLinecap="round"
        animate={{
          d: [
            "M0,20 Q50,12 97,18 Q145,24 195,14 Q243,26 293,18 Q340,12 390,20",
            "M0,20 Q50,26 97,14 Q145,10 195,24 Q243,12 293,22 Q340,28 390,20",
            "M0,20 Q50,14 97,26 Q145,18 195,10 Q243,22 293,16 Q340,24 390,20",
            "M0,20 Q50,12 97,18 Q145,24 195,14 Q243,26 293,18 Q340,12 390,20",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        fill="none" stroke="url(#wave2Grad)" strokeWidth="1.8" strokeLinecap="round"
        animate={{
          d: [
            "M0,20 Q50,24 97,12 Q145,28 195,16 Q243,10 293,24 Q340,18 390,20",
            "M0,20 Q50,16 97,28 Q145,14 195,26 Q243,30 293,12 Q340,22 390,20",
            "M0,20 Q50,30 97,16 Q145,22 195,30 Q243,14 293,26 Q340,10 390,20",
            "M0,20 Q50,24 97,12 Q145,28 195,16 Q243,10 293,24 Q340,18 390,20",
          ],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        fill="none" stroke="url(#wave3Grad)" strokeWidth="1.2" strokeLinecap="round"
        animate={{
          d: [
            "M0,20 Q50,16 97,24 Q145,14 195,28 Q243,18 293,12 Q340,26 390,20",
            "M0,20 Q50,26 97,12 Q145,26 195,10 Q243,24 293,28 Q340,14 390,20",
            "M0,20 Q50,10 97,22 Q145,30 195,18 Q243,10 293,24 Q340,18 390,20",
            "M0,20 Q50,16 97,24 Q145,14 195,28 Q243,18 293,12 Q340,26 390,20",
          ],
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  </div>
);

export const ChatOnboarding = ({ onComplete, secretaryAvatarUrl }: ChatOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [sttReady, setSttReady] = useState(false);
  const advanceRef = useRef<(value: string) => void>();

  const step = steps[currentStep];

  // ElevenLabs Scribe (realtime STT)
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: "vad",
    onCommittedTranscript: (data) => {
      if (data.text?.trim() && advanceRef.current) {
        advanceRef.current(data.text.trim());
      }
    },
  });

  // Start STT on mount
  useEffect(() => {
    const initSTT = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
        if (error || !data?.token) {
          console.warn("STT token failed, text-only mode");
          return;
        }
        await scribe.connect({
          token: data.token,
          microphone: { echoCancellation: true, noiseSuppression: true },
        });
        setSttReady(true);
      } catch (e) {
        console.warn("STT init failed:", e);
      }
    };
    initSTT();
    return () => { scribe.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show first question on mount
  useEffect(() => {
    const t = setTimeout(() => {
      setMessages([{ from: "bot", text: steps[0].question }]);
      setTimeout(() => setShowInput(true), 500);
      setTimeout(() => setShowTextFallback(true), sttReady ? 5000 : 2000);
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
        setTimeout(() => setShowTextFallback(true), sttReady ? 5000 : 2000);
      }, 600);
    } else {
      scribe.disconnect();
      onComplete(newAnswers);
    }
  }, [answers, currentStep, step, onComplete, sttReady, scribe]);

  // Keep ref in sync for STT callback
  useEffect(() => {
    advanceRef.current = advance;
  }, [advance]);

  const SecretaryBubble = ({ text }: { text: string }) => (
    <div className="flex items-start gap-2.5 mb-3">
      {secretaryAvatarUrl ? (
        <img src={secretaryAvatarUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <YarnBallAvatar />
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

      {/* Skip */}
      <div className="relative z-10 flex justify-end px-5 pt-4">
        <button
          className="text-[12px] font-medium px-3 py-1.5 rounded-full"
          style={{
            color: "rgba(255,255,255,0.35)",
            background: "rgba(255,255,255,0.05)",
          }}
          onClick={() => { scribe.disconnect(); onComplete(answers); }}
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

        {/* Live partial transcript */}
        {scribe.partialTranscript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end mb-3"
          >
            <div
              className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[240px]"
              style={{ background: "linear-gradient(135deg, rgba(0,122,255,0.4), rgba(88,86,214,0.4))" }}
            >
              <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                {scribe.partialTranscript}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom input area */}
      <AnimatePresence>
        {showInput && step && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative z-10 px-4 pb-8 pt-3 flex flex-col items-center gap-1"
          >
            {/* Oscilloscope waveform — right above input */}
            {step.type !== "action" && <OscilloscopeWave />}
            {/* Choice chips — for choice type */}
            {step.type === "choice" && (
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
            )}

            {/* Text fallback */}
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
                  onClick={() => { scribe.disconnect(); onComplete(answers); }}
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
