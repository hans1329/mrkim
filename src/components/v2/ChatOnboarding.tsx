import { motion, AnimatePresence } from "framer-motion";
import { useV2Voice } from "./V2VoiceContext";
import { Mic, X, RotateCcw, Trash2, Upload, FileKey, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCardConnection } from "@/hooks/useCardConnection";
import { useAccountConnection } from "@/hooks/useAccountConnection";
import { useConnection } from "@/contexts/ConnectionContext";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────

type StepId =
  | "name" | "business_type" | "business_number"
  | "connect_intro"
  | "hometax_ask" | "hometax_cert" | "hometax_connecting"
  | "card_ask" | "card_select" | "card_id" | "card_pw" | "card_connecting"
  | "bank_ask" | "bank_select" | "bank_id" | "bank_pw" | "bank_connecting"
  | "delivery_ask" | "delivery_select" | "delivery_id" | "delivery_pw" | "delivery_connecting"
  | "complete";

interface StepDef {
  id: StepId;
  question: string;
  type: "text" | "choice" | "action" | "cert_upload" | "inline_loading" | "password";
  placeholder?: string;
  choices?: { label: string; value: string }[];
  actionLabel?: string;
  skipLabel?: string;
}

interface ValidationResult {
  isValid: boolean;
  normalizedValue?: string;
  retryMessage?: string;
}

// ─── Step definitions ──────────────────────────────────────

const BASIC_STEPS: StepDef[] = [
  { id: "name", question: "반갑습니다! 어떻게 불러드릴까요?", type: "text", placeholder: "예: 홍길동" },
  {
    id: "business_type", question: "어떤 사업을 하고 계세요?", type: "choice",
    choices: [
      { label: "음식점", value: "restaurant" },
      { label: "카페", value: "cafe" },
      { label: "소매/유통", value: "retail" },
      { label: "기타", value: "other" },
    ],
  },
  { id: "business_number", question: "사업자등록번호를 알려주시면\n세무 현황을 바로 확인해드릴게요.", type: "text", placeholder: "000-00-00000" },
];

const CONNECTION_STEPS: StepDef[] = [
  { id: "connect_intro", question: "이제 데이터를 연동하면\n매출·세무를 자동으로 관리해드려요.\n하나씩 안내해드릴게요!", type: "action", actionLabel: "좋아요, 시작할게요", skipLabel: "나중에 할게요" },

  // 홈택스
  { id: "hometax_ask", question: "먼저 국세청(홈택스)을 연동할까요?\n세금계산서를 자동으로 가져올 수 있어요.", type: "choice", choices: [{ label: "연동할게요", value: "yes" }, { label: "건너뛸게요", value: "skip" }] },
  { id: "hometax_cert", question: "공동인증서 파일을 업로드해주세요.\n(.pfx, .p12, .der 형식)", type: "cert_upload" },
  { id: "hometax_connecting", question: "국세청에 연결하고 있어요...", type: "inline_loading" },

  // 카드
  { id: "card_ask", question: "카드를 연동하면 지출을 자동 분류해드려요.\n연동할까요?", type: "choice", choices: [{ label: "연동할게요", value: "yes" }, { label: "건너뛸게요", value: "skip" }] },
  {
    id: "card_select", question: "어떤 카드사를 사용하세요?", type: "choice",
    choices: [
      { label: "신한카드", value: "shinhan" }, { label: "삼성카드", value: "samsung" },
      { label: "KB국민카드", value: "kb" }, { label: "현대카드", value: "hyundai" },
      { label: "롯데카드", value: "lotte" }, { label: "BC카드", value: "bc" },
      { label: "하나카드", value: "hana" }, { label: "우리카드", value: "woori" },
      { label: "NH농협카드", value: "nh" },
    ],
  },
  { id: "card_id", question: "카드사 아이디를 입력해주세요.", type: "text", placeholder: "카드사 로그인 ID" },
  { id: "card_pw", question: "카드사 비밀번호를 입력해주세요.", type: "password", placeholder: "카드사 로그인 비밀번호" },
  { id: "card_connecting", question: "카드사에 연결하고 있어요...", type: "inline_loading" },

  // 은행
  { id: "bank_ask", question: "은행 계좌를 연동하면\n입출금 내역을 자동으로 관리해요.\n연동할까요?", type: "choice", choices: [{ label: "연동할게요", value: "yes" }, { label: "건너뛸게요", value: "skip" }] },
  {
    id: "bank_select", question: "어떤 은행을 사용하세요?", type: "choice",
    choices: [
      { label: "신한은행", value: "shinhan" }, { label: "KB국민은행", value: "kb" },
      { label: "우리은행", value: "woori" }, { label: "하나은행", value: "hana" },
      { label: "NH농협은행", value: "nh" }, { label: "IBK기업은행", value: "ibk" },
      { label: "카카오뱅크", value: "kakao" }, { label: "토스뱅크", value: "toss" },
    ],
  },
  { id: "bank_id", question: "은행 아이디를 입력해주세요.", type: "text", placeholder: "인터넷뱅킹 ID" },
  { id: "bank_pw", question: "은행 비밀번호를 입력해주세요.", type: "password", placeholder: "인터넷뱅킹 비밀번호" },
  { id: "bank_connecting", question: "은행에 연결하고 있어요...", type: "inline_loading" },

  // 배달
  { id: "delivery_ask", question: "배달앱을 연동하면\n주문·정산을 한눈에 볼 수 있어요.\n연동할까요?", type: "choice", choices: [{ label: "배민 연동", value: "baemin" }, { label: "쿠팡이츠 연동", value: "coupangeats" }, { label: "건너뛸게요", value: "skip" }] },
  { id: "delivery_id", question: "배달앱 아이디를 입력해주세요.", type: "text", placeholder: "배달앱 로그인 ID" },
  { id: "delivery_pw", question: "배달앱 비밀번호를 입력해주세요.", type: "password", placeholder: "배달앱 비밀번호" },
  { id: "delivery_connecting", question: "배달앱에 연결하고 있어요...", type: "inline_loading" },

  { id: "complete", question: "설정이 완료되었어요! 🎉\n이제 김비서가 대표님의 사업을 도와드릴게요.", type: "action", actionLabel: "시작하기" },
];

