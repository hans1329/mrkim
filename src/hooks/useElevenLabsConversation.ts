import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useMemo, useRef } from "react";
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

  const systemPrompt = useMemo(() => {
    const genderDescription = secretaryGender === "male"
      ? "남성적이고 차분한 어조"
      : "여성적이고 부드러운 어조";

    const toneDescription = {
      professional: "전문적이고 격식있는",
      friendly: "친근하고 다정한",
      casual: "편안하고 캐주얼한",
    }[secretaryTone] || "전문적이고 격식있는";

    return `당신은 '${secretaryName}'입니다. 소상공인 사장님을 위한 AI 경영 비서로, 음성으로 대화합니다.

## 성격
- ${genderDescription}를 사용합니다
- ${toneDescription} 말투로 대화합니다
- 간결하고 명확하게 답변합니다
- 음성 대화이므로 이모지는 사용하지 않습니다

## 역할
- 매출, 지출, 세금 관련 질문에 답변합니다
- 사업 운영 조언을 제공합니다
- 일상적인 대화도 자연스럽게 응대합니다
- 자기소개 시 "${secretaryName}입니다"라고 말합니다

## 제한
- 민감한 금융 결정은 전문가 상담을 권유합니다
- 모르는 정보는 솔직히 인정합니다
- 음성 대화에 맞게 짧고 자연스럽게 응답합니다`;
  }, [secretaryGender, secretaryName, secretaryTone]);

  const firstMessage = useMemo(() => {
    return `안녕하세요, ${secretaryName}입니다. 무엇을 도와드릴까요?`;
  }, [secretaryName]);

  // 성별에 따른 음성 선택 (한국어 지원 다국어 음성)
  // ElevenLabs Voice Library에서 한국어 잘 되는 음성 선택
  const voiceId = useMemo(() => {
    // 남성: Daniel (온화한 남성 음성), 여성: Sarah (부드러운 여성 음성)
    return secretaryGender === "male" 
      ? "onwK4e9ZLuTAKqWW03F9"  // Daniel
      : "EXAVITQu4vr4xnSDxMaL"; // Sarah
  }, [secretaryGender]);

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

  // 안정적인 콜백 참조를 위한 메모이제이션
  const handleConnect = useCallback(() => {
    console.log("Connected to ElevenLabs agent");
    setIsConnecting(false);
    setLastError(null);
  }, []);

  const handleDisconnect = useCallback((details: any) => {
    const started = hasStartedRef.current;
    const wasEnding = endingRef.current;

    console.log("Disconnected from ElevenLabs agent", details);

    hasStartedRef.current = false;
    endingRef.current = false;
    setIsConnecting(false);

    if (started && !wasEnding) {
      const detailText = details ? JSON.stringify(details) : "";
      const msg = detailText
        ? `연결이 종료되었습니다. (${detailText})`
        : "연결이 종료되었습니다. 다시 시도해주세요.";
      setLastError(msg);
      toast.error("음성 연결이 끊어졌습니다. 다시 시도해주세요.");
    }
  }, []);

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
        setMessages(prev => [...prev, {
          role: "agent",
          text: agentText,
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

  // ElevenLabs useConversation 훅 - 안정적인 콜백 참조 사용
  const conversation = useConversation({
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
      // 마이크 권한 요청
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Edge Function에서 WebRTC token(우선) 또는 signed URL(폴백) 가져오기
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token");

      if (error) {
        throw new Error(error.message);
      }

      const token = data?.token as string | undefined;
      const signedUrl = (data?.signedUrl || data?.signed_url) as string | undefined;

      if (!token && !signedUrl) {
        throw new Error("연결 토큰을 가져오지 못했습니다.");
      }

      console.log(
        "Starting conversation",
        token ? "(webrtc token)" : "(signed url websocket)",
      );

      if (token) {
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
      // In some cases onDisconnect may not fire; ensure we don't suppress future errors.
      endingRef.current = false;
    }

    setMessages([]);
    hasStartedRef.current = false;
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
