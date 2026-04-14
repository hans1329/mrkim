import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";

interface ConversationMessage {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

export function useElevenLabsConversation() {
  const { profile } = useProfile();
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const hasStartedRef = useRef(false);
  const endingRef = useRef(false);

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryGender = profile?.secretary_gender || "female";
  const secretaryTone = profile?.secretary_tone || "professional";

  // Stable refs for clientTools callback (avoids recreating useConversation)
  const secretaryNameRef = useRef(secretaryName);
  const secretaryToneRef = useRef(secretaryTone);
  const secretaryGenderRef = useRef(secretaryGender);

  useEffect(() => {
    secretaryNameRef.current = secretaryName;
    secretaryToneRef.current = secretaryTone;
    secretaryGenderRef.current = secretaryGender;
  }, [secretaryName, secretaryTone, secretaryGender]);

  const systemPrompt = useMemo(() => {
    const genderDescription = secretaryGender === "male"
      ? "남성적이고 차분한 어조"
      : "여성적이고 부드러운 어조";

    const toneDescription = {
      professional: "전문적이고 격식있는",
      friendly: "친근하고 다정한",
      casual: "편안하고 캐주얼한",
    }[secretaryTone] || "전문적이고 격식있는";

    return `당신은 '${secretaryName}'입니다. 소상공인 사장님을 위한 AI 비서로, 음성으로 대화합니다.

## 성격
- ${genderDescription}를 사용합니다
- ${toneDescription} 말투로 대화합니다
- 간결하고 명확하게 답변합니다
- 음성 대화이므로 이모지는 사용하지 않습니다

## 역할
- 사장님이 물어보는 모든 질문에 성실하게 답변합니다
- 매출, 지출, 세금 등 사업 관련 질문에 답변합니다
- 맛집 추천, 날씨, 건강, 일반 상식 등 어떤 주제든 자유롭게 답변합니다
- 일상적인 대화도 자연스럽게 응대합니다
- 자기소개 시 "${secretaryName}입니다"라고 말합니다

## 데이터 조회 규칙 (최우선! 절대적으로 준수!)

1. 매출, 지출, 세금, 급여, 브리핑, 현황 등 숫자/금액이 필요한 질문을 받으면:
   - 즉시 query_business 도구를 호출하세요
   - 도구 호출 전에 아무 말도 하지 마세요. "잠시만요", "확인해볼게요" 같은 말도 하지 마세요
   - 도구 결과가 돌아오면, 그 결과만 자연스러운 말로 전달하세요

2. 절대 금지 사항:
   - 숫자를 추측하거나 만들어내는 것 금지
   - 도구 결과 없이 금액을 말하는 것 금지
   - "약 얼마", "대략" 같은 추정 답변 금지

3. 도구가 반환한 텍스트를 읽을 때:
   - 마크다운 기호(**, ##, -, 📊 등)는 모두 제거
   - 자연스러운 구어체로 변환하여 전달
   - 핵심 숫자와 요약만 간결하게 전달

## 주의사항
- 가짜 매출/지출 숫자는 절대 만들지 마세요
- 불법 행위 조장, 혐오 표현만 정중히 거절
- 음성 대화에 맞게 짧고 자연스럽게 응답합니다`;
  }, [secretaryGender, secretaryName, secretaryTone]);

  const firstMessage = useMemo(() => {
    return `안녕하세요, ${secretaryName}입니다. 무엇을 도와드릴까요?`;
  }, [secretaryName]);

  // 성별/사용자 선택에 따른 한국어 음성 선택
  const secretaryVoiceId = profile?.secretary_voice_id || null;
  const voiceId = useMemo(() => {
    if (secretaryVoiceId) return secretaryVoiceId;
    return secretaryGender === "male" 
      ? "PDoCXqBQFGsvfO0hNkEs"  // 남성 한국어 음성 기본
      : "uyVNoMrnUku1dZyVEXwD"; // 여성 한국어 음성
  }, [secretaryGender, secretaryVoiceId]);

  const overrides = useMemo(() => {
    return {
      agent: {
        prompt: { prompt: systemPrompt },
        firstMessage,
        language: "ko",
      },
      tts: {
        voiceId,
      },
    };
  }, [firstMessage, systemPrompt, voiceId]);

  // Client Tool: chat-ai 엔진을 통해 비즈니스 데이터 조회
  const clientTools = useMemo(() => ({
    query_business: async (params: { question: string }) => {
      try {
        console.log("[VoiceClientTool] query_business called:", params.question);
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;

        // 음성 모드: 15초 타임아웃 설정 (ElevenLabs 툴 타임아웃 이전에 응답)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        let data: any = null;
        let error: any = null;
        try {
          const result = await supabase.functions.invoke("chat-ai", {
            body: {
              messages: [{ role: "user", content: params.question }],
              secretaryName: secretaryNameRef.current,
              secretaryTone: secretaryToneRef.current,
              secretaryGender: secretaryGenderRef.current,
              userId,
              voiceMode: true,  // 빠른 모델 사용 지시
            },
          });
          data = result.data;
          error = result.error;
        } finally {
          clearTimeout(timeoutId);
        }

        if (error || !data?.response) {
          console.error("[VoiceClientTool] query_business error:", error);
          return "죄송합니다, 데이터를 조회하지 못했습니다. 잠시 후 다시 시도해주세요.";
        }

        // 마크다운 기호 제거하여 음성에 최적화된 텍스트 반환
        const cleaned = data.response
          .replace(/#{1,6}\s?/g, "")
          .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
          .replace(/📊|📋|💡|🔴|✅|❌|⚠️|📈|📉/g, "")
          .replace(/^[-•]\s/gm, "")
          .replace(/\n{2,}/g, "\n")
          .trim();

        console.log("[VoiceClientTool] query_business response:", cleaned.substring(0, 100));
        
        // 에이전트에게 명시적 지시: 이 결과를 그대로 읽어주라고 지시
        return `[조회 결과] 다음 내용을 그대로 자연스럽게 읽어주세요. 추가 숫자를 만들거나 변경하지 마세요: ${cleaned}`;
      } catch (err) {
        console.error("[VoiceClientTool] query_business exception:", err);
        return "데이터 조회 중 오류가 발생했습니다.";
      }
    },
  }), []);

  const formatDisconnectDetails = useCallback((details: any) => {
    if (!details) return "";

    const ctx = details?.context;
    const code = (typeof ctx?.code === "number" ? ctx.code : undefined) ??
      (typeof details?.code === "number" ? details.code : undefined);
    const reason = (typeof ctx?.reason === "string" ? ctx.reason : undefined) ??
      (typeof details?.reason === "string" ? details.reason : undefined);
    const wasClean = (typeof ctx?.wasClean === "boolean" ? ctx.wasClean : undefined) ??
      (typeof details?.wasClean === "boolean" ? details.wasClean : undefined);
    const disconnectReason = typeof details?.reason === "string" ? details.reason : undefined;

    const parts: string[] = [];
    if (disconnectReason) parts.push(`reason=${disconnectReason}`);
    if (code !== undefined) parts.push(`code=${code}`);
    if (reason) parts.push(`closeReason=${reason}`);
    if (wasClean !== undefined) parts.push(`clean=${wasClean}`);

    if (parts.length) return parts.join(", ");

    try {
      const json = JSON.stringify(details);
      return json === "{}" ? String(details) : json;
    } catch {
      return String(details);
    }
  }, []);

  // 안정적인 콜백 참조를 위한 메모이제이션
  const handleConnect = useCallback(() => {
    console.log("Connected to ElevenLabs agent");
    setIsConnecting(false);
    setLastError(null);
  }, []);

  const handleDisconnect = useCallback((details: any) => {
    const started = hasStartedRef.current;
    const wasEnding = endingRef.current;

    const detailText = formatDisconnectDetails(details);

    console.log("Disconnected from ElevenLabs agent", details);
    if (detailText) {
      console.log("Disconnect details:", detailText);
    }

    hasStartedRef.current = false;
    endingRef.current = false;
    setIsConnecting(false);

    if (started && !wasEnding) {
      const msg = detailText
        ? `연결이 종료되었습니다. (${detailText})`
        : "연결이 종료되었습니다. 다시 시도해주세요.";
      setLastError(msg);
      toast.error("음성 연결이 끊어졌습니다. 다시 시도해주세요.");
    }
  }, [formatDisconnectDetails]);

  const handleMessage = useCallback((message: any) => {
    console.log("Message received:", message);
    
    if (message.type === "user_transcript") {
      const userText = message.user_transcription_event?.user_transcript;
      if (userText) {
        setMessages(prev => [...prev, {
          role: "user",
          text: userText,
          timestamp: new Date()
        }]);
      }
    }
    
    if (message.type === "agent_response") {
      const agentText = message.agent_response_event?.agent_response;
      if (agentText) {
        // ElevenLabs TTS 발음 힌트용 대괄호 제거
        const cleanedText = agentText.replace(/\[([^\]]*)\]/g, "$1");
        setMessages(prev => [...prev, {
          role: "agent",
          text: cleanedText,
          timestamp: new Date()
        }]);
      }
    }
  }, []);

  const handleError = useCallback((error: unknown) => {
    console.error("ElevenLabs error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    setLastError(msg);
    toast.error("음성 연결 중 오류가 발생했습니다.");
    setIsConnecting(false);
  }, []);

  // ElevenLabs useConversation 훅 - clientTools + 안정적인 콜백 참조 사용
  const conversation = useConversation({
    clientTools,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onMessage: handleMessage,
    onError: handleError,
  });

  const startSession = useCallback(async () => {
    // 이미 시작 중이거나 권한이 거부된 경우 중복 실행 방지
    if (isConnecting || hasStartedRef.current || permissionDenied) {
      return;
    }
    
    hasStartedRef.current = true;
    setIsConnecting(true);
    setMessages([]);
    setLastError(null);

    try {
      // 마이크 권한 확인 후 즉시 스트림 해제 (SDK가 자체 스트림 생성)
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach(track => track.stop());

      // Edge Function에서 WebRTC token(우선) 또는 signed URL(폴백) 가져오기
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token", {
        body: { transport: "websocket" },
      });

      if (error) {
        throw new Error(error.message);
      }

      const preferredConnectionType = data?.preferredConnectionType as "webrtc" | "websocket" | undefined;
      const token = data?.token as string | undefined;
      const signedUrl = (data?.signedUrl || data?.signed_url) as string | undefined;

      if (!token && !signedUrl) {
        throw new Error("연결 토큰을 가져오지 못했습니다.");
      }

      console.log(
        "Starting conversation",
        preferredConnectionType === "websocket" || !token ? "(signed url websocket)" : "(webrtc token)",
      );

      if ((preferredConnectionType === "websocket" || !token) && signedUrl) {
        await conversation.startSession({
          signedUrl: signedUrl!,
          connectionType: "websocket",
          overrides,
        });
      } else if (token) {
        await conversation.startSession({
          conversationToken: token,
          connectionType: "webrtc",
          overrides,
        });
      } else {
        await conversation.startSession({
          signedUrl: signedUrl!,
          connectionType: "websocket",
          overrides,
        });
      }
      
    } catch (error: any) {
      console.error("Failed to start voice session:", error);
      hasStartedRef.current = false;
      setIsConnecting(false);
      
      if (error.name === "NotAllowedError") {
        setPermissionDenied(true);
        toast.error("마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.");
      } else {
        setLastError(error?.message || "Unknown error");
        toast.error(error.message || "음성 연결에 실패했습니다.");
      }
    }
  }, [conversation, isConnecting, permissionDenied, overrides]);

  const endSession = useCallback(async () => {
    endingRef.current = true;
    try {
      await conversation.endSession();
    } finally {
      setTimeout(() => {
        endingRef.current = false;
      }, 1500);
    }

    setMessages([]);
    hasStartedRef.current = false;
  }, [conversation]);

  // iOS Safari: 브라우저/탭 닫힐 때 세션 강제 종료
  useEffect(() => {
    const handlePageHide = () => {
      if (hasStartedRef.current) {
        endingRef.current = true;
        try { conversation.endSession(); } catch {}
        hasStartedRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && hasStartedRef.current) {
        endingRef.current = true;
        try { conversation.endSession(); } catch {}
        hasStartedRef.current = false;
      }
    };

    window.addEventListener("pagehide", handlePageHide);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [conversation]);

  const resetPermission = useCallback(() => {
    setPermissionDenied(false);
    hasStartedRef.current = false;
    setLastError(null);
  }, []);

  return {
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,
    isConnecting,
    messages,
    permissionDenied,
    lastError,
    startSession,
    endSession,
    resetPermission,
  };
}
