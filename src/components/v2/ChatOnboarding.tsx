import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useV2Voice } from "./V2VoiceContext";
import { useConnection } from "@/contexts/ConnectionContext";
import { useConnectionDrawer, type ConnectionType } from "@/contexts/ConnectionDrawerContext";
import { toast } from "sonner";

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

interface OnboardingState {
  name?: string | null;
  business_type?: string | null;
  business_number?: string | null;
  hometax_connected?: boolean;
  card_connected?: boolean;
  account_connected?: boolean;
  delivery_connected?: boolean;
}

interface ChatOnboardingProps {
  onComplete: (data: Record<string, string>) => void;
  onProgress?: (partialData: Record<string, string>) => void | Promise<void>;
  existingData?: Record<string, string>;
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

// ─── Service mapping (agent service -> ConnectionDrawer type) ─

const SERVICE_TO_DRAWER: Record<string, ConnectionType> = {
  hometax: "hometax",
  card: "card",
  account: "account",
  baemin: "baemin",
  coupangeats: "coupangeats",
};

// ─── Main Component ───────────────────────────────────────────

export const ChatOnboarding = ({ onComplete, onProgress, existingData = {} }: ChatOnboardingProps) => {
  const {
    isConnected: voiceConnected,
    partialTranscript,
    toggleVoice,
    onCommit,
  } = useV2Voice();
  const { openDrawer } = useConnectionDrawer();
  const { hometaxConnected, cardConnected, accountConnected, deliveryConnected, refetch: refetchConnection } = useConnection();

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
        case "start_connection": {
          const service = String(call.args.service || "").toLowerCase();
          const drawerType = SERVICE_TO_DRAWER[service];
          if (!drawerType) return `지원하지 않는 서비스: ${service}`;
          openDrawer(drawerType);
          return `${service} 연동 화면을 열었습니다. 사용자가 완료하거나 닫을 때까지 기다려주세요.`;
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
  }, [onProgress, openDrawer]);

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

  // ─── 최초 인사 ──────────────────────────────────────────────

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // 콜드스타트 방지: 에이전트 워밍업 핑 (응답 무시)
    void supabase.functions.invoke("onboarding-agent", { body: { warmup: true } }).catch(() => {});

    // 음성 자동 연결
    if (!voiceConnected) toggleVoice();

    // 첫 인사: 수집된 정보 기반 정적 텍스트 (Gemini 호출 절약)
    const s = stateRef.current;
    let greet = "반갑습니다, 대표님! 어떻게 불러드릴까요?";
    if (s.name && !s.business_type) {
      greet = `다시 오셨네요, ${s.name} 대표님!\n어떤 업종이세요? (음식점·카페·소매/유통·기타)`;
    } else if (s.name && s.business_type && !s.business_number) {
      greet = `${s.name} 대표님, 마지막으로 사업자등록번호 10자리만 알려주세요.`;
    } else if (s.name && s.business_type && s.business_number) {
      greet = `${s.name} 대표님, 이제 데이터 연동을 도와드릴까요? 홈택스부터 시작해도 될까요?`;
    }
    setMessages([{ role: "assistant", content: greet }]);
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

  // ─── 렌더 ──────────────────────────────────────────────────

  return (
    <div className="relative z-10 flex flex-1 flex-col">
      {/* Messages */}
      <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-4">
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
        className="relative z-10 flex items-center gap-2 px-3 pb-4 pt-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
      >
        <button
          type="button"
          onClick={() => toggleVoice()}
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{
            background: voiceConnected
              ? "linear-gradient(135deg, #FF375F, #FF6B9D)"
              : "rgba(255,255,255,0.08)",
          }}
          aria-label="음성 토글"
        >
          <Mic className="w-5 h-5" style={{ color: "rgba(255,255,255,0.95)" }} />
        </button>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={voiceConnected ? "말씀하시거나 직접 입력하세요" : "메시지를 입력하세요"}
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
    </div>
  );
};