const ALL_STEPS = [...BASIC_STEPS, ...CONNECTION_STEPS];

const STEP_LABELS: Record<string, string> = {
  name: "이름", business_type: "업종", business_number: "사업자번호",
};

const CHOICE_SYNONYMS: Partial<Record<StepId, Record<string, string>>> = {
  business_type: {
    음식점: "음식점",
    식당: "음식점",
    레스토랑: "음식점",
    카페: "카페",
    커피숍: "카페",
    커피샵: "카페",
    소매: "소매/유통",
    유통: "소매/유통",
    소매유통: "소매/유통",
    기타: "기타",
  },
  hometax_ask: {
    연동할게요: "연동할게요",
    네: "연동할게요",
    예: "연동할게요",
    응: "연동할게요",
    좋아요: "연동할게요",
    할게요: "연동할게요",
    건너뛸게요: "건너뛸게요",
    건너뛰기: "건너뛸게요",
    아니오: "건너뛸게요",
    아니요: "건너뛸게요",
    됐어요: "건너뛸게요",
    나중에: "건너뛸게요",
  },
  card_ask: {
    연동할게요: "연동할게요",
    네: "연동할게요",
    예: "연동할게요",
    응: "연동할게요",
    좋아요: "연동할게요",
    할게요: "연동할게요",
    건너뛸게요: "건너뛸게요",
    건너뛰기: "건너뛸게요",
    아니오: "건너뛸게요",
    아니요: "건너뛸게요",
    나중에: "건너뛸게요",
  },
  bank_ask: {
    연동할게요: "연동할게요",
    네: "연동할게요",
    예: "연동할게요",
    응: "연동할게요",
    좋아요: "연동할게요",
    할게요: "연동할게요",
    건너뛸게요: "건너뛸게요",
    건너뛰기: "건너뛸게요",
    아니오: "건너뛸게요",
    아니요: "건너뛸게요",
    나중에: "건너뛸게요",
  },
  delivery_ask: {
    배민연동: "배민 연동",
    배민: "배민 연동",
    배달의민족: "배민 연동",
    쿠팡이츠: "쿠팡이츠 연동",
    쿠팡이츠연동: "쿠팡이츠 연동",
    건너뛸게요: "건너뛸게요",
    건너뛰기: "건너뛸게요",
    나중에: "건너뛸게요",
  },
  card_select: {
    신한: "신한카드",
    신한카드: "신한카드",
    삼성: "삼성카드",
    삼성카드: "삼성카드",
    국민카드: "KB국민카드",
    케이비국민카드: "KB국민카드",
    KB국민카드: "KB국민카드",
    현대: "현대카드",
    현대카드: "현대카드",
    롯데: "롯데카드",
    롯데카드: "롯데카드",
    비씨카드: "BC카드",
    BC카드: "BC카드",
    하나카드: "하나카드",
    우리카드: "우리카드",
    농협카드: "NH농협카드",
    NH농협카드: "NH농협카드",
  },
  bank_select: {
    신한은행: "신한은행",
    신한: "신한은행",
    국민은행: "KB국민은행",
    케이비국민은행: "KB국민은행",
    KB국민은행: "KB국민은행",
    우리은행: "우리은행",
    하나은행: "하나은행",
    농협은행: "NH농협은행",
    NH농협은행: "NH농협은행",
    기업은행: "IBK기업은행",
    IBK기업은행: "IBK기업은행",
    카카오뱅크: "카카오뱅크",
    토스뱅크: "토스뱅크",
  },
};

function normalizeChoiceValue(stepDef: StepDef, rawValue: string): string | null {
  const compact = rawValue.replace(/\s/g, "");
  const trimmed = rawValue.trim();
  const synonyms = CHOICE_SYNONYMS[stepDef.id];

  // 1) Exact match on synonyms
  const matchedSynonym = synonyms?.[compact] || synonyms?.[trimmed];
  if (matchedSynonym) return matchedSynonym;

  // 2) Substring/contains match on synonym keys (e.g. "카페를 하고 있다고" contains "카페")
  if (synonyms) {
    // Sort keys longest-first to prefer more specific matches
    const sortedKeys = Object.keys(synonyms).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (compact.includes(key) || trimmed.includes(key)) {
        return synonyms[key];
      }
    }
  }

  // 3) Exact match on choice labels/values
  const matchedChoice = stepDef.choices?.find((choice) => {
    const labelCompact = choice.label.replace(/\s/g, "");
    return labelCompact === compact || choice.label === trimmed || choice.value === trimmed;
  });
  if (matchedChoice) return matchedChoice.label;

  // 4) Substring match on choice labels
  const substringChoice = stepDef.choices?.find((choice) => {
    const labelCompact = choice.label.replace(/\s/g, "");
    return compact.includes(labelCompact) || trimmed.includes(choice.label);
  });
  return substringChoice?.label || null;
}

