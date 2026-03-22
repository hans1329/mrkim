import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type ServiceVoiceStatus = "idle" | "listening" | "processing" | "speaking";

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

  const systemPrompt = useMemo(() => `당신은 김비서 서비스 안내 담당입니다. 대표님과 한국어 음성으로 대화합니다.

## 역할
- 김비서 서비스 소개, 사용법, FAQ, CS 문의를 안내합니다
- 서비스 관련 질문을 받으면 즉시 answer_service_question 도구를 호출합니다
- 도구 호출 전에는 군더더기 말 없이 바로 호출합니다
- 도구 결과를 받으면 마크다운 없이 자연스러운 구어체로 짧게 읽어줍니다

## 규칙
- 상대방 호칭은 항상 "대표님"입니다
- 서비스/FAQ/요금/가입/문의/사용법 질문에는 절대 임의로 답을 만들지 말고 answer_service_question 도구 결과만 사용하세요
- 이모지, 마크다운, 대괄호 감정 태그는 말하지 마세요
- 서비스와 무관한 가벼운 대화는 친근하게 짧게 응답해도 됩니다
- 작별 의사("끊어", "종료", "그만")를 들으면 짧게 인사하고 마무리합니다`, []);

  const overrides = useMemo(() => ({
    agent: {
      prompt: { prompt: systemPrompt },
      firstMessage: "안녕하세요 대표님, 김비서 서비스 안내예요. 무엇을 도와드릴까요?",
      language: "ko",
    },
    tts: {
      voiceId: "uyVNoMrnUku1dZyVEXwD",
      speed: 1,
      stability: 0.7,
      similarity_boost: 0.8,
    },
  }), [systemPrompt]);

  useEffect(() => {
    conversationHistoryRef.current = conversationHistory;
  }, [conversationHistory]);

  const clientTools = useMemo(() => ({
    answer_service_question: async (params: { question: string }) => {
      try {
        toolCallActiveRef.current = true;
        setVoiceStatus("processing");

        const { data, error } = await supabase.functions.invoke("service-chat", {
          body: {
            message: params.question,
            conversationHistory: conversationHistoryRef.current.slice(-10),
          },
        });

        if (error) throw error;

        const answer = stripMarkdown(data?.response || "죄송합니다. 답변을 준비하지 못했습니다.");

        setConversationHistory((prev) => [
          ...prev,
          { role: "user", content: params.question },
          { role: "assistant", content: answer },
        ]);
        setResponse(answer);
        responseRef.current = answer;

        return `다음 내용을 자연스럽게 읽어주세요. ${answer}`;
      } catch (error) {
        console.error("[ServiceVoice] answer_service_question error:", error);
        const fallback = "죄송합니다. 잠시 후 다시 시도해주세요.";
        setResponse(fallback);
        responseRef.current = fallback;
        return fallback;
      } finally {
        toolCallActiveRef.current = false;
      }
    },
  }), []);

  const handleConnect = useCallback(() => {
    setIsConnecting(false);
    setLastError(null);
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
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onMessage: handleMessage,
    onError: handleError,
  });

  const connectWithFallback = useCallback(async (params: {
    token?: string;
    signedUrl?: string;
  }) => {
    const { token, signedUrl } = params;

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
  }, [conversation, overrides]);

  useEffect(() => {
    if (isConnecting) return;

    if (conversation.status === "disconnected") {
      if (!sessionActiveRef.current && !hasStartedRef.current) {
        setVoiceStatus("idle");
      }
      return;
    }

    if (toolCallActiveRef.current) {
      setVoiceStatus("processing");
      return;
    }

    if (conversation.isSpeaking) {
      setVoiceStatus("speaking");
      return;
    }

    if (sessionActiveRef.current) {
      setVoiceStatus("listening");
    }
  }, [conversation.isSpeaking, conversation.status, isConnecting]);

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

      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token");
      if (error) throw new Error(error.message);

      const token = data?.token as string | undefined;
      const signedUrl = (data?.signedUrl || data?.signed_url) as string | undefined;

      if (!token && !signedUrl) {
        throw new Error("연결 토큰을 가져오지 못했습니다.");
      }

      await connectWithFallback({ token, signedUrl });
    } catch (error: any) {
      console.error("[ServiceVoice] startSession error", error);
      hasStartedRef.current = false;
      sessionActiveRef.current = false;
      setIsConnecting(false);
      setVoiceStatus("idle");

      if (error?.name === "NotAllowedError") {
        setPermissionDenied(true);
        toast.error("마이크 권한이 필요합니다.");
      } else {
        setLastError(error?.message || "Unknown error");
        toast.error(error?.message || "서비스 음성 연결에 실패했습니다.");
      }
    }
  }, [connectWithFallback, isConnecting, permissionDenied]);

  const endSession = useCallback(async () => {
    endingRef.current = true;
    sessionActiveRef.current = false;
    hasStartedRef.current = false;

    try {
      await conversation.endSession();
    } catch (error) {
      console.error("[ServiceVoice] endSession error", error);
    }

    setVoiceStatus("idle");
  }, [conversation]);

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
      if (hasStartedRef.current || sessionActiveRef.current) {
        void conversation.endSession();
      }
    };
  }, [conversation]);

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