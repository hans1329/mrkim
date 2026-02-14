import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useConversation } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import type { VisualizationData } from "@/components/chat/DataVisualization";

export interface VoiceMessage {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
  visualization?: VisualizationData | null;
}

type VoiceStatus = "idle" | "listening" | "processing" | "speaking";

export function useVoiceAgent() {
  const { profile } = useProfile();
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [lastMessage, setLastMessage] = useState<VoiceMessage | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isTTSPreparing, setIsTTSPreparing] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [isConnecting, setIsConnecting] = useState(false);
  const [micMuted, setMicMuted] = useState(false);

  const sessionActiveRef = useRef(false);
  const messagesContextRef = useRef<VoiceMessage[]>([]);
  const toolCallActiveRef = useRef(false);
  const waitingFirstMessageRef = useRef(false);
  const pendingVisualizationRef = useRef<VisualizationData | null>(null);
  const isConnectingRef = useRef(false);
  const interruptedRef = useRef(false);

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryTone = profile?.secretary_tone || "polite";
  const secretaryGender = profile?.secretary_gender || "female";
  const secretaryVoiceId = profile?.secretary_voice_id || null;

  // Stable refs for clientTools callback
  const secretaryNameRef = useRef(secretaryName);
  const secretaryToneRef = useRef(secretaryTone);
  const secretaryGenderRef = useRef(secretaryGender);

  useEffect(() => {
    secretaryNameRef.current = secretaryName;
    secretaryToneRef.current = secretaryTone;
    secretaryGenderRef.current = secretaryGender;
  }, [secretaryName, secretaryTone, secretaryGender]);

  // --- 받침 여부 확인 ---
  function hasBatchim(str: string): boolean {
    const lastChar = str[str.length - 1];
    if (!lastChar) return false;
    const code = lastChar.charCodeAt(0);
    if (code < 0xAC00 || code > 0xD7A3) return false;
    return (code - 0xAC00) % 28 !== 0;
  }

  // --- 숫자를 한글 독음으로 변환 (TTS 끊김 방지) ---
  function convertNumbersToKorean(text: string): string {
    const units = ["", "만", "억", "조"];
    const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

    function numberToKorean(num: number): string {
      if (num === 0) return "영";
      if (num < 0) return "마이너스 " + numberToKorean(-num);

      let result = "";
      let unitIndex = 0;
      let remaining = Math.floor(num);

      while (remaining > 0) {
        const chunk = remaining % 10000;
        if (chunk > 0) {
          let chunkStr = "";
          const thousands = Math.floor(chunk / 1000);
          const hundreds = Math.floor((chunk % 1000) / 100);
          const tens = Math.floor((chunk % 100) / 10);
          const ones = chunk % 10;

          if (thousands > 0) chunkStr += (thousands === 1 ? "" : digits[thousands]) + "천";
          if (hundreds > 0) chunkStr += (hundreds === 1 ? "" : digits[hundreds]) + "백";
          if (tens > 0) chunkStr += (tens === 1 ? "" : digits[tens]) + "십";
          if (ones > 0) chunkStr += digits[ones];

          result = chunkStr + units[unitIndex] + " " + result;
        }
        remaining = Math.floor(remaining / 10000);
        unitIndex++;
      }

      return result.trim();
    }

    // 콤마가 포함된 숫자 + 단위(원, %, 건 등) 변환
    return text.replace(/(\d{1,3}(,\d{3})*|\d+)(\.\d+)?\s*(원|만원|억원|%|건|명|개)/g, (match, intPart, _comma, decPart, unit) => {
      const num = parseInt(intPart.replace(/,/g, ""), 10);
      
      if (unit === "%") {
        return numberToKorean(num) + (decPart ? "점" + decPart.slice(1).split("").map((d: string) => digits[parseInt(d)] || d).join("") : "") + " 퍼센트";
      }
      if (unit === "만원") {
        return numberToKorean(num) + "만 원";
      }
      if (unit === "억원") {
        return numberToKorean(num) + "억 원";
      }

      const korean = numberToKorean(num);
      const unitMap: Record<string, string> = { "원": "원", "건": "건", "명": "명", "개": "개" };
      return korean + (unitMap[unit] || ` ${unit}`);
    });
  }

  // --- System prompt ---
  const systemPrompt = useMemo(() => {
    const genderDescription = secretaryGender === "male"
      ? "남성적이고 차분한 어조"
      : "여성적이고 부드러운 어조";

    const toneDescription = {
      polite: "전문적이고 격식있는",
      friendly: "친근하고 다정한",
      cute: "귀엽고 캐주얼한",
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

## 제한
- 민감한 금융 결정은 전문가 상담을 권유합니다
- 모르는 정보는 솔직히 인정합니다
- 음성 대화에 맞게 짧고 자연스럽게 응답합니다`;
  }, [secretaryGender, secretaryName, secretaryTone]);

  // --- First message ---
  const firstMessage = useMemo(() => {
    const nameHasBatchim = hasBatchim(secretaryName);
    const greetingByTone: Record<string, string> = {
      polite: `${secretaryName}입니다! 무엇을 도와드릴까요?`,
      friendly: `${secretaryName}${nameHasBatchim ? "이에요" : "예요"}! 무엇을 도와드릴까요?`,
      cute: `${secretaryName}${nameHasBatchim ? "이에용" : "에용"}! 무엇을 도와드릴까용?`,
    };
    return greetingByTone[secretaryTone] || greetingByTone.polite;
  }, [secretaryName, secretaryTone]);

  // --- Voice ID ---
  const voiceId = useMemo(() => {
    if (secretaryVoiceId) return secretaryVoiceId;
    return secretaryGender === "male"
      ? "PDoCXqBQFGsvfO0hNkEs"
      : "uyVNoMrnUku1dZyVEXwD";
  }, [secretaryGender, secretaryVoiceId]);

  // --- Overrides ---
  const overrides = useMemo(() => ({
    agent: {
      prompt: { prompt: systemPrompt },
      firstMessage,
      language: "ko",
    },
    tts: {
      voiceId,
    },
  }), [firstMessage, systemPrompt, voiceId]);

  // --- DB 저장 ---
  const saveMessageToDB = useCallback(async (role: "user" | "assistant", content: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("chat_messages").insert({
        user_id: user.id,
        role,
        content,
      });
    } catch (error) {
      console.error("Failed to save voice message:", error);
    }
  }, []);

  // --- Client Tool: Gemini를 통해 비즈니스 데이터 조회 ---
  const clientTools = useMemo(() => ({
    query_business: async (params: { question: string }) => {
      try {
        console.log("[VoiceClientTool] query_business called:", params.question);
        toolCallActiveRef.current = true;
        setVoiceStatus("processing");

        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        const accessToken = sessionData?.session?.access_token;

        const SUPABASE_URL = "https://kuxpsfxkumbfuqsvcucx.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1eHBzZnhrdW1iZnVxc3ZjdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTMwMDcsImV4cCI6MjA4NTU4OTAwN30.Ow_rO5MmbE-6fRYQ-E5Bxbd_0zXr70qURQAgqIGGm5s";

        const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: params.question }],
            secretaryName: secretaryNameRef.current,
            secretaryTone: secretaryToneRef.current,
            secretaryGender: secretaryGenderRef.current,
            userId,
            voiceMode: true,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data?.response) {
          console.error("[VoiceClientTool] query_business error:", data);
          return "죄송합니다, 데이터를 조회하지 못했습니다. 잠시 후 다시 시도해주세요.";
        }

        // 시각화 데이터 저장 (다음 agent_response에 연결)
        if (data.visualization) {
          pendingVisualizationRef.current = data.visualization;
        }

        // 마크다운/이모지 제거 + 숫자를 한글 독음으로 변환하여 음성 최적화
        const cleaned = convertNumbersToKorean(
          data.response
            .replace(/#{1,6}\s?/g, "")
            .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
            .replace(/\p{Extended_Pictographic}/gu, "")
            .replace(/^[-•*]\s+/gm, "")
            .replace(/\n{2,}/g, "\n")
            .trim()
        );

        console.log("[VoiceClientTool] query_business response:", cleaned.substring(0, 100));
        
        // toolCallActive는 해제하지만, speaking이 시작될 때까지 listening 전환 방지
        toolCallActiveRef.current = false;
        waitingFirstMessageRef.current = true; // speaking 시작 전까지 listening 차단
        setVoiceStatus("speaking");

        return `[조회 결과] 다음 내용을 그대로 자연스럽게 읽어주세요. 추가 숫자를 만들거나 변경하지 마세요: ${cleaned}`;
      } catch (err) {
        console.error("[VoiceClientTool] query_business exception:", err);
        toolCallActiveRef.current = false;
        return "데이터 조회 중 오류가 발생했습니다.";
      }
    },
  }), []);

  // --- Conversation callbacks ---
  const handleConnect = useCallback(() => {
    console.log("[Conv] ✅ Connected to ElevenLabs agent");
    setIsConnecting(false);
    isConnectingRef.current = false;
    interruptedRef.current = false;
    setLastError(null);
    waitingFirstMessageRef.current = true;
    setVoiceStatus("speaking");
    sessionActiveRef.current = true;
  }, []);

  const handleDisconnect = useCallback((details: any) => {
    console.log("[Conv] Disconnected:", details);

    // SDK 내부 재연결(retry) 중 발생하는 disconnect 이벤트는 무시
    // → isConnecting이 true인 동안은 상태를 초기화하지 않음
    if (isConnectingRef.current) {
      console.log("[Conv] Ignoring disconnect during connection attempt (SDK retry)");
      return;
    }

    const wasActive = sessionActiveRef.current;
    sessionActiveRef.current = false;
    setIsConnecting(false);
    setVoiceStatus("idle");
    toolCallActiveRef.current = false;

    if (wasActive) {
      const reason = details?.reason || details?.context?.reason;
      if (reason && reason !== "user") {
        setLastError(`연결이 종료되었습니다. (${reason})`);
      }
    }
  }, []);

  // 에이전트 응답이 뒤따르는 사용자 발화만 기록하기 위한 pending 메시지
  const pendingUserMsgRef = useRef<VoiceMessage | null>(null);

  const handleMessage = useCallback((message: { message: string; source: "user" | "ai"; role: "user" | "agent" }) => {
    console.log("[Conv] Message:", message);

    if (message.role === "user") {
      // 5자 미만의 짧은 잡음은 무시
      const trimmed = message.message.trim();
      if (trimmed.length < 5) {
        console.log("[Conv] Ignoring short noise:", trimmed);
        return;
      }
      // 즉시 저장하지 않고 pending으로 보관 (에이전트 응답 시 확정)
      pendingUserMsgRef.current = { role: "user", text: message.message, timestamp: new Date() };
      setLastMessage(pendingUserMsgRef.current);
    }

    if (message.role === "agent") {
      // pending 사용자 메시지가 있으면 에이전트 응답 전에 확정 저장
      const pendingUser = pendingUserMsgRef.current;
      if (pendingUser) {
        messagesContextRef.current = [...messagesContextRef.current, pendingUser];
        saveMessageToDB("user", pendingUser.text);
        pendingUserMsgRef.current = null;
      }

      const visualization = pendingVisualizationRef.current;
      pendingVisualizationRef.current = null;
      
      const agentMsg: VoiceMessage = { role: "agent", text: message.message, timestamp: new Date(), visualization };
      messagesContextRef.current = [...messagesContextRef.current, agentMsg];
      setLastMessage(agentMsg);
      saveMessageToDB("assistant", message.message);
    }
  }, [saveMessageToDB]);

  const handleError = useCallback((error: unknown) => {
    console.error("[Conv] Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    setLastError(msg);
    toast.error("음성 연결 중 오류가 발생했습니다.");
    setIsConnecting(false);
  }, []);

  // --- useConversation hook ---
  const conversation = useConversation({
    clientTools,
    micMuted,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onMessage: handleMessage,
    onError: handleError,
  });

  // --- Sync voiceStatus from conversation state (디바운스 적용) ---
  const speakingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 연결 시도 중에는 voiceStatus를 건드리지 않음
    if (isConnecting) return;

    // 인터럽트 상태: isSpeaking이 false가 될 때까지 대기 후 해제
    if (interruptedRef.current) {
      if (!conversation.isSpeaking) {
        // 발화가 실제로 끝남 → 볼륨 복원, 인터럽트 해제
        interruptedRef.current = false;
        conversation.setVolume({ volume });
        // 이미 listening 상태이므로 추가 전환 불필요
      }
      return;
    }

    if (conversation.status === "disconnected") {
      if (speakingDebounceRef.current) {
        clearTimeout(speakingDebounceRef.current);
        speakingDebounceRef.current = null;
      }
      setVoiceStatus("idle");
      setMicMuted(false);
      return;
    }

    // Connected
    if (toolCallActiveRef.current) {
      if (speakingDebounceRef.current) {
        clearTimeout(speakingDebounceRef.current);
        speakingDebounceRef.current = null;
      }
      setVoiceStatus("processing");
      setMicMuted(true);
    } else if (conversation.isSpeaking) {
      // 에이전트가 말하기 시작 → 즉시 speaking으로 전환, 디바운스 취소
      if (speakingDebounceRef.current) {
        clearTimeout(speakingDebounceRef.current);
        speakingDebounceRef.current = null;
      }
      waitingFirstMessageRef.current = false;
      setVoiceStatus("speaking");
      setMicMuted(true);
    } else if (waitingFirstMessageRef.current) {
      setVoiceStatus("speaking");
      setMicMuted(true);
    } else {
      // isSpeaking이 false → 디바운스 후 listening 전환
      if (!speakingDebounceRef.current) {
        speakingDebounceRef.current = setTimeout(() => {
          speakingDebounceRef.current = null;
          setVoiceStatus("listening");
          setMicMuted(false);
        }, 600);
      }
    }
  }, [conversation.status, conversation.isSpeaking, isConnecting]);

  // --- Start session ---
  const startSession = useCallback(async () => {
    if (isConnecting || conversation.status === "connected" || permissionDenied) return;

    console.log("[Session] ▶ Starting Conversational AI session...");
    setIsConnecting(true);
    isConnectingRef.current = true;
    setLastMessage(null);
    setLastError(null);
    messagesContextRef.current = [];

    try {
      // 마이크 권한 확인 후 즉시 스트림 해제 (SDK가 자체 스트림 생성)
      // ⚠️ 해제하지 않으면 스트림 2개가 열려 에코 발생
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach(track => track.stop());

      // Edge Function에서 토큰 가져오기
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token");

      if (error) throw new Error(error.message);

      const token = data?.token as string | undefined;
      const signedUrl = (data?.signedUrl || data?.signed_url) as string | undefined;

      if (!token && !signedUrl) {
        throw new Error("연결 토큰을 가져오지 못했습니다.");
      }

      console.log("[Session] Starting conversation", token ? "(WebRTC)" : "(WebSocket)");

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

      setIsTTSPreparing(false);
    } catch (error: any) {
      console.error("[Session] ❌ Failed to start:", error);
      setIsConnecting(false);
      isConnectingRef.current = false;
      setIsTTSPreparing(false);
      setVoiceStatus("idle");

      if (error.name === "NotAllowedError") {
        setPermissionDenied(true);
        toast.error("마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.");
      } else {
        setLastError(error?.message || "Unknown error");
        toast.error(error.message || "음성 연결에 실패했습니다.");
      }
    }
  }, [conversation, isConnecting, permissionDenied, overrides]);

  // --- End session ---
  const endSession = useCallback(async () => {
    console.log("[Session] ⏹ Ending session");
    sessionActiveRef.current = false;
    toolCallActiveRef.current = false;
    waitingFirstMessageRef.current = false;
    isConnectingRef.current = false;
    interruptedRef.current = false;

    // 디바운스 타이머 정리
    if (speakingDebounceRef.current) {
      clearTimeout(speakingDebounceRef.current);
      speakingDebounceRef.current = null;
    }

    // 즉시 볼륨 0으로 → 소리 즉시 차단
    try {
      conversation.setVolume({ volume: 0 });
    } catch (_) {}

    // SDK 세션 종료
    try {
      await conversation.endSession();
    } catch (e) {
      console.error("[Session] endSession error:", e);
    }

    // 상태 완전 초기화
    setIsConnecting(false);
    setVoiceStatus("idle");
    setLastMessage(null);
    setIsTTSPreparing(false);
    setMicMuted(false);
    messagesContextRef.current = [];
  }, [conversation]);

  // --- Interrupt (버튼으로 에이전트 발화 중단) ---
  const interruptAndListen = useCallback(() => {
    console.log("[Voice] Interrupt: muting agent, switching to listening");
    // 인터럽트 플래그 → useEffect 상태 동기화 완전 차단
    interruptedRef.current = true;
    // 디바운스 타이머 취소
    if (speakingDebounceRef.current) {
      clearTimeout(speakingDebounceRef.current);
      speakingDebounceRef.current = null;
    }
    // 에이전트 볼륨 0 → 즉시 무음
    conversation.setVolume({ volume: 0 });
    setIsTTSPreparing(false);
    setVoiceStatus("listening");
    setMicMuted(false);
  }, [conversation]);

  // --- Reset permission ---
  const resetPermission = useCallback(() => {
    setPermissionDenied(false);
    setLastError(null);
  }, []);

  // --- Send text directly (제안 칩) ---
  const sendTextDirectly = useCallback((text: string) => {
    if (conversation.status !== "connected") return;
    console.log("[Voice] Sending text directly:", text);
    conversation.sendUserMessage(text);

    const userMsg: VoiceMessage = { role: "user", text, timestamp: new Date() };
    messagesContextRef.current = [...messagesContextRef.current, userMsg];
    setLastMessage(userMsg);
    saveMessageToDB("user", text);
  }, [conversation, saveMessageToDB]);

  // --- Volume control ---
  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (conversation.status === "connected") {
      conversation.setVolume({ volume: clamped });
    }
  }, [conversation]);

  // Apply initial volume when connected
  useEffect(() => {
    if (conversation.status === "connected") {
      conversation.setVolume({ volume });
    }
  }, [conversation.status]);

  return {
    status: voiceStatus,
    isSpeaking: voiceStatus === "speaking",
    isListening: voiceStatus === "listening",
    isProcessing: voiceStatus === "processing",
    isActive: voiceStatus !== "idle" || isConnecting,
    isConnecting,
    isTTSPreparing,
    lastMessage,
    permissionDenied,
    lastError,
    volume,
    setVolume,
    startSession,
    endSession,
    interruptAndListen,
    resetPermission,
    sendTextDirectly,
  };
}
