import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Loader2, Check } from "lucide-react";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useV2Voice } from "./V2VoiceContext";

interface RegistrationStep {
  id: string;
  question: string;
  type: "text" | "choice";
  placeholder?: string;
  choices?: { label: string; value: string }[];
  parse?: (input: string) => string;
}

const steps: RegistrationStep[] = [
  { id: "name", question: "직원 이름이 어떻게 되나요?", type: "text", placeholder: "예: 김민수" },
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
    question: "연락처를 알려주세요. (선택, '없음'이라 답해도 돼요)",
    type: "text",
    placeholder: "예: 010-1234-5678",
  },
];

interface VoiceEmployeeRegistrationProps {
  onClose: () => void;
  onComplete: (employee: Record<string, string>) => void;
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

type Msg = { from: "bot" | "user"; text: string };

export const VoiceEmployeeRegistration = ({ onClose, onComplete }: VoiceEmployeeRegistrationProps) => {
  const { isConnected: voiceConnected, partialTranscript, toggleVoice, onCommit } = useV2Voice();

  const [currentStep, setCurrentStep] = useState(0);
  const currentStepRef = useRef(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const advanceRef = useRef<(value: string) => void>();
  const chatEndRef = useRef<HTMLDivElement>(null);

  const getActiveSteps = useCallback((ans: Record<string, string>) => {
    return steps.filter((s) => {
      if (s.id === "weekly_hours" && ans.pay_type !== "hourly") return false;
      return true;
    });
  }, []);

  const activeSteps = getActiveSteps(answers);
  const isConfirmation = currentStep >= activeSteps.length;
  const step = activeSteps[currentStep];

  // 첫 인사 + 음성 자동 연결
  useEffect(() => {
    if (!voiceConnected) toggleVoice();
    const t = setTimeout(() => {
      setMessages([{ from: "bot", text: "직원을 등록할게요.\n이름부터 알려주세요!" }]);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 자동 스크롤
  useEffect(() => {
    const t = setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    return () => clearTimeout(t);
  }, [messages, partialTranscript, saving]);

  const handleClose = useCallback(() => {
    if (voiceConnected) toggleVoice();
    onClose();
  }, [voiceConnected, toggleVoice, onClose]);

  const saveEmployee = useCallback(async (data: Record<string, string>) => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not logged in");

      const isHourly = data.pay_type === "hourly";
      const amount = Number(data.pay_amount) || 0;
      const employeeType = (data.employee_type || "정규직") as "정규직" | "계약직" | "알바";

      const { error } = await supabase.from("employees").insert([{
        user_id: userData.user.id,
        name: data.name,
        employee_type: employeeType,
        monthly_salary: isHourly ? null : amount,
        hourly_rate: isHourly ? amount : null,
        weekly_hours: isHourly ? Number(data.weekly_hours) || null : null,
        phone: data.phone && data.phone !== "없음" ? data.phone : null,
        source: "voice",
      }]);

      if (error) throw error;
      setCompleted(true);
      setMessages((prev) => [...prev, { from: "bot", text: `${data.name}님을 등록했어요! ✅` }]);
      setTimeout(() => {
        if (voiceConnected) toggleVoice();
        onComplete(data);
      }, 1500);
    } catch (e) {
      console.error("Employee save failed:", e);
      setMessages((prev) => [...prev, { from: "bot", text: "등록 중 문제가 생겼어요. 다시 시도해주세요." }]);
    } finally {
      setSaving(false);
    }
  }, [onComplete, voiceConnected, toggleVoice]);

  const advance = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    // "그만/취소/닫아" 등 음성 중단 명령
    if (/^(그만|취소|닫아|닫아줘|중단|종료|나중에|됐어|됐어요|아니|아니야)\.?$/.test(trimmed)) {
      handleClose();
      return;
    }

    const currentStepData = getActiveSteps(answers)[currentStepRef.current];
    if (!currentStepData) return;

    const parsed = currentStepData.parse ? currentStepData.parse(trimmed) : trimmed;
    let finalValue = parsed;
    if (currentStepData.type === "choice" && currentStepData.choices) {
      const matched = currentStepData.choices.find(
        (c) => trimmed.includes(c.label) || trimmed.includes(c.value)
      );
      if (matched) finalValue = matched.value;
    }

    const newAnswers = { ...answers, [currentStepData.id]: finalValue };
    setAnswers(newAnswers);
    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setInputValue("");

    const nextActive = getActiveSteps(newAnswers);
    const nextIdx = currentStepRef.current + 1;

    if (nextIdx < nextActive.length) {
      setTimeout(() => {
        setMessages((prev) => [...prev, { from: "bot", text: nextActive[nextIdx].question }]);
        setCurrentStep(nextIdx);
        currentStepRef.current = nextIdx;
      }, 500);
    } else {
      setTimeout(() => {
        const payLabel = newAnswers.pay_type === "hourly"
          ? `시급 ${Number(newAnswers.pay_amount).toLocaleString()}원 · 주 ${newAnswers.weekly_hours}시간`
          : `월급 ${(Number(newAnswers.pay_amount) / 10000).toFixed(0)}만원`;
        setMessages((prev) => [...prev, {
          from: "bot",
          text: `확인할게요!\n\n👤 ${newAnswers.name}\n💼 ${newAnswers.employee_type}\n💰 ${payLabel}${newAnswers.phone && newAnswers.phone !== "없음" ? `\n📱 ${newAnswers.phone}` : ""}\n\n이대로 등록할까요?`,
        }]);
        setCurrentStep(nextActive.length);
        currentStepRef.current = nextActive.length;
      }, 500);
    }
  }, [answers, getActiveSteps, handleClose]);

  useEffect(() => { advanceRef.current = advance; }, [advance]);

  // V2Voice 음성 commit 구독
  useEffect(() => {
    onCommit((rawText: string) => {
      const t = rawText.trim();
      if (!t) return;
      if (/^(음+|어+|아+|네\.?|음\.+)$/.test(t)) return;
      advanceRef.current?.(t);
    });
  }, [onCommit]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = inputValue.trim();
    if (!v) return;
    advance(v);
  };

  const savedBadges = useMemo(() => {
    const items: { key: string; label: string }[] = [];
    if (answers.name) items.push({ key: "name", label: `이름 · ${answers.name}` });
    if (answers.employee_type) items.push({ key: "type", label: `고용 · ${answers.employee_type}` });
    if (answers.pay_type) {
      items.push({ key: "pay_type", label: `급여 · ${answers.pay_type === "hourly" ? "시급제" : "월급제"}` });
    }
    if (answers.pay_amount) {
      const amt = Number(answers.pay_amount);
      const display = amt >= 10000 ? `${(amt / 10000).toFixed(0)}만원` : `${amt.toLocaleString()}원`;
      items.push({ key: "pay_amount", label: `금액 · ${display}` });
    }
    if (answers.weekly_hours) items.push({ key: "weekly_hours", label: `주 ${answers.weekly_hours}시간` });
    if (answers.phone && answers.phone !== "없음") items.push({ key: "phone", label: `연락처 · ${answers.phone}` });
    return items;
  }, [answers]);

  return (
    <div className="relative z-10 flex flex-1 flex-col min-h-0">
      {/* Top bar with close */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-3 pb-1 flex-shrink-0">
        <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          직원 등록
        </span>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.06)" }}
          aria-label="닫기"
        >
          <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
        </button>
      </div>

      {/* 저장 완료 배지 바 */}
      {savedBadges.length > 0 && (
        <div className="relative z-10 px-4 pt-2 pb-1 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {savedBadges.map((b) => (
              <motion.div
                key={b.key}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="inline-flex items-center gap-1 rounded-full pl-1.5 pr-2.5 py-1"
                style={{
                  background: "rgba(52, 199, 89, 0.14)",
                  border: "1px solid rgba(52, 199, 89, 0.32)",
                }}
              >
                <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: "#34C759" }}>
                  <Check className="w-2.5 h-2.5" style={{ color: "white" }} strokeWidth={3} />
                </span>
                <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.92)" }}>
                  {b.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto no-scrollbar px-4 pt-4 pb-4">
        <AnimatePresence initial={false}>
          {messages.map((m, idx) =>
            m.from === "bot" ? (
              <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-start gap-2.5 mb-3">
                <YarnBallAvatar />
                <div
                  className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[260px]"
                  style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.9)" }}>
                    {m.text}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex justify-end mb-3">
                <div className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[240px]" style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}>
                  <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.95)" }}>{m.text}</p>
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>

        {partialTranscript && (
          <div className="flex justify-end mb-3">
            <div className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[240px] opacity-50" style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}>
              <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.95)" }}>{partialTranscript}</p>
            </div>
          </div>
        )}

        {saving && (
          <div className="flex items-start gap-2.5 mb-3">
            <YarnBallAvatar />
            <div className="rounded-2xl rounded-tl-md px-4 py-3" style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(255,255,255,0.5)" }} />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* 선택지 칩 */}
      {!completed && !isConfirmation && step?.type === "choice" && (
        <div className="relative z-10 px-4 pb-2 flex-shrink-0 flex flex-wrap gap-2">
          {step.choices?.map((c) => (
            <motion.button
              key={c.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => advance(c.label)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)" }}
            >
              {c.label}
            </motion.button>
          ))}
        </div>
      )}

      {/* 확인 단계 */}
      {!completed && isConfirmation && (
        <div className="relative z-10 px-4 pb-2 flex-shrink-0 flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => saveEmployee(answers)}
            disabled={saving}
            className="flex-1 py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #34C759, #30D158)", color: "#fff" }}
          >
            <Check className="w-4 h-4" />
            {saving ? "등록 중..." : "등록하기"}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setCurrentStep(0);
              currentStepRef.current = 0;
              setAnswers({});
              setMessages([{ from: "bot", text: "처음부터 다시 할게요.\n이름부터 알려주세요!" }]);
            }}
            className="px-4 py-3 rounded-xl text-[14px] font-medium"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)" }}
          >
            다시
          </motion.button>
        </div>
      )}

      {/* Composer (텍스트 단계) */}
      {!completed && !isConfirmation && step?.type === "text" && (
        <form
          onSubmit={handleSend}
          className="relative z-10 flex-shrink-0 flex items-center gap-2 px-3 pb-4 pt-2"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
        >
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={step.placeholder || "메시지를 입력하세요"}
            className="flex-1 h-11 rounded-full px-4 text-[14px] outline-none"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.95)", border: "1px solid rgba(255,255,255,0.08)" }}
            disabled={saving}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || saving}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}
            aria-label="전송"
          >
            <Send className="w-4 h-4" style={{ color: "rgba(255,255,255,0.95)" }} />
          </button>
        </form>
      )}
    </div>
  );
};
