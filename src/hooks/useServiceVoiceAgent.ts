import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ServiceVoiceStatus = "idle" | "listening" | "processing" | "speaking";

interface ServiceFAQItem {
  question: string;
  answer: string;
  keywords: string[];
}

interface ServiceVoiceMessage {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

function stripMarkdown(text: string) {
  return text
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/[_~`>#-]/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const FAQ_CACHE_TTL_MS = 5 * 60 * 1000;
const SPEAKING_GRACE_MS = 1200;
let faqPromptCache: { faqs: ServiceFAQItem[]; fetchedAt: number } | null = null;

async function loadServiceFaqs(): Promise<ServiceFAQItem[]> {
  const now = Date.now();

  if (faqPromptCache && now - faqPromptCache.fetchedAt < FAQ_CACHE_TTL_MS) {
    return faqPromptCache.faqs;
  }

  const { data, error } = await supabase
    .from("service_faq")
    .select("question, answer, keywords")
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (error) {
    throw error;
  }

  const faqs = (data ?? []) as ServiceFAQItem[];
  faqPromptCache = { faqs, fetchedAt: now };
  return faqs;
}

function buildSystemPrompt(faqs: ServiceFAQItem[]) {
  const faqContext = faqs.length
    ? `\n\n## 서비스 FAQ 데이터\n아래는 공식 FAQ입니다. 질문과 키워드를 우선 매칭해서 답변하세요. 가장 비슷한 FAQ를 골라 그 answer를 자연스럽게 말하세요.\n${faqs
        .map(
          (faq, index) =>
            `\n[FAQ ${index + 1}]\n질문: ${faq.question}\n키워드: ${(faq.keywords || []).join(", ")}\n답변: ${faq.answer}`,
        )
        .join("\n")}`
    : "";

  return `당신은 김비서 서비스 안내 음성 봇입니다. 대표님과 한국어 음성으로 대화합니다.

## 핵심 규칙
1. 상대방 호칭은 항상 "대표님"입니다.
2. 서비스, 기능, 요금, 가입, 사용법, 업종, 대상, 연동 관련 질문은 아래 FAQ 데이터와 키워드를 최우선으로 사용하세요.
3. 절대 "도구를 찾지 못했다", "도구가 없다", "답변할 수 있는 도구가 없다" 같은 표현을 하지 마세요.
4. 답변은 마크다운 없이 짧고 자연스러운 구어체로 말하세요.
5. FAQ에 정확히 일치하지 않아도 키워드나 의미가 가까우면 가장 적절한 FAQ 답변을 활용하세요.
6. 정말 정보가 부족하면 김비서 서비스 안내 범위에서 아는 내용만 짧게 말하고, 필요하면 텍스트 문의를 권유하세요.
7. 서비스와 무관한 가벼운 인사나 잡담만 짧게 응답하세요.
8. 작별 의사를 들으면 짧게 인사하고 마무리하세요.${faqContext}`;
}

export function useServiceVoiceAgent(isOpen: boolean) {
  const [voiceStatus, setVoiceStatus] = useState<ServiceVoiceStatus>("idle");
  const [isConnecting, setIsConnecting] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);

  const sessionActiveRef = useRef(false);
  const toolCallActiveRef = useRef(false);
  const hasStartedRef = useRef(false);
  const endingRef = useRef(false);
  const connectingRef = useRef(false);  // WebRTC→WS 폴백 중 disconnect 무시용
  const transcriptRef = useRef("");
  const responseRef = useRef("");
  const conversationHistoryRef = useRef<{ role: string; content: string }[]>([]);
  const conversationRef = useRef<ReturnType<typeof useConversation> | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const speakingReleaseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildSessionOverrides = useCallback((faqs: ServiceFAQItem[]) => ({
    agent: {
      prompt: { prompt: buildSystemPrompt(faqs) },
      firstMessage: "안녕하세요 대표님, 김비서 서비스 안내예요. 무엇을 도와드릴까요?",
      language: "ko",
    },
    tts: {
      voiceId: "uyVNoMrnUku1dZyVEXwD",
      speed: 1,
      stability: 0.7,
      similarity_boost: 0.8,
    },
  }), []);

  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  const clientTools = useMemo(() => ({}), []);

  const handleConnect = useCallback(() => {
    setIsConnecting(false);
    setLastError(null);
    setMicMuted(false);
    setVoiceStatus("listening");
    sessionActiveRef.current = true;
  }, []);

  const handleDisconnect = useCallback((details: unknown) => {
    console.log("[ServiceVoice] disconnected", details);

    // 폴백 연결 중이면 상태 초기화하지 않음
    if (connectingRef.current) return;

    hasStartedRef.current = false;
    sessionActiveRef.current = false;
    setIsConnecting(false);
    setMicMuted(false);

    if (speakingReleaseTimeoutRef.current) {
      clearTimeout(speakingReleaseTimeoutRef.current);
      speakingReleaseTimeoutRef.current = null;
    }

    if (!endingRef.current) {
      setVoiceStatus("idle");
    }

    endingRef.current = false;
  }, []);

  const handleMessage = useCallback((message: any) => {
    console.log("[ServiceVoice] message", message);

    if (message.type === "user_transcript") {
      const userText = message.user_transcription_event?.user_transcript;
      if (userText) {
        transcriptRef.current = userText;
        setTranscript(userText);
        setConversationHistory((prev) => [...prev, { role: "user", content: userText }]);
      }
      return;
    }

    if (message.type === "agent_response") {
      const agentText = stripMarkdown(message.agent_response_event?.agent_response || "");
      if (agentText) {
        if (/도구를 찾지 못했|도구가 없|답변을 드릴 수 있는 도구/.test(agentText)) {
          const failedQuestion = transcriptRef.current.trim();

          if (failedQuestion) {
            void (async () => {
              try {
                toolCallActiveRef.current = true;
                setVoiceStatus("processing");

                const { data, error } = await supabase.functions.invoke("service-chat", {
                  body: {
                    message: failedQuestion,
                    conversationHistory: conversationHistoryRef.current.slice(-10),
                  },
                });

                if (error) throw error;

                const answer = stripMarkdown(data?.response || "죄송합니다. 답변을 준비하지 못했습니다.");
                responseRef.current = answer;
                setResponse(answer);
                setConversationHistory((prev) => [...prev, { role: "assistant", content: answer }]);

                await conversationRef.current?.sendContextualUpdate?.(
                  `방금 대표님 질문은 "${failedQuestion}" 입니다. 공식 FAQ 기반 답변은 "${answer}" 입니다. 이 내용을 바탕으로 지금 다시 한두 문장으로 자연스럽게 답변하세요. 도구가 없다는 말은 절대 하지 마세요.`,
                );
                conversationRef.current?.sendUserMessage?.("방금 질문에 대해 다시 정확히 안내해줘.");
              } catch (error) {
                console.error("[ServiceVoice] fallback answer error", error);
              } finally {
                toolCallActiveRef.current = false;
              }
            })();
          }

          return;
        }

        responseRef.current = agentText;
        setResponse(agentText);
        setConversationHistory((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.content === agentText) {
            return prev;
          }
          return [...prev, { role: "assistant", content: agentText }];
        });
      }
    }
  }, []);

  const clearSpeakingReleaseTimeout = useCallback(() => {
    if (speakingReleaseTimeoutRef.current) {
      clearTimeout(speakingReleaseTimeoutRef.current);
      speakingReleaseTimeoutRef.current = null;
    }
  }, []);

  const holdSpeakingState = useCallback(() => {
    clearSpeakingReleaseTimeout();
    setVoiceStatus("speaking");
    setMicMuted(true);
  }, [clearSpeakingReleaseTimeout]);

  const restoreListeningState = useCallback(() => {
    clearSpeakingReleaseTimeout();

    if (!sessionActiveRef.current || toolCallActiveRef.current || conversationRef.current?.isSpeaking) {
      return;
    }

    setVoiceStatus("listening");
    setMicMuted(false);
  }, [clearSpeakingReleaseTimeout]);

  const scheduleListeningRestore = useCallback(() => {
    clearSpeakingReleaseTimeout();

    speakingReleaseTimeoutRef.current = setTimeout(() => {
      speakingReleaseTimeoutRef.current = null;
      restoreListeningState();
    }, SPEAKING_GRACE_MS);
  }, [clearSpeakingReleaseTimeout, restoreListeningState]);

  const handleError = useCallback((error: unknown) => {
    console.error("[ServiceVoice] error", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    setLastError(message);
    setIsConnecting(false);
    setVoiceStatus("idle");
    toast.error("서비스 음성 연결에 실패했습니다.");
  }, []);

  const conversation = useConversation({
    clientTools,
    micMuted,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onMessage: handleMessage,
    onError: handleError,
  });

  conversationRef.current = conversation;

  const connectWithFallback = useCallback(async (params: {
    token?: string;
    signedUrl?: string;
    overrides: ReturnType<typeof buildSessionOverrides>;
  }) => {
    const { token, signedUrl, overrides } = params;

    connectingRef.current = true;

    try {
      // WebRTC 우선 (비서와 동일 — 오디오 자동 재생 지원)
      if (token) {
        try {
          await conversation.startSession({
            conversationToken: token,
            connectionType: "webrtc",
            overrides,
          });
          return;
        } catch (error) {
          console.warn("[ServiceVoice] WebRTC failed, falling back to websocket", error);
          if (!signedUrl) throw error;
          // WebRTC 실패 후 SDK 정리 대기
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      if (signedUrl) {
        await conversation.startSession({
          signedUrl,
          connectionType: "websocket",
          overrides,
        });
        return;
      }

      throw new Error("연결 URL을 가져오지 못했습니다.");
    } finally {
      connectingRef.current = false;
    }
  }, [conversation]);

  useEffect(() => {
    if (isConnecting) return;

    if (conversation.status === "disconnected") {
      clearSpeakingReleaseTimeout();
      setMicMuted(false);
      if (!sessionActiveRef.current && !hasStartedRef.current) {
        setVoiceStatus("idle");
      }
      return;
    }

    if (toolCallActiveRef.current) {
      clearSpeakingReleaseTimeout();
      setVoiceStatus("processing");
      return;
    }

    if (conversation.isSpeaking) {
      holdSpeakingState();
      return;
    }

    if (sessionActiveRef.current) {
      scheduleListeningRestore();
    }
  }, [clearSpeakingReleaseTimeout, conversation.isSpeaking, conversation.status, holdSpeakingState, isConnecting, scheduleListeningRestore]);

  const startSession = useCallback(async () => {
    if (isConnecting || hasStartedRef.current || permissionDenied) return;

    hasStartedRef.current = true;
    endingRef.current = false;
    setIsConnecting(true);
    setLastError(null);
    setTranscript("");
    setResponse("");
    transcriptRef.current = "";
    responseRef.current = "";
    conversationHistoryRef.current = [];
    setConversationHistory([]);

    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());

      const faqs = await loadServiceFaqs();
      const sessionOverrides = buildSessionOverrides(faqs);

      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token");
      if (error) throw new Error(error.message);

      const token = data?.token as string | undefined;
      const signedUrl = (data?.signedUrl || data?.signed_url) as string | undefined;

      if (!token && !signedUrl) {
        throw new Error("연결 토큰을 가져오지 못했습니다.");
      }

      await connectWithFallback({ token, signedUrl, overrides: sessionOverrides });
    } catch (error: any) {
      console.error("[ServiceVoice] startSession error", error);
      hasStartedRef.current = false;
      sessionActiveRef.current = false;
      setIsConnecting(false);
      setMicMuted(false);
      setVoiceStatus("idle");

      if (error?.name === "NotAllowedError") {
        setPermissionDenied(true);
        toast.error("마이크 권한이 필요합니다.");
      } else {
        setLastError(error?.message || "Unknown error");
        toast.error(error?.message || "서비스 음성 연결에 실패했습니다.");
      }
    }
  }, [buildSessionOverrides, connectWithFallback, isConnecting, permissionDenied]);

  const endSession = useCallback(async () => {
    endingRef.current = true;
    sessionActiveRef.current = false;
    hasStartedRef.current = false;

    try {
      await conversation.endSession();
    } catch (error) {
      console.error("[ServiceVoice] endSession error", error);
    }

    clearSpeakingReleaseTimeout();
    setMicMuted(false);
    setVoiceStatus("idle");
  }, [clearSpeakingReleaseTimeout, conversation]);

  const resetPermission = useCallback(() => {
    setPermissionDenied(false);
    setLastError(null);
    hasStartedRef.current = false;
  }, []);

  const sendTextDirectly = useCallback((text: string) => {
    if (conversation.status !== "connected") return;

    const trimmed = text.trim();
    if (!trimmed) return;

    transcriptRef.current = trimmed;
    setTranscript(trimmed);
    conversation.sendUserMessage(trimmed);
  }, [conversation]);

  useEffect(() => {
    if (!isOpen && (hasStartedRef.current || sessionActiveRef.current)) {
      void endSession();
    }
  }, [endSession, isOpen]);

  useEffect(() => {
    return () => {
      clearSpeakingReleaseTimeout();
      if (hasStartedRef.current || sessionActiveRef.current) {
        void conversation.endSession();
      }
    };
  }, [clearSpeakingReleaseTimeout]);

  return {
    status: voiceStatus,
    isSpeaking: voiceStatus === "speaking",
    isListening: voiceStatus === "listening",
    isProcessing: voiceStatus === "processing",
    isActive: voiceStatus !== "idle" || isConnecting,
    isConnecting,
    transcript,
    response,
    permissionDenied,
    lastError,
    startSession,
    endSession,
    resetPermission,
    sendTextDirectly,
  };
}