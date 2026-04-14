import { motion, AnimatePresence } from "framer-motion";
import { Mic, X, Check } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

interface RegistrationStep {
  id: string;
  question: string;
  type: "text" | "choice";
  placeholder?: string;
  choices?: { label: string; value: string }[];
  parse?: (input: string) => string;
}

const steps: RegistrationStep[] = [
  {
    id: "name",
    question: "직원 이름이 어떻게 되나요?",
    type: "text",
    placeholder: "예: 김민수",
  },
  {
    id: "employee_type",
    question: "고용 형태가 어떻게 되나요?",
    type: "choice",
    choices: [
      { label: "정규직", value: "정규직" },
      { label: "계약직", value: "계약직" },
      { label: "아르바이트", value: "알바" },
    ],
  },
  {
    id: "pay_type",
    question: "급여 방식은요?",
    type: "choice",
    choices: [
      { label: "월급", value: "monthly" },
      { label: "시급", value: "hourly" },
    ],
  },
  {
    id: "pay_amount",
    question: "급여 금액이 얼마인가요?",
    type: "text",
    placeholder: "예: 250만원 또는 12000원",
    parse: (input: string) => {
      // Extract numbers from voice input like "이백오십만원", "250만원", "12000원"
      const cleaned = input.replace(/[,\s]/g, "");
      const manMatch = cleaned.match(/(\d+)\s*만/);
      if (manMatch) return String(Number(manMatch[1]) * 10000);
      const numMatch = cleaned.match(/(\d+)/);
      return numMatch ? numMatch[1] : input;
    },
  },
  {
    id: "weekly_hours",
    question: "주 몇 시간 근무하나요?",
    type: "text",
    placeholder: "예: 40시간",
    parse: (input: string) => {
      const match = input.match(/(\d+)/);
      return match ? match[1] : input;
    },
  },
  {
    id: "phone",
    question: "연락처를 알려주세요. (선택)",
    type: "text",
    placeholder: "예: 010-1234-5678",
  },
];

interface VoiceEmployeeRegistrationProps {
  onClose: () => void;
  onComplete: (employee: Record<string, string>) => void;
}

// Yarn ball avatar (reused from ChatOnboarding)
const YarnBallAvatar = () => (
  <div className="w-8 h-8 flex-shrink-0 rounded-full">
    <svg viewBox="0 0 32 32" className="w-full h-full" style={{ filter: "blur(3px) saturate(1.4)" }}>
      <circle cx="13" cy="12" r="10" fill="#007AFF" opacity={0.85} />
      <circle cx="19" cy="12" r="9" fill="#AF52DE" opacity={0.8} />
      <circle cx="16" cy="19" r="10" fill="#34C759" opacity={0.7} />
      <circle cx="14" cy="17" r="8" fill="#FF6B9D" opacity={0.6} />
      <circle cx="18" cy="16" r="7" fill="#FF9F0A" opacity={0.5} />
    </svg>
  </div>
);

