import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Send, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useV2Voice } from "./V2VoiceContext";
import { useConnection } from "@/contexts/ConnectionContext";
import { useCardConnection } from "@/hooks/useCardConnection";
import { useAccountConnection } from "@/hooks/useAccountConnection";
import { toast } from "sonner";
import { SecureCredentialSheet, type SecureService, type SecureCredentialPayload } from "./SecureCredentialSheet";

// ─── 기관 라벨 → ID 매핑 (음성/채팅 입력의 한글명을 codef/hyphen ID로 변환) ───
const BANK_LABEL_TO_ID: Record<string, string> = {
  "신한은행": "shinhan", "신한": "shinhan",
  "kb국민은행": "kb", "국민은행": "kb", "kb": "kb", "국민": "kb",
  "우리은행": "woori", "우리": "woori",
  "하나은행": "hana", "하나": "hana",
  "nh농협은행": "nh", "농협": "nh", "nh": "nh", "농협은행": "nh",
  "ibk기업은행": "ibk", "기업은행": "ibk", "ibk": "ibk",
  "카카오뱅크": "kakao", "카뱅": "kakao", "카카오": "kakao",
  "토스뱅크": "toss", "토스": "toss",
  "케이뱅크": "kbank", "k뱅크": "kbank", "kbank": "kbank",
};
const CARD_LABEL_TO_ID: Record<string, string> = {
  "신한카드": "shinhan", "신한": "shinhan",
  "삼성카드": "samsung", "삼성": "samsung",
  "kb국민카드": "kb", "국민카드": "kb", "kb": "kb", "국민": "kb",
  "현대카드": "hyundai", "현대": "hyundai",
  "롯데카드": "lotte", "롯데": "lotte",
  "bc카드": "bc", "bc": "bc", "비씨카드": "bc",
  "하나카드": "hana", "하나": "hana",
  "우리카드": "woori", "우리": "woori",
  "nh농협카드": "nh", "농협카드": "nh", "nh": "nh",
};

const normalizeInstitution = (raw: string | undefined, kind: "bank" | "card"): string | undefined => {
  if (!raw) return undefined;
  const key = raw.toLowerCase().replace(/\s+/g, "");
  const map = kind === "bank" ? BANK_LABEL_TO_ID : CARD_LABEL_TO_ID;
  return map[key] || raw.toLowerCase();
};

// File → base64 (data URL prefix 제거)
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = reader.result as string;
      resolve(r.includes(",") ? r.split(",")[1] : r);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ─── Types ─────────────────────────────────────────────────────

type ChatRole = "user" | "assistant" | "tool";

interface ChatMessage {
  role: ChatRole;
  content: string;
  toolName?: string;
  hidden?: boolean;
}

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

interface AgentResponse {
  reply: string;
  toolCalls: ToolCall[];
  done: boolean;
  error?: string;
}

interface PendingConnection {
  institution?: string;
  auth_type?: "cert" | "id_pw" | "simple";
  login_id?: string;
}

interface OnboardingState {
  name?: string | null;
  business_type?: string | null;
  business_number?: string | null;
  hometax_connected?: boolean;
  card_connected?: boolean;
  account_connected?: boolean;
  delivery_connected?: boolean;
  pending?: Partial<Record<SecureService, PendingConnection>>;
}

interface ChatOnboardingProps {
  onComplete: (data: Record<string, string>) => void;
  onProgress?: (partialData: Record<string, string>) => void | Promise<void>;
  existingData?: Record<string, string>;
  onClose?: () => void;
}

// ─── Avatar ────────────────────────────────────────────────────

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

// ─── Main Component ───────────────────────────────────────────