function validateStepInput(stepDef: StepDef, rawValue: string): ValidationResult {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return {
      isValid: false,
      retryMessage: "잘 못 들었어요. 한 번만 다시 말씀해주시겠어요?",
    };
  }

  if (stepDef.type === "choice") {
    const normalizedChoice = normalizeChoiceValue(stepDef, trimmed);
    if (!normalizedChoice) {
      const labels = stepDef.choices?.map((choice) => choice.label).join(", ");
      return {
        isValid: false,
        retryMessage: labels
          ? `잘 못 들었어요. ${labels} 중에서 다시 말씀해주시겠어요?`
          : "잘 못 들었어요. 다시 말씀해주시겠어요?",
      };
    }

    return { isValid: true, normalizedValue: normalizedChoice };
  }

  switch (stepDef.id) {
    case "name": {
      const cleanedName = trimmed.replace(/[^가-힣a-zA-Z0-9\s]/g, "").replace(/\s+/g, " ").trim();
      if (cleanedName.length < 2) {
        return {
          isValid: false,
          retryMessage: "성함을 정확히 못 들었어요. 이름을 다시 말씀해주시거나 직접 입력해주세요.",
        };
      }
      return { isValid: true, normalizedValue: cleanedName };
    }

    case "business_number": {
      const digits = trimmed.replace(/\D/g, "");
      if (digits.length !== 10) {
        return {
          isValid: false,
          retryMessage: "사업자등록번호는 10자리예요. 다시 말씀해주시거나 직접 입력해주세요.",
        };
      }
      return { isValid: true, normalizedValue: digits };
    }

    default:
      return { isValid: true, normalizedValue: trimmed };
  }
}

// ─── Shared components ──────────────────────────────────────

interface ChatOnboardingProps {
  onComplete: (data: Record<string, string>) => void;
  onProgress?: (partialData: Record<string, string>) => void | Promise<void>;
  secretaryAvatarUrl?: string | null;
  existingData?: Record<string, string>;
}

const YarnBallAvatar = () => (
  <div className="w-8 h-8 flex-shrink-0 rounded-full">
    <svg viewBox="0 0 32 32" className="w-full h-full" style={{ filter: "blur(3px) saturate(1.4)" }}>
      <circle cx="13" cy="12" r="10" fill="#007AFF" opacity={0.85} />
      <circle cx="19" cy="12" r="9" fill="#AF52DE" opacity={0.8} />
      <circle cx="16" cy="19" r="10" fill="#34C759" opacity={0.7} />
      <circle cx="14" cy="17" r="8" fill="#FF6B9D" opacity={0.6} />
      <circle cx="18" cy="16" r="7" fill="#FF9F0A" opacity={0.5} />
      <circle cx="12" cy="18" r="8" fill="#5856D6" opacity={0.65} />
      <circle cx="20" cy="14" r="7" fill="#FF375F" opacity={0.55} />
    </svg>
  </div>
);

// ─── Oscilloscope ──────────────────────────────────────────

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
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
        audioCtx = new AudioContext();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        dataArray = new Uint8Array(analyser.fftSize);
      } catch { /* mic unavailable */ }
    };

    const poll = () => {
      if (analyser && dataArray) {
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) { const n = (dataArray[i] - 128) / 128; sumSquares += n * n; }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        volumeRef.current += (Math.min(1, rms * 8) - volumeRef.current) * 0.22;
      } else {
        volumeRef.current += (0 - volumeRef.current) * 0.08;
      }
      animFrameRef.current = requestAnimationFrame(poll);
    };

    init().then(() => poll());
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (audioCtx) audioCtx.close();
    };
  }, []);

  const baseAmplitude = 2.5;
  const maxBoost = 20;

  return (
    <div className="w-full h-10 pointer-events-none overflow-hidden mb-2">
      <svg viewBox="0 0 390 40" preserveAspectRatio="none" className="w-full h-full" style={{ filter: "blur(1px)" }}>
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
        <ReactiveWavePath volumeRef={volumeRef} baseAmplitude={baseAmplitude} maxBoost={maxBoost} stroke="url(#wave1Grad)" strokeWidth={2.5} freq={0.016} speed={1.8} phase={0} />
        <ReactiveWavePath volumeRef={volumeRef} baseAmplitude={baseAmplitude * 0.7} maxBoost={maxBoost * 0.6} stroke="url(#wave2Grad)" strokeWidth={1.8} freq={0.022} speed={2.3} phase={1.5} />
        <ReactiveWavePath volumeRef={volumeRef} baseAmplitude={baseAmplitude * 0.5} maxBoost={maxBoost * 0.4} stroke="url(#wave3Grad)" strokeWidth={1.2} freq={0.028} speed={2.8} phase={3.0} />
      </svg>
    </div>
  );
};