// Oscilloscope
const MiniOscilloscope = ({ volumeRef }: { volumeRef: React.RefObject<number> }) => {
  const pathRef = useRef<SVGPathElement>(null);
  const animRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      const el = pathRef.current;
      if (!el) return;
      const t = Date.now() / 1000;
      const vol = volumeRef.current ?? 0;
      const amp = 2 + vol * 16;
      const points: string[] = [];
      for (let x = 0; x <= 200; x += 3) {
        const y = 15 + Math.sin(x * 0.02 + t * 2) * amp
          + Math.sin(x * 0.035 + t * 1.3) * amp * 0.3;
        points.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`);
      }
      el.setAttribute("d", points.join(" "));
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [volumeRef]);

  return (
    <div className="w-full h-8 pointer-events-none overflow-hidden">
      <svg viewBox="0 0 200 30" preserveAspectRatio="none" className="w-full h-full" style={{ filter: "blur(1px)" }}>
        <defs>
          <linearGradient id="empWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#007AFF" stopOpacity="0" />
            <stop offset="30%" stopColor="#007AFF" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#5856D6" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#AF52DE" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#AF52DE" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path ref={pathRef} fill="none" stroke="url(#empWaveGrad)" strokeWidth={2} strokeLinecap="round" />
      </svg>
    </div>
  );
};

export const VoiceEmployeeRegistration = ({ onClose, onComplete }: VoiceEmployeeRegistrationProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepRef = useRef(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [sttReady, setSttReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const advanceRef = useRef<(value: string) => void>();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const animFrameRef = useRef<number>();

  const step = steps[currentStep];

  // Determine which steps to show based on pay_type
  const getActiveSteps = useCallback((ans: Record<string, string>) => {
    return steps.filter((s) => {
      // weekly_hours only needed for hourly
      if (s.id === "weekly_hours" && ans.pay_type !== "hourly") return false;
      return true;
    });
  }, []);

  // STT
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    languageCode: "kor",
    onCommittedTranscript: (data) => {
      if (data.text?.trim() && advanceRef.current) {
        advanceRef.current(data.text.trim());
      }
    },
  });

  // Audio analysis
  useEffect(() => {
    if (!scribe.isConnected) { volumeRef.current = 0; return; }
    let cancelled = false;
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const audioCtx = new AudioContext();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.fftSize);
      } catch {}
    };
    const poll = () => {
      if (cancelled) return;
      if (analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
        let sum = 0;
        for (let i = 0; i < dataArrayRef.current.length; i++) {
          const n = (dataArrayRef.current[i] - 128) / 128; sum += n * n;
        }
        const rms = Math.sqrt(sum / dataArrayRef.current.length);
        volumeRef.current += (Math.min(1, rms * 8) - volumeRef.current) * 0.22;
      } else { volumeRef.current += (0 - volumeRef.current) * 0.08; }
      animFrameRef.current = requestAnimationFrame(poll);
    };
    initAudio().then(() => { if (!cancelled) poll(); });
    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
      streamRef.current = null; audioCtxRef.current = null; analyserRef.current = null;
    };
  }, [scribe.isConnected]);

  // Init STT
  useEffect(() => {
    const init = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
        if (error || !data?.token) return;
        await scribe.connect({ token: data.token, microphone: { echoCancellation: true, noiseSuppression: true } });
        setSttReady(true);
      } catch {}
    };
    init();
    return () => { scribe.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // First message
  useEffect(() => {
    const t = setTimeout(() => {
      setMessages([{ from: "bot", text: "직원을 등록할게요.\n이름부터 알려주세요!" }]);
      setTimeout(() => setShowInput(true), 500);
      setTimeout(() => setShowTextFallback(true), sttReady ? 5000 : 2000);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, scribe.partialTranscript]);

  const saveEmployee = useCallback(async (data: Record<string, string>) => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not logged in");

      const isHourly = data.pay_type === "hourly";
      const amount = Number(data.pay_amount) || 0;

      const { error } = await supabase.from("employees").insert({
        user_id: userData.user.id,
        name: data.name,
        employee_type: (data.employee_type || "정규직") as "정규직" | "계약직" | "아르바이트" | "일용직",
        monthly_salary: isHourly ? null : amount,
        hourly_rate: isHourly ? amount : null,
        weekly_hours: isHourly ? Number(data.weekly_hours) || null : null,
        phone: data.phone || null,
        source: "voice",
      });

      if (error) throw error;
      setCompleted(true);
      setMessages((prev) => [...prev, { from: "bot", text: `${data.name}님을 등록했어요! ✅` }]);
      setTimeout(() => onComplete(data), 1500);
    } catch (e) {
      console.error("Employee save failed:", e);
      setMessages((prev) => [...prev, { from: "bot", text: "등록 중 문제가 생겼어요. 다시 시도해주세요." }]);
    } finally {
      setSaving(false);
    }
  }, [onComplete]);

  const advance = useCallback((value: string) => {
    const currentStepData = getActiveSteps(answers)[currentStepRef.current];
    if (!currentStepData) return;

    // Parse if parser exists
    const parsed = currentStepData.parse ? currentStepData.parse(value) : value;

    // For choice steps, try to match voice input to a choice
    let finalValue = parsed;
    if (currentStepData.type === "choice" && currentStepData.choices) {
      const matched = currentStepData.choices.find(
        (c) => value.includes(c.label) || value.includes(c.value)
      );
      if (matched) finalValue = matched.value;
      else finalValue = parsed;
    }

    const newAnswers = { ...answers, [currentStepData.id]: finalValue };
    setAnswers(newAnswers);
    setMessages((prev) => [...prev, { from: "user", text: value }]);
    setShowInput(false);
    setShowTextFallback(false);
    setInputValue("");

    const activeSteps = getActiveSteps(newAnswers);
    const nextIdx = currentStepRef.current + 1;

    if (nextIdx < activeSteps.length) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { from: "bot", text: activeSteps[nextIdx].question }]);
        setCurrentStep(nextIdx);
        currentStepRef.current = nextIdx;
        setTimeout(() => setShowInput(true), 500);
        setTimeout(() => setShowTextFallback(true), sttReady ? 5000 : 2000);
      }, 600);
    } else {
      // Show confirmation
      setTimeout(() => {
        const payLabel = newAnswers.pay_type === "hourly"
          ? `시급 ${Number(newAnswers.pay_amount).toLocaleString()}원 · 주 ${newAnswers.weekly_hours}시간`
          : `월급 ${(Number(newAnswers.pay_amount) / 10000).toFixed(0)}만원`;
        setMessages((prev) => [...prev, {
          from: "bot",
          text: `확인할게요!\n\n👤 ${newAnswers.name}\n💼 ${newAnswers.employee_type}\n💰 ${payLabel}${newAnswers.phone ? `\n📱 ${newAnswers.phone}` : ""}\n\n이대로 등록할까요?`,
        }]);
        setCurrentStep(activeSteps.length); // confirmation step
        currentStepRef.current = activeSteps.length;
        setTimeout(() => setShowInput(true), 500);
      }, 600);
    }
  }, [answers, getActiveSteps, sttReady]);

  useEffect(() => { advanceRef.current = advance; }, [advance]);

  const activeSteps = getActiveSteps(answers);
  const isConfirmation = currentStep >= activeSteps.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "linear-gradient(180deg, #0A0A0F 0%, #12121A 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[250px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(52,199,89,0.08) 0%, transparent 70%)", filter: "blur(60px)" }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4" style={{ color: scribe.isConnected ? "#34C759" : "rgba(255,255,255,0.3)" }} />
          <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            직원 등록
          </span>
        </div>
        <button
          onClick={() => { scribe.disconnect(); onClose(); }}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
        </button>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 relative z-10 no-scrollbar">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {msg.from === "bot" ? (
                <div className="flex items-start gap-2.5 mb-3">
                  <YarnBallAvatar />
                  <div
                    className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[260px]"
                    style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end mb-3">
                  <div className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[240px]" style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}>
                    <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.95)" }}>{msg.text}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Live partial */}
        {scribe.partialTranscript && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end mb-3">
            <div className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[240px]" style={{ background: "linear-gradient(135deg, rgba(0,122,255,0.4), rgba(88,86,214,0.4))" }}>
              <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.6)" }}>{scribe.partialTranscript}</p>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Bottom input */}
      <AnimatePresence>
        {showInput && !completed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="relative z-10 px-4 pb-8 pt-2 flex flex-col items-center gap-1"
          >
            {!isConfirmation && <MiniOscilloscope volumeRef={volumeRef} />}

            {/* Choice chips */}
            {!isConfirmation && step?.type === "choice" && (
              <div className="flex flex-wrap gap-2 justify-center">
                {step.choices?.map((c) => (
                  <motion.button
                    key={c.value}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => advance(c.label)}
                    className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
                  >
                    {c.label}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Text input */}
            {!isConfirmation && step?.type === "text" && showTextFallback && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
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
                      background: inputValue.trim() ? "linear-gradient(135deg, #007AFF, #5856D6)" : "rgba(255,255,255,0.04)",
                      color: inputValue.trim() ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)",
                    }}
                  >
                    확인
                  </button>
                </div>
              </motion.div>
            )}

            {/* Confirmation buttons */}
            {isConfirmation && (
              <div className="flex gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { scribe.disconnect(); saveEmployee(answers); }}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #34C759, #30D158)", color: "#fff" }}
                >
                  <Check className="w-4 h-4" />
                  {saving ? "등록 중..." : "등록하기"}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    // Reset
                    setCurrentStep(0);
                    currentStepRef.current = 0;
                    setAnswers({});
                    setMessages([{ from: "bot", text: "처음부터 다시 할게요.\n이름부터 알려주세요!" }]);
                    setTimeout(() => setShowInput(true), 500);
                  }}
                  className="px-5 py-3.5 rounded-xl text-[14px] font-medium"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
                >
                  다시
                </motion.button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
