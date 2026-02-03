import { useConversation } from "@elevenlabs/react";
import { useState, useCallback } from "react";
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

  // 비서 설정에 따른 시스템 프롬프트 생성
  const getSystemPrompt = useCallback(() => {
    const secretaryName = profile?.secretary_name || "김비서";
    const secretaryGender = profile?.secretary_gender || "female";
    const secretaryTone = profile?.secretary_tone || "professional";
    
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
  }, [profile]);

  // 비서 설정에 따른 첫 인사말
  const getFirstMessage = useCallback(() => {
    const secretaryName = profile?.secretary_name || "김비서";
    return `안녕하세요, ${secretaryName}입니다. 무엇을 도와드릴까요?`;
  }, [profile]);

  // ElevenLabs useConversation 훅
  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      setIsConnecting(false);
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs agent");
    },
    onMessage: (message: any) => {
      console.log("Message received:", message);
      
      // 사용자 발화 처리
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
      
      // 에이전트 응답 처리
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
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
      toast.error("음성 연결 중 오류가 발생했습니다.");
      setIsConnecting(false);
    },
  });

  const startSession = useCallback(async () => {
    setIsConnecting(true);
    setMessages([]);

    try {
      // 마이크 권한 요청
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Edge Function에서 signed URL 가져오기
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token");

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Signed URL을 가져오지 못했습니다.");
      }

      console.log("Starting conversation with signed URL");

      // 대화 시작 (overrides 포함)
      await conversation.startSession({
        signedUrl: data.signedUrl,
        overrides: {
          agent: {
            prompt: {
              prompt: getSystemPrompt()
            },
            firstMessage: getFirstMessage(),
            language: "ko",
          },
        },
      });
      
    } catch (error: any) {
      console.error("Failed to start voice session:", error);
      setIsConnecting(false);
      
      if (error.name === "NotAllowedError") {
        toast.error("마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.");
      } else {
        toast.error(error.message || "음성 연결에 실패했습니다.");
      }
    }
  }, [conversation, getSystemPrompt, getFirstMessage]);

  const endSession = useCallback(async () => {
    await conversation.endSession();
    setMessages([]);
  }, [conversation]);

  return {
    status: conversation.status,
    isSpeaking: conversation.isSpeaking,
    isConnecting,
    messages,
    startSession,
    endSession,
  };
}