const ReactiveWavePath = ({ volumeRef, baseAmplitude, maxBoost, stroke, strokeWidth, freq, speed, phase }: {
  volumeRef: React.RefObject<number>; baseAmplitude: number; maxBoost: number;
  stroke: string; strokeWidth: number; freq: number; speed: number; phase: number;
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
        const y = 20 + Math.sin(x * freq + t * speed + phase) * amp + Math.sin(x * freq * 1.7 + t * speed * 0.7 + phase * 0.5) * amp * 0.3;
        points.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`);
      }
      el.setAttribute("d", points.join(" "));
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [volumeRef, baseAmplitude, maxBoost, freq, speed, phase]);
  return <path ref={pathRef} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />;
};

// ─── Main Component ──────────────────────────────────────

export const ChatOnboarding = ({ onComplete, onProgress, secretaryAvatarUrl, existingData = {} }: ChatOnboardingProps) => {
  const hasExisting = Object.keys(existingData).length > 0;

  // Build step flow - skip basic steps already completed
  const buildStepFlow = useCallback((): StepDef[] => {
    const flow: StepDef[] = [];
    for (const s of BASIC_STEPS) {
      if (!existingData[s.id]) flow.push(s);
    }
    flow.push(...CONNECTION_STEPS);
    return flow;
  }, [existingData]);

  const [stepFlow, setStepFlow] = useState<StepDef[]>(buildStepFlow);
  const [currentIdx, setCurrentIdx] = useState(0);
  const currentIdxRef = useRef(0);
  const [answers, setAnswers] = useState<Record<string, string>>(existingData);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<{ from: "bot" | "user"; text: string }[]>([]);
  const [showInput, setShowInput] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [sttReady, setSttReady] = useState(false);
  const advanceRef = useRef<(value: string) => void>();
  const [badgeMode, setBadgeMode] = useState<{ stepId: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const {
    volumeRef: headerVolumeRef,
    isConnected,
    partialTranscript,
    toggleVoice,
    onCommit,
  } = useV2Voice();

  useEffect(() => {
    onCommit((rawText) => {
      const cStep = stepFlow[currentIdxRef.current];
      if (cStep?.type === "action" || cStep?.type === "cert_upload" || cStep?.type === "inline_loading" || cStep?.type === "password") return;
      const text = rawText.trim();
      if (!text || text.length < 2) return;
      const NOISE_PATTERNS = /^(음+|어+|아+|으+|응+|흠+|에+|ㅎ+|\.+|…+)$/;
      if (NOISE_PATTERNS.test(text)) return;
      if (advanceRef.current) advanceRef.current(text);
    });
  }, [onCommit, stepFlow]);

  useEffect(() => {
    if (isConnected) {
      setSttReady(true);
      return;
    }

    void toggleVoice().then(() => setSttReady(true));
  }, [isConnected, toggleVoice]);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Navigation helpers ──────────────────────────────────

  const goToStep = useCallback((targetId: StepId) => {
    const idx = stepFlow.findIndex(s => s.id === targetId);
    if (idx >= 0) {
      setCurrentIdx(idx);
      currentIdxRef.current = idx;
      setMessages(prev => [...prev, { from: "bot", text: stepFlow[idx].question }]);
      setShowInput(false);
      setTimeout(() => setShowInput(true), 500);
      setTimeout(() => setShowTextFallback(true), 2000);
    }
  }, [stepFlow]);

  const goToNext = useCallback(() => {
    if (currentIdx < stepFlow.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      currentIdxRef.current = nextIdx;
      setMessages(prev => [...prev, { from: "bot", text: stepFlow[nextIdx].question }]);
      setShowInput(false);
      setTimeout(() => setShowInput(true), 500);
      setTimeout(() => setShowTextFallback(true), sttReady ? 5000 : 2000);
    }
  }, [currentIdx, stepFlow, sttReady]);

  // File → Base64
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => { const r = reader.result as string; resolve(r.split(",")[1] || r); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // ─── Connection handlers ──────────────────────────────────

  const handleHometaxConnect = useCallback(async () => {
    if (!certFile || !certPassword) return;
    setIsConnecting(true);
    goToStep("hometax_connecting");

    try {
      const certFileBase64 = await fileToBase64(certFile);
      let keyFileBase64: string | undefined;
      if (keyFile) keyFileBase64 = await fileToBase64(keyFile);

      const brn = answers.business_number?.replace(/\D/g, "") || "";
      const mid = brn.length >= 5 ? parseInt(brn.substring(3, 5), 10) : 0;
      const clientType = mid >= 81 ? "B" : "P";

      const { data, error } = await supabase.functions.invoke("codef-hometax", {
        body: { action: "register", businessNumber: brn, certFileBase64, certPassword, keyFileBase64, clientType },
      });

      if (error || data?.status !== "completed") {
        const errMsg = data?.error || "홈택스 연동에 실패했어요.";
        setMessages(prev => [...prev, { from: "bot", text: `❌ ${errMsg}\n다시 시도하거나 건너뛸 수 있어요.` }]);
        setCertFile(null);
        setCertPassword("");
        goToStep("hometax_cert");
        return;
      }

      await connectService("codef_hometax_tax_invoice", data.connectedId || undefined);
      setMessages(prev => [...prev, { from: "bot", text: "✅ 국세청 연동 완료! 세금계산서를 자동으로 가져올게요." }]);
      setAnswers(prev => ({ ...prev, hometax: "connected" }));
      setCertFile(null);
      setCertPassword("");

      // Move to card
      setTimeout(() => goToStep("card_ask"), 800);
    } catch (err) {
      setMessages(prev => [...prev, { from: "bot", text: "연결 중 오류가 발생했어요. 다시 시도해주세요." }]);
      goToStep("hometax_cert");
    } finally {
      setIsConnecting(false);
    }
  }, [certFile, certPassword, keyFile, answers, connectService, goToStep]);

  const handleCardConnect = useCallback(async () => {
    const cardCompany = answers.card_select;
    const id = answers.card_id;
    const pw = answers.card_pw;
    if (!cardCompany || !id || !pw) return;

    setIsConnecting(true);
    goToStep("card_connecting");

    try {
      const brn = answers.business_number?.replace(/\D/g, "") || "";
      const mid = brn.length >= 5 ? parseInt(brn.substring(3, 5), 10) : 0;
      const clientType = mid >= 81 ? "B" : "P";

      const connectedId = await registerCardAccount(cardCompany, id, pw, undefined, clientType);
      if (connectedId) {
        await connectService(`codef_card_${cardCompany}`, connectedId);
        setMessages(prev => [...prev, { from: "bot", text: "✅ 카드 연동 완료! 지출 내역을 자동으로 가져올게요." }]);
        setAnswers(prev => ({ ...prev, card: "connected" }));
        setTimeout(() => goToStep("bank_ask"), 800);
      } else {
        setMessages(prev => [...prev, { from: "bot", text: "❌ 카드사 연결에 실패했어요.\n아이디와 비밀번호를 확인해주세요." }]);
        goToStep("card_id");
      }
    } catch (err) {
      setMessages(prev => [...prev, { from: "bot", text: "❌ 연결 중 오류가 발생했어요. 다시 시도해주세요." }]);
      goToStep("card_id");
    } finally {
      setIsConnecting(false);
    }
  }, [answers, registerCardAccount, connectService, goToStep]);

  const handleBankConnect = useCallback(async () => {
    const bankId = answers.bank_select;
    const id = answers.bank_id;
    const pw = answers.bank_pw;
    if (!bankId || !id || !pw) return;

    setIsConnecting(true);
    goToStep("bank_connecting");

    try {
      const brn = answers.business_number?.replace(/\D/g, "") || "";
      const mid = brn.length >= 5 ? parseInt(brn.substring(3, 5), 10) : 0;
      const clientType = mid >= 81 ? "B" : "P";

      const connectedId = await registerBankAccount(bankId, id, pw, undefined, clientType);
      if (connectedId) {
        await connectService(`codef_bank_${bankId}`, connectedId);
        setMessages(prev => [...prev, { from: "bot", text: "✅ 은행 연동 완료! 입출금 내역을 자동으로 관리할게요." }]);
        setAnswers(prev => ({ ...prev, bank: "connected" }));
        setTimeout(() => goToStep("delivery_ask"), 800);
      } else {
        setMessages(prev => [...prev, { from: "bot", text: "❌ 은행 연결에 실패했어요.\n아이디와 비밀번호를 확인해주세요." }]);
        goToStep("bank_id");
      }
    } catch (err) {
      setMessages(prev => [...prev, { from: "bot", text: "❌ 연결 중 오류가 발생했어요. 다시 시도해주세요." }]);
      goToStep("bank_id");
    } finally {
      setIsConnecting(false);
    }
  }, [answers, registerBankAccount, connectService, goToStep]);

  const handleDeliveryConnect = useCallback(async () => {
    const platform = selectedDeliveryPlatform;
    const id = answers.delivery_id;
    const pw = answers.delivery_pw;
    if (!platform || !id || !pw) return;

    setIsConnecting(true);
    goToStep("delivery_connecting");

    try {
      const funcName = platform === "baemin" ? "hyphen-baemin" : "hyphen-coupangeats";
      const { data, error } = await supabase.functions.invoke(funcName, {
        body: { action: "verify", userId: id, userPw: pw },
      });

      if (error || !data?.success) {
        setMessages(prev => [...prev, { from: "bot", text: `❌ ${data?.error || "계정 검증에 실패했어요."}\n아이디와 비밀번호를 확인해주세요.` }]);
        goToStep("delivery_id");
        return;
      }

      const connectorId = platform === "baemin" ? "hyphen_baemin" : "hyphen_coupangeats";
      await connectService(connectorId);
      setMessages(prev => [...prev, { from: "bot", text: "✅ 배달앱 연동 완료! 주문·정산을 자동으로 관리할게요." }]);
      setAnswers(prev => ({ ...prev, delivery: "connected" }));

      setTimeout(() => goToStep("complete"), 800);
    } catch (err) {
      setMessages(prev => [...prev, { from: "bot", text: "❌ 연결 중 오류가 발생했어요. 다시 시도해주세요." }]);
      goToStep("delivery_id");
    } finally {
      setIsConnecting(false);
    }
  }, [selectedDeliveryPlatform, answers, connectService, goToStep]);

  // ─── Main advance function ──────────────────────────────

  const advance = useCallback(async (value: string) => {
    if (!step) return;

    const validation = validateStepInput(step, value);
    if (!validation.isValid) {
      setShowInput(false);
      setShowTextFallback(false);
      setInputValue("");
      setMessages(prev => [
        ...prev,
        { from: "bot", text: validation.retryMessage || "잘 못 들었어요. 다시 말씀해주시겠어요?" },
        { from: "bot", text: step.question },
      ]);
      setTimeout(() => setShowInput(true), 400);
      setTimeout(() => setShowTextFallback(true), 1600);
      return;
    }

    const normalizedValue = validation.normalizedValue ?? value.trim();
    const newAnswers = { ...answers, [step.id]: normalizedValue };
    setAnswers(newAnswers);
    setShowInput(false);
    setShowTextFallback(false);
    setInputValue("");

    if (step.id === "name" || step.id === "business_type" || step.id === "business_number") {
      void onProgress?.({ [step.id]: normalizedValue });
    }

    // Don't show user bubble for skip/action types that aren't user text
    const isAction = step.type === "action";
    if (!isAction) {
      const displayValue = step.type === "password" ? "••••••••" : normalizedValue;
      setMessages(prev => [...prev, { from: "user", text: displayValue }]);
    }

    // Route based on step
      switch (step.id) {
        case "connect_intro":
          if (normalizedValue === "skip") {
            if (isConnected) void toggleVoice();
            onComplete(newAnswers);
            return;
          }
          setTimeout(() => goToStep("hometax_ask"), 600);
          break;
...
        case "complete":
          if (isConnected) void toggleVoice();
          onComplete(newAnswers);
          break;

      default:
        // Basic steps - go to next
        setTimeout(() => goToNext(), 600);
        break;
    }
  }, [answers, goToNext, goToStep, handleBankConnect, handleCardConnect, handleDeliveryConnect, isConnected, onComplete, onProgress, step, toggleVoice]);

  useEffect(() => { advanceRef.current = (value: string) => { void advance(value); }; }, [advance]);

  // Badge handlers (for basic steps only)
  const handleBadgeClick = useCallback((stepId: string) => {
    const label = STEP_LABELS[stepId] || stepId;
    const value = answers[stepId];
    setBadgeMode({ stepId });
    setShowInput(false);
    setMessages(prev => [...prev, { from: "bot", text: `"${label}: ${value}" 항목을 어떻게 할까요?` }]);
  }, [answers]);

  const handleBadgeAction = useCallback((action: "redo" | "delete") => {
    if (!badgeMode) return;
    const { stepId } = badgeMode;
    const label = STEP_LABELS[stepId] || stepId;

    if (action === "delete") {
      const newA = { ...answers };
      delete newA[stepId];
      setAnswers(newA);

      // Clear from DB too
      void onProgress?.({ [stepId]: "" });

      setMessages(prev => [...prev, { from: "user", text: "삭제할게요" }, { from: "bot", text: `${label} 정보가 삭제되었어요.` }]);
      setBadgeMode(null);

      // If step is not in current stepFlow (was pre-filled from existingData), re-insert it
      let idx = stepFlow.findIndex(s => s.id === stepId);
      if (idx < 0) {
        const stepDef = BASIC_STEPS.find(s => s.id === stepId);
        if (stepDef) {
          // Insert at the beginning (before connection steps)
          const basicEnd = stepFlow.findIndex(s => CONNECTION_STEPS.some(cs => cs.id === s.id));
          const insertAt = basicEnd >= 0 ? basicEnd : 0;
          const newFlow = [...stepFlow];
          newFlow.splice(insertAt, 0, stepDef);
          setStepFlow(newFlow);
          idx = insertAt;
          setTimeout(() => {
            setCurrentIdx(idx);
            currentIdxRef.current = idx;
            setMessages(prev => [...prev, { from: "bot", text: stepDef.question }]);
            setShowInput(true);
            setShowTextFallback(true);
          }, 800);
          return;
        }
      }
      if (idx >= 0) {
        setTimeout(() => { setCurrentIdx(idx); currentIdxRef.current = idx; setMessages(prev => [...prev, { from: "bot", text: stepFlow[idx].question }]); setShowInput(true); setShowTextFallback(true); }, 800);
      }
    } else {
      setMessages(prev => [...prev, { from: "user", text: "다시 입력할게요" }]);
      setBadgeMode(null);
      let idx = stepFlow.findIndex(s => s.id === stepId);
      if (idx < 0) {
        const stepDef = BASIC_STEPS.find(s => s.id === stepId);
        if (stepDef) {
          const basicEnd = stepFlow.findIndex(s => CONNECTION_STEPS.some(cs => cs.id === s.id));
          const insertAt = basicEnd >= 0 ? basicEnd : 0;
          const newFlow = [...stepFlow];
          newFlow.splice(insertAt, 0, stepDef);
          setStepFlow(newFlow);
          idx = insertAt;
          setTimeout(() => {
            setCurrentIdx(idx);
            currentIdxRef.current = idx;
            setMessages(prev => [...prev, { from: "bot", text: stepDef.question }]);
            setShowInput(true);
            setShowTextFallback(true);
          }, 500);
          return;
        }
      }
      if (idx >= 0) {
        setTimeout(() => { setCurrentIdx(idx); currentIdxRef.current = idx; setMessages(prev => [...prev, { from: "bot", text: stepFlow[idx].question }]); setShowInput(true); setShowTextFallback(true); }, 500);
      }
    }
  }, [badgeMode, answers, stepFlow, onProgress]);

  // ─── Bubble components ──────────────────────────────────

  const SecretaryBubble = ({ text }: { text: string }) => (
    <div className="flex items-start gap-2.5 mb-3">
      <YarnBallAvatar />
      <div className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[260px]" style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.85)" }}>{text}</p>
      </div>
    </div>
  );

  const UserBubble = ({ text }: { text: string }) => (
    <div className="flex justify-end mb-3">
      <div className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[240px]" style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}>
        <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.95)" }}>{text}</p>
      </div>
    </div>
  );

  // ─── Cert upload handler ──────────────────────────────────

  const handleCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase();
    if (ext.endsWith(".pfx") || ext.endsWith(".p12")) { setCertFile(file); setKeyFile(null); }
    else if (ext.endsWith(".der")) { setCertFile(file); }
    else { toast.error("PFX, P12 또는 DER 파일만 지원합니다."); }
  };

  const handleKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.name.toLowerCase().endsWith(".key")) setKeyFile(file);
    else toast.error("signPri.key 파일만 업로드 가능합니다.");
  };

  const isDerMode = certFile?.name.toLowerCase().endsWith(".der");

  // ─── Render ──────────────────────────────────────────────

  return (
    <div className="absolute inset-x-0 top-0 bottom-0 z-30 flex flex-col" style={{ background: "linear-gradient(180deg, #0A0A0F 0%, #12121A 100%)" }}>
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(88,86,214,0.1) 0%, transparent 70%)", filter: "blur(60px)" }} />

      {/* Header with oscilloscope + mic + close */}
      <div className="relative z-10 flex items-center justify-center px-4 pt-3 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}>
        {/* Centered oscilloscope + mic group */}
        <div className="flex items-center gap-3" style={{ maxWidth: "440px" }}>
          <div className="h-8 overflow-hidden rounded-xl relative" style={{ width: "400px" }}>
            <svg viewBox="0 0 260 32" preserveAspectRatio="none" className="w-full h-full" style={{ filter: "blur(0.8px)" }}>
              <defs>
                <linearGradient id="onb-wave1" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#007AFF" stopOpacity="0" />
                  <stop offset="30%" stopColor="#007AFF" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#5856D6" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#AF52DE" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#AF52DE" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="onb-wave2" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FF6B9D" stopOpacity="0" />
                  <stop offset="25%" stopColor="#FF6B9D" stopOpacity="0.35" />
                  <stop offset="50%" stopColor="#007AFF" stopOpacity="0.4" />
                  <stop offset="75%" stopColor="#34C759" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#34C759" stopOpacity="0" />
                </linearGradient>
              </defs>
              <ReactiveWavePath volumeRef={headerVolumeRef} baseAmplitude={2} maxBoost={14} stroke="url(#onb-wave1)" strokeWidth={2} freq={0.024} speed={1.8} phase={0} />
              <ReactiveWavePath volumeRef={headerVolumeRef} baseAmplitude={1.2} maxBoost={7} stroke="url(#onb-wave2)" strokeWidth={1.4} freq={0.032} speed={2.3} phase={1.5} />
            </svg>
          </div>
          <button onClick={() => { void toggleVoice(); }} className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
            <Mic className="w-4.5 h-4.5" style={{ color: isConnected ? "#007AFF" : "rgba(255,255,255,0.35)" }} />
          </button>
        </div>

        {/* Close */}
        <button className="absolute right-3 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} onClick={() => { if (isConnected) void toggleVoice(); onComplete(answers); }}>
          <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
        </button>
      </div>
...
        {/* Live partial transcript */}
        {partialTranscript && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end mb-3">
            <div className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[240px]" style={{ background: "linear-gradient(135deg, rgba(0,122,255,0.4), rgba(88,86,214,0.4))" }}>
              <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.6)" }}>{partialTranscript}</p>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Badge action buttons */}
      <AnimatePresence>
        {badgeMode && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative z-10 px-4 pb-8 pt-3 flex gap-3 justify-center">
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleBadgeAction("redo")} className="flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold" style={{ background: "rgba(0,122,255,0.12)", border: "1px solid rgba(0,122,255,0.25)", color: "#007AFF" }}>
              <RotateCcw className="w-3.5 h-3.5" /> 다시 입력
            </motion.button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleBadgeAction("delete")} className="flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-semibold" style={{ background: "rgba(255,69,58,0.1)", border: "1px solid rgba(255,69,58,0.2)", color: "#FF453A" }}>
              <Trash2 className="w-3.5 h-3.5" /> 삭제
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom input area */}
      <AnimatePresence>
        {showInput && step && !badgeMode && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="relative z-10 px-4 pb-8 pt-3 flex flex-col items-center gap-1">


            {/* Choice chips */}
            {step.type === "choice" && (
              <div className="flex flex-wrap gap-2 justify-center">
                {step.choices?.map(c => (
                  <motion.button key={c.value} whileTap={{ scale: 0.95 }} onClick={() => advance(c.label)}
                    className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
                  >{c.label}</motion.button>
                ))}
              </div>
            )}

            {/* Text input */}
            {step.type === "text" && (
              <AnimatePresence>
                {showTextFallback && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                    <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <input value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === "Enter" && inputValue.trim() && advance(inputValue.trim())} placeholder={step.placeholder} className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/20" style={{ color: "rgba(255,255,255,0.8)" }} />
                      <button onClick={() => inputValue.trim() && advance(inputValue.trim())} className="px-2.5 py-1 rounded-lg text-[12px] font-semibold" style={{ background: inputValue.trim() ? "linear-gradient(135deg, #007AFF, #5856D6)" : "rgba(255,255,255,0.04)", color: inputValue.trim() ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)" }}>
                        확인
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* Password input */}
            {step.type === "password" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <input type={showPassword ? "text" : "password"} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => e.key === "Enter" && inputValue.trim() && advance(inputValue.trim())} placeholder={step.placeholder} className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/20" style={{ color: "rgba(255,255,255,0.8)" }} />
                  <button onClick={() => setShowPassword(!showPassword)} className="p-1">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} /> : <Eye className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />}
                  </button>
                  <button onClick={() => inputValue.trim() && advance(inputValue.trim())} className="px-2.5 py-1 rounded-lg text-[12px] font-semibold" style={{ background: inputValue.trim() ? "linear-gradient(135deg, #007AFF, #5856D6)" : "rgba(255,255,255,0.04)", color: inputValue.trim() ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.2)" }}>
                    확인
                  </button>
                </div>
              </motion.div>
            )}

            {/* Cert upload */}
            {step.type === "cert_upload" && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-3">
                <input ref={certFileInputRef} type="file" accept=".pfx,.p12,.der" onChange={handleCertFileChange} className="hidden" />
                <input ref={keyFileInputRef} type="file" accept=".key" onChange={handleKeyFileChange} className="hidden" />

                {/* Cert file button */}
                <button onClick={() => certFileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px]" style={{ background: "rgba(255,255,255,0.04)", border: certFile ? "1px solid rgba(0,122,255,0.3)" : "1px dashed rgba(255,255,255,0.15)" }}>
                  {certFile ? (
                    <>
                      <FileKey className="w-4 h-4" style={{ color: "#007AFF" }} />
                      <span className="flex-1 text-left truncate" style={{ color: "rgba(255,255,255,0.8)" }}>{certFile.name}</span>
                      <button onClick={e => { e.stopPropagation(); setCertFile(null); setKeyFile(null); }} className="p-0.5"><X className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} /></button>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>인증서 파일 (.pfx, .p12 또는 .der)</span>
                    </>
                  )}
                </button>

                {/* DER mode: key file */}
                {isDerMode && (
                  <button onClick={() => keyFileInputRef.current?.click()} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px]" style={{ background: "rgba(255,255,255,0.04)", border: keyFile ? "1px solid rgba(0,122,255,0.3)" : "1px dashed rgba(255,255,255,0.15)" }}>
                    {keyFile ? (
                      <>
                        <FileKey className="w-4 h-4" style={{ color: "#007AFF" }} />
                        <span className="flex-1 text-left" style={{ color: "rgba(255,255,255,0.8)" }}>{keyFile.name}</span>
                        <button onClick={e => { e.stopPropagation(); setKeyFile(null); }} className="p-0.5"><X className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} /></button>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>signPri.key 파일</span>
                      </>
                    )}
                  </button>
                )}

                {/* Cert password */}
                <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 w-full" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <input type={showPassword ? "text" : "password"} value={certPassword} onChange={e => setCertPassword(e.target.value)} placeholder="인증서 비밀번호" className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-white/20" style={{ color: "rgba(255,255,255,0.8)" }} />
                  <button onClick={() => setShowPassword(!showPassword)} className="p-1">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} /> : <Eye className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />}
                  </button>
                </div>

                {/* Submit + skip */}
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleHometaxConnect} disabled={!certFile || !certPassword || (isDerMode && !keyFile)} className="flex-1 py-3 rounded-xl text-[13px] font-semibold disabled:opacity-30" style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)", color: "rgba(255,255,255,0.95)" }}>
                    연동하기
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => { setMessages(prev => [...prev, { from: "user", text: "건너뛸게요" }]); setTimeout(() => goToStep("card_ask"), 600); }} className="px-4 py-3 rounded-xl text-[13px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
                    건너뛰기
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Inline loading */}
            {step.type === "inline_loading" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#007AFF" }} />
                <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>잠시만 기다려주세요...</p>
              </motion.div>
            )}

            {/* Action type */}
            {step.type === "action" && (
              <div className="flex flex-col items-center gap-3 w-full">
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => advance(step.actionLabel || "확인")} className="w-full py-3.5 rounded-xl text-[14px] font-semibold" style={{ background: "linear-gradient(135deg, #007AFF, #5856D6, #AF52DE)", color: "rgba(255,255,255,0.95)", boxShadow: "0 0 24px rgba(88,86,214,0.3)" }}>
                  {step.actionLabel}
                </motion.button>
                {step.skipLabel && (
                  <button onClick={() => advance("skip")} className="text-[12px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {step.skipLabel}
                  </button>
                )}
                {step.id === "complete" && !step.skipLabel && (
                  <></>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