export const ChatOnboarding = ({ onComplete, onProgress, existingData = {}, onClose }: ChatOnboardingProps) => {
  const {
    isConnected: voiceConnected,
    partialTranscript,
    toggleVoice,
    onCommit,
  } = useV2Voice();
  const { hometaxConnected, cardConnected, accountConnected, deliveryConnected, refetch: refetchConnection, connectService, profile } = useConnection();
  const { registerCardAccount } = useCardConnection();
  const { registerBankAccount } = useAccountConnection();

  // 사업자번호 → clientType ('B' 법인 / 'P' 개인) 자동 판별
  const getClientType = useCallback((): "P" | "B" => {
    const brn = (stateRef.current.business_number || profile?.business_registration_number || "").replace(/\D/g, "");
    if (brn.length === 10) {
      const middle = parseInt(brn.slice(3, 5), 10);
      if (middle >= 81 && middle <= 99) return "B";
    }
    return "P";
  }, [profile?.business_registration_number]);

  // 보안 입력 시트 상태
  const [secureSheet, setSecureSheet] = useState<{ open: boolean; service: SecureService; pending: PendingConnection } | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [completed, setCompleted] = useState(false);

  // 수집 상태 (저장 도구가 호출되면 즉시 갱신)
  const [state, setState] = useState<OnboardingState>(() => ({
    name: existingData.name || null,
    business_type: existingData.business_type || null,
    business_number: existingData.business_number || null,
    hometax_connected: hometaxConnected,
    card_connected: cardConnected,
    account_connected: accountConnected,
    delivery_connected: deliveryConnected,
  }));
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // 연동 상태 동기화
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      hometax_connected: hometaxConnected,
      card_connected: cardConnected,
      account_connected: accountConnected,
      delivery_connected: deliveryConnected,
    }));
  }, [hometaxConnected, cardConnected, accountConnected, deliveryConnected]);

  // 동시 실행 가드
  const isProcessingRef = useRef(false);
  const initializedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 자동 스크롤
  useEffect(() => {
    const t = setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
    return () => clearTimeout(t);
  }, [messages, partialTranscript, isThinking]);

  // ─── 도구 실행 ──────────────────────────────────────────────

  const executeTool = useCallback(async (call: ToolCall): Promise<string> => {
    try {
      switch (call.name) {
        case "save_user_name": {
          const name = String(call.args.name || "").trim();
          if (!name) return "이름이 비어 있어 저장하지 않았습니다.";
          setState((prev) => ({ ...prev, name }));
          await onProgress?.({ name });
          return `이름 저장 완료: ${name}`;
        }
        case "save_business_type": {
          const business_type = String(call.args.business_type || "").trim();
          if (!business_type) return "업종이 비어 있어 저장하지 않았습니다.";
          setState((prev) => ({ ...prev, business_type }));
          await onProgress?.({ business_type });
          return `업종 저장 완료: ${business_type}`;
        }
        case "save_business_number": {
          const digits = String(call.args.business_number || "").replace(/\D/g, "");
          if (digits.length !== 10) {
            return "사업자번호는 10자리 숫자여야 합니다. 다시 받아주세요.";
          }
          setState((prev) => ({ ...prev, business_number: digits }));
          await onProgress?.({ business_number: digits });
          return `사업자번호 저장 완료: ${digits}`;
        }
        case "prepare_connection": {
          const service = String(call.args.service || "").toLowerCase() as SecureService;
          if (!["hometax", "card", "account", "baemin", "coupangeats"].includes(service)) {
            return `지원하지 않는 서비스: ${service}`;
          }
          const update: PendingConnection = {};
          if (call.args.institution) update.institution = String(call.args.institution).trim();
          if (call.args.auth_type) update.auth_type = String(call.args.auth_type).trim() as PendingConnection["auth_type"];
          if (call.args.login_id) update.login_id = String(call.args.login_id).trim();

          const merged = { ...(stateRef.current.pending?.[service] || {}), ...update };
          const nextState: OnboardingState = {
            ...stateRef.current,
            pending: {
              ...(stateRef.current.pending || {}),
              [service]: merged,
            },
          };
          stateRef.current = nextState;
          setState(nextState);

          const shouldOpenSecureInput =
            (service === "hometax" && merged.auth_type === "cert") ||
            ((service === "card" || service === "account") &&
              !!merged.institution &&
              (merged.auth_type === "cert" || (merged.auth_type === "id_pw" && !!merged.login_id))) ||
            ((service === "baemin" || service === "coupangeats") &&
              merged.auth_type === "id_pw" &&
              !!merged.login_id);

          if (shouldOpenSecureInput) {
            setSecureSheet({ open: true, service, pending: merged });
            return `${service} 연동 정보 임시 저장: ${JSON.stringify(merged)}. 보안 입력 화면을 열었습니다.`;
          }

          return `${service} 연동 정보 임시 저장: ${JSON.stringify(merged)}. 다음 단계로 진행하세요.`;
        }
        case "open_secure_input": {
          const service = String(call.args.service || "").toLowerCase() as SecureService;
          if (!["hometax", "card", "account", "baemin", "coupangeats"].includes(service)) {
            return `지원하지 않는 서비스: ${service}`;
          }
          const pending = stateRef.current.pending?.[service] || {};
          const normalizedPending = service === "hometax"
            ? { auth_type: "cert" as const, ...pending }
            : pending;
          setSecureSheet({ open: true, service, pending: normalizedPending });
          return `${service} 보안 입력 화면을 열었습니다. 사용자가 비밀번호 입력을 완료할 때까지 대기.`;
        }
        case "skip_step": {
          const target = String(call.args.target || "current");
          return `${target} 단계를 건너뛰었습니다. 다음 단계로 진행해주세요.`;
        }
        case "finish_onboarding": {
          return "온보딩이 종료되었습니다.";
        }
        default:
          return `알 수 없는 도구: ${call.name}`;
      }
    } catch (e) {
      console.error("tool error", call.name, e);
      return `도구 실행 실패: ${e instanceof Error ? e.message : "unknown"}`;
    }
  }, [onProgress]);

  // ─── 에이전트 호출 ──────────────────────────────────────────

  const callAgent = useCallback(async (history: ChatMessage[], currentState: OnboardingState): Promise<AgentResponse> => {
    const payload = {
      messages: history.map((m) => ({
        role: m.role,
        content: m.content,
        toolName: m.toolName,
      })),
      state: currentState,
    };
    const { data, error } = await supabase.functions.invoke("onboarding-agent", { body: payload });
    if (error) throw error;
    return (data as AgentResponse) || { reply: "", toolCalls: [], done: false };
  }, []);

  // ─── 사용자 발화 처리 (메인 루프) ──────────────────────────

  const handleUserMessage = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsThinking(true);

    try {
      let history: ChatMessage[] = [...messages, { role: "user", content: text }];
      setMessages(history);

      // 단일 라운드: 한 번의 에이전트 호출에서 도구 호출 + 안내 텍스트를 동시에 받음
      const res = await callAgent(history, stateRef.current);
      if (res.error) console.warn("agent error:", res.error);

      if (res.toolCalls && res.toolCalls.length > 0) {
        const toolResults: ChatMessage[] = [];
        for (const call of res.toolCalls) {
          const result = await executeTool(call);
          toolResults.push({ role: "tool", toolName: call.name, content: result, hidden: true });
          if (call.name === "finish_onboarding") setCompleted(true);
        }
        history = [...history, ...toolResults];
      }

      if (res.reply && res.reply.trim()) {
        history = [...history, { role: "assistant", content: res.reply.trim() }];
      }
      setMessages(history);

      // 종료 조건
      if (stateRef.current && completed) {
        // finish_onboarding 호출되면 완료 처리는 effect에서
      }
    } catch (e) {
      console.error("agent flow error:", e);
      toast.error("잠깐 신호가 약했어요. 다시 한 번 말씀해주세요.");
    } finally {
      setIsThinking(false);
      isProcessingRef.current = false;
    }
  }, [messages, callAgent, executeTool, completed]);

  // ─── 최초 인사 (에이전트에 위임하여 상태 기반으로 자연스럽게 이어서 진행) ──

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // 콜드스타트 방지
    void supabase.functions.invoke("onboarding-agent", { body: { warmup: true } }).catch(() => {});

    // 음성 자동 연결
    if (!voiceConnected) toggleVoice();

    // 에이전트에 resume 시스템 메시지를 보내 상태 기반 첫 인사를 받음
    const initAgent = async () => {
      setIsThinking(true);
      try {
        const s = stateRef.current;
        const resumeHint = s.name
          ? `(시스템: ${s.name} 대표님이 다시 방문했습니다. 현재 수집 상태를 참고해 이미 완료된 항목을 확인하고, 다음 미완료 단계를 자연스럽게 안내해주세요.)`
          : "(시스템: 새 사용자입니다. 이름부터 물어봐주세요.)";

        const history: ChatMessage[] = [{ role: "user", content: resumeHint, hidden: true }];
        const res = await callAgent(history, s);

        const finalHistory: ChatMessage[] = [...history];
        if (res.toolCalls?.length) {
          for (const call of res.toolCalls) {
            const result = await executeTool(call);
            finalHistory.push({ role: "tool", toolName: call.name, content: result, hidden: true });
          }
        }
        if (res.reply?.trim()) {
          finalHistory.push({ role: "assistant", content: res.reply.trim() });
        }
        setMessages(finalHistory);
      } catch (e) {
        console.error("init agent error:", e);
        // 폴백: 정적 인사
        const s = stateRef.current;
        const fallback = s.name
          ? `다시 오셨네요, ${s.name} 대표님! 이어서 진행할게요.`
          : "반갑습니다, 대표님! 어떻게 불러드릴까요?";
        setMessages([{ role: "assistant", content: fallback }]);
      } finally {
        setIsThinking(false);
      }
    };

    void initAgent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── 음성 입력 → 메시지 ─────────────────────────────────────
  useEffect(() => {
    onCommit((rawText: string) => {
      const t = rawText.trim();
      if (!t || t.length < 1) return;
      if (/^(음+|어+|아+|네\.?|음\.+)$/.test(t)) return;
      void handleUserMessage(t);
    });
  }, [onCommit, handleUserMessage]);

  // ─── 완료 처리 ──────────────────────────────────────────────
  useEffect(() => {
    if (!completed) return;
    const timer = setTimeout(() => {
      if (voiceConnected) toggleVoice();
      const data: Record<string, string> = {};
      if (state.name) data.name = state.name;
      if (state.business_type) data.business_type = state.business_type;
      if (state.business_number) data.business_number = state.business_number;
      onComplete(data);
    }, 1200);
    return () => clearTimeout(timer);
  }, [completed, onComplete, state, toggleVoice, voiceConnected]);

  // 연동 완료 감지 시 에이전트에 자동 통보
  const prevConnectionsRef = useRef({ hometax: hometaxConnected, card: cardConnected, account: accountConnected, delivery: deliveryConnected });
  useEffect(() => {
    const prev = prevConnectionsRef.current;
    const newlyConnected: string[] = [];
    if (!prev.hometax && hometaxConnected) newlyConnected.push("홈택스");
    if (!prev.card && cardConnected) newlyConnected.push("카드");
    if (!prev.account && accountConnected) newlyConnected.push("계좌");
    if (!prev.delivery && deliveryConnected) newlyConnected.push("배달앱");
    prevConnectionsRef.current = { hometax: hometaxConnected, card: cardConnected, account: accountConnected, delivery: deliveryConnected };
    if (newlyConnected.length > 0 && initializedRef.current) {
      void refetchConnection?.();
      void handleUserMessage(`(시스템: ${newlyConnected.join(", ")} 연동이 완료되었습니다. 다음 단계로 안내해주세요.)`);
    }
  }, [hometaxConnected, cardConnected, accountConnected, deliveryConnected, handleUserMessage, refetchConnection]);

  // ─── 입력 핸들러 ────────────────────────────────────────────
  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const v = inputValue.trim();
    if (!v) return;
    setInputValue("");
    void handleUserMessage(v);
  };

  const visibleMessages = useMemo(() => messages.filter((m) => !m.hidden && (m.role === "user" || m.role === "assistant")), [messages]);

  // 저장 완료 항목 배지 (DB/상태에 저장된 핵심 정보 + 연동 상태)
  const savedBadges = useMemo(() => {
    const items: { key: string; label: string }[] = [];
    if (state.name) items.push({ key: "name", label: `이름 · ${state.name}` });
    if (state.business_type) items.push({ key: "biz_type", label: `업종 · ${state.business_type}` });
    if (state.business_number) items.push({ key: "biz_no", label: `사업자 · ${state.business_number}` });
    if (state.hometax_connected) items.push({ key: "hometax", label: "홈택스 연동" });
    if (state.card_connected) items.push({ key: "card", label: "카드 연동" });
    if (state.account_connected) items.push({ key: "account", label: "계좌 연동" });
    if (state.delivery_connected) items.push({ key: "delivery", label: "배달앱 연동" });
    return items;
  }, [state]);

  // ─── 렌더 ──────────────────────────────────────────────────

  return (
    <div className="relative z-10 flex flex-1 flex-col min-h-0">
      {/* 저장 완료 배지 바 */}
      {savedBadges.length > 0 && (
        <div className="relative z-10 px-4 pt-3 pb-1 flex-shrink-0">
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
                <span
                  className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                  style={{ background: "#34C759" }}
                >
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
        {visibleMessages.map((m, idx) =>
          m.role === "assistant" ? (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-2.5 mb-3"
            >
              <YarnBallAvatar />
              <div
                className="rounded-2xl rounded-tl-md px-4 py-3 max-w-[260px]"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <p className="text-[14px] leading-relaxed whitespace-pre-line" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {m.content}
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="flex justify-end mb-3"
            >
              <div
                className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[240px]"
                style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}
              >
                <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.95)" }}>
                  {m.content}
                </p>
              </div>
            </motion.div>
          )
        )}

        {/* Live transcript preview */}
        {partialTranscript && (
          <div className="flex justify-end mb-3">
            <div
              className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[240px] opacity-50"
              style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}
            >
              <p className="text-[14px]" style={{ color: "rgba(255,255,255,0.95)" }}>{partialTranscript}</p>
            </div>
          </div>
        )}

        {isThinking && (
          <div className="flex items-start gap-2.5 mb-3">
            <YarnBallAvatar />
            <div
              className="rounded-2xl rounded-tl-md px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.07)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "rgba(255,255,255,0.5)" }} />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="relative z-10 flex-shrink-0 flex items-center gap-2 px-3 pb-4 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="메시지를 입력하세요"
          className="flex-1 h-11 rounded-full px-4 text-[14px] outline-none"
          style={{
            background: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          disabled={isThinking}
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isThinking}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #007AFF, #5856D6)" }}
          aria-label="전송"
        >
          <Send className="w-4 h-4" style={{ color: "rgba(255,255,255,0.95)" }} />
        </button>
      </form>

      {/* 보안 입력 시트 (비밀번호/인증서) */}
      {secureSheet && (
        <SecureCredentialSheet
          open={secureSheet.open}
          service={secureSheet.service}
          institution={secureSheet.pending.institution}
          authType={secureSheet.pending.auth_type}
          loginId={secureSheet.pending.login_id}
          onClose={() => setSecureSheet(null)}
          onSubmit={async (payload) => {
            const serviceLabel: Record<SecureService, string> = {
              hometax: "홈택스",
              card: "카드",
              account: "계좌",
              baemin: "배달의민족",
              coupangeats: "쿠팡이츠",
            };
            const label = serviceLabel[payload.service];
            const where = payload.institution ? `${payload.institution} ${label}` : label;

            console.log("[SecureCredentialSheet] submit", {
              service: payload.service,
              institution: payload.institution,
              auth_type: payload.auth_type,
              login_id: payload.login_id,
              has_password: !!payload.password,
              has_cert: !!payload.cert_file,
            });

            // 진행 중 안내
            void handleUserMessage(
              `(시스템: ${where} 연동을 시작합니다. "${where} 연동을 시작할게요. 잠시만 기다려주세요" 류로 짧게 안내하세요. 다음 단계는 아직 안내하지 마세요.)`
            );

            try {
              const clientType = getClientType();
              let ok = false;

              if (payload.service === "card") {
                const cardId = normalizeInstitution(payload.institution, "card");
                if (!cardId) throw new Error("카드사를 인식하지 못했어요. 다시 말씀해주세요.");
                let certOptions: Parameters<typeof registerCardAccount>[3] | undefined;
                if (payload.auth_type === "cert" && payload.cert_file && payload.cert_password) {
                  certOptions = {
                    loginType: "0",
                    certFile: await fileToBase64(payload.cert_file),
                    certPassword: payload.cert_password,
                    clientType,
                  };
                }
                const connectedId = await registerCardAccount(
                  cardId,
                  payload.login_id || "",
                  payload.password || "",
                  certOptions,
                  clientType,
                );
                ok = !!connectedId;
              } else if (payload.service === "account") {
                const bankId = normalizeInstitution(payload.institution, "bank");
                if (!bankId) throw new Error("은행을 인식하지 못했어요. 다시 말씀해주세요.");
                let certOptions: Parameters<typeof registerBankAccount>[3] | undefined;
                if (payload.auth_type === "cert" && payload.cert_file && payload.cert_password) {
                  certOptions = {
                    loginType: "0",
                    certFile: await fileToBase64(payload.cert_file),
                    certPassword: payload.cert_password,
                    clientType,
                  };
                }
                const connectedId = await registerBankAccount(
                  bankId,
                  payload.login_id || "",
                  payload.password || "",
                  certOptions,
                  clientType,
                );
                ok = !!connectedId;
              } else if (payload.service === "hometax") {
                if (!payload.cert_file || !payload.cert_password) {
                  throw new Error("홈택스는 공동인증서 파일과 비밀번호가 필요해요.");
                }
                const brn = stateRef.current.business_number || profile?.business_registration_number;
                if (!brn) throw new Error("사업자등록번호가 먼저 필요해요.");
                const certFileBase64 = await fileToBase64(payload.cert_file);
                const { data, error } = await supabase.functions.invoke("codef-hometax", {
                  body: {
                    action: "register",
                    businessNumber: String(brn).replace(/\D/g, ""),
                    certFileBase64,
                    certPassword: payload.cert_password,
                    clientType,
                  },
                });
                if (error) throw error;
                if (data?.status !== "completed" || !data?.connectedId) {
                  throw new Error(data?.error || "홈택스 연동에 실패했어요.");
                }
                await connectService("codef_hometax_tax_invoice", data.connectedId);
                ok = true;
              } else if (payload.service === "baemin" || payload.service === "coupangeats") {
                const fnName = payload.service === "baemin" ? "hyphen-baemin" : "hyphen-coupangeats";
                const connectorId = payload.service === "baemin" ? "hyphen_baemin" : "hyphen_coupangeats";
                const { data, error } = await supabase.functions.invoke(fnName, {
                  body: {
                    action: "verify",
                    userId: payload.login_id,
                    userPw: payload.password,
                  },
                });
                if (error || !data?.success) {
                  throw new Error(data?.error || "계정 검증에 실패했어요.");
                }
                const meta = payload.service === "baemin"
                  ? { bm_user_id: payload.login_id, bm_user_pw: payload.password }
                  : { ce_user_id: payload.login_id, ce_user_pw: payload.password };
                await connectService(connectorId, `${payload.service}_${payload.login_id}`, meta);
                ok = true;
              }

              setSecureSheet(null);

              if (ok) {
                // 로컬 상태 즉시 반영
                setState((prev) => {
                  const next = { ...prev };
                  if (payload.service === "hometax") next.hometax_connected = true;
                  else if (payload.service === "card") next.card_connected = true;
                  else if (payload.service === "account") next.account_connected = true;
                  else next.delivery_connected = true;
                  if (next.pending) {
                    const { [payload.service]: _omit, ...rest } = next.pending;
                    next.pending = rest;
                  }
                  return next;
                });
                await refetchConnection?.();
                toast.success(`🎉 ${where} 연동이 완료됐어요!`);
                void handleUserMessage(
                  `(시스템: ${where} 연동이 성공적으로 완료되었습니다! 대표님께 축하의 한마디(이모지 1개 포함, 1~2문장)를 건네고, 남아있는 다음 연동 항목을 자연스럽게 제안해주세요. 모두 끝났다면 finish_onboarding 도구를 호출하세요.)`
                );
              } else {
                throw new Error("연동에 실패했어요.");
              }
            } catch (err) {
              const msg = err instanceof Error ? err.message : "연동 중 오류가 발생했어요.";
              console.error("[SecureCredentialSheet] connect error:", err);
              toast.error(msg);
              void handleUserMessage(
                `(시스템: ${where} 연동에 실패했습니다. 사유: "${msg}". 대표님께 부드럽게 사과하고 다시 시도하실지, 다른 항목을 먼저 진행할지 여쭤보세요.)`
              );
              throw err; // 시트가 열린 채로 유지되도록
            }
          }}
        />
      )}
    </div>
  );
};
