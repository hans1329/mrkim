import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
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

// Colorful cubic-ball avatar for bot — no border
const YarnBallAvatar = () => (
  <div className="w-8 h-8 flex-shrink-0 rounded-full">
    <svg viewBox="0 0 32 32" className="w-full h-full" style={{ filter: "blur(3px) saturate(1.4)" }}>
      <motion.circle cx="13" cy="12" r="10" fill="#007AFF" opacity={0.85}
        animate={{ cx: [13, 15, 13], cy: [12, 14, 12] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle cx="19" cy="12" r="9" fill="#AF52DE" opacity={0.8}
        animate={{ cx: [19, 17, 19], cy: [12, 14, 12] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle cx="16" cy="19" r="10" fill="#34C759" opacity={0.7}
        animate={{ cx: [16, 18, 16], cy: [19, 17, 19] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle cx="14" cy="17" r="8" fill="#FF6B9D" opacity={0.6}
        animate={{ cx: [14, 16, 14], cy: [17, 15, 17] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle cx="18" cy="16" r="7" fill="#FF9F0A" opacity={0.5}
        animate={{ cx: [18, 16, 18], cy: [16, 18, 16] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle cx="12" cy="18" r="8" fill="#5856D6" opacity={0.65}
        animate={{ cx: [12, 14, 12], cy: [18, 16, 18] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle cx="20" cy="14" r="7" fill="#FF375F" opacity={0.55}
        animate={{ cx: [20, 18, 20], cy: [14, 16, 14] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  </div>
);

// Oscilloscope waveform — uses real mic input to modulate amplitude of smooth sine waves
const OscilloscopeWave = () => {
  const volumeRef = useRef(0);
  const animFrameRef = useRef<number>();

  useEffect(() => {
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array<ArrayBuffer> | null = null;

    const init = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        audioCtx = new AudioContext();
        if (audioCtx.state === "suspended") {
          await audioCtx.resume();
        }
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.fftSize);
      } catch {
        // mic unavailable
      }
    };

    const poll = () => {
      if (analyser && dataArray) {
        analyser.getByteTimeDomainData(dataArray);

        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i += 1) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }

        const rms = Math.sqrt(sumSquares / dataArray.length);
        const boosted = Math.min(1, rms * 8);
        volumeRef.current += (boosted - volumeRef.current) * 0.22;
      } else {
        volumeRef.current += (0 - volumeRef.current) * 0.08;
      }
      animFrameRef.current = requestAnimationFrame(poll);
    };

    init().then(() => poll());

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (audioCtx) audioCtx.close();
    };
  }, []);

  // Amplitude driven by volume — idle ~3px, speaking ~14px
  const baseAmplitude = 3;
  const maxBoost = 11;

  return (
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
        <ReactiveWavePath
          volumeRef={volumeRef}
          baseAmplitude={baseAmplitude}
          maxBoost={maxBoost}
          stroke="url(#wave1Grad)"
          strokeWidth={2.5}
          freq={0.016}
          speed={1.8}
          phase={0}
        />
        <ReactiveWavePath
          volumeRef={volumeRef}
          baseAmplitude={baseAmplitude * 0.7}
          maxBoost={maxBoost * 0.6}
          stroke="url(#wave2Grad)"
          strokeWidth={1.8}
          freq={0.022}
          speed={2.3}
          phase={1.5}
        />
        <ReactiveWavePath
          volumeRef={volumeRef}
          baseAmplitude={baseAmplitude * 0.5}
          maxBoost={maxBoost * 0.4}
          stroke="url(#wave3Grad)"
          strokeWidth={1.2}
          freq={0.028}
          speed={2.8}
          phase={3.0}
        />
      </svg>
    </div>
  );
};

// Smooth sine wave path that reacts to volume
const ReactiveWavePath = ({
  volumeRef,
  baseAmplitude,
  maxBoost,
  stroke,
  strokeWidth,
  freq,
  speed,
  phase,
}: {
  volumeRef: React.RefObject<number>;
  baseAmplitude: number;
  maxBoost: number;
  stroke: string;
  strokeWidth: number;
  freq: number;
  speed: number;
  phase: number;
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const animRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      const el = pathRef.current;
      if (!el) return;

      const t = Date.now() / 1000;
      const vol = volumeRef.current ?? 0;
      const amp = baseAmplitude + vol * maxBoost;

      const points: string[] = [];
      for (let x = 0; x <= 390; x += 3) {
        const y = 20 + Math.sin(x * freq + t * speed + phase) * amp
                     + Math.sin(x * freq * 1.7 + t * speed * 0.7 + phase * 0.5) * amp * 0.3;
        points.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`);
      }
      el.setAttribute("d", points.join(" "));
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [volumeRef, baseAmplitude, maxBoost, freq, speed, phase]);

  return (
    <path
      ref={pathRef}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  );
};

export const ChatOnboarding = ({ onComplete, secretaryAvatarUrl }: ChatOnboardingProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepRef = useRef(0);
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
    commitStrategy: CommitStrategy.VAD,
    languageCode: "kor",
    onCommittedTranscript: (data) => {
      // action 타입 스텝에서는 음성으로 자동 진행하지 않음
      const currentStepType = steps[currentStepRef.current]?.type;
      if (currentStepType === "action") return;
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
        currentStepRef.current = nextIdx;
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
      <YarnBallAvatar />
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

      {/* Top bar: mic toggle (left) + skip (right) */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-4">
        <button
          onClick={() => {
            if (scribe.isConnected) {
              scribe.disconnect();
            } else {
              const reconnect = async () => {
                try {
                  const { data } = await supabase.functions.invoke("elevenlabs-scribe-token");
                  if (data?.token) {
                    await scribe.connect({
                      token: data.token,
                      microphone: { echoCancellation: true, noiseSuppression: true },
                    });
                    setSttReady(true);
                  }
                } catch {}
              };
              reconnect();
            }
          }}
          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full transition-colors"
          style={{
            color: scribe.isConnected ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)",
            background: scribe.isConnected ? "rgba(0,122,255,0.2)" : "rgba(255,255,255,0.05)",
            border: scribe.isConnected ? "1px solid rgba(0,122,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {scribe.isConnected ? (
            <>
              <Mic className="w-3.5 h-3.5" />
              음성 켜짐
            </>
          ) : (
            <>
              <MicOff className="w-3.5 h-3.5" />
              음성 꺼짐
            </>
          )}
        </button>
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
