import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseElevenLabsVoiceOptions {
  agentId: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: Error) => void;
}

interface ConversationMessage {
  type: "user_transcript" | "agent_response" | "agent_response_correction";
  text: string;
  timestamp: Date;
}

export function useElevenLabsVoice(options: UseElevenLabsVoiceOptions) {
  const { agentId, onConnect, onDisconnect, onMessage, onError } = options;
  
  const [status, setStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [partialTranscript, setPartialTranscript] = useState("");
  
  const conversationRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const startSession = useCallback(async () => {
    setStatus("connecting");
    
    try {
      // 마이크 권한 요청
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Edge Function에서 대화 토큰 가져오기
      const { data, error } = await supabase.functions.invoke("elevenlabs-conversation-token", {
        body: { agentId }
      });

      if (error || !data?.token) {
        throw new Error(error?.message || "대화 토큰을 가져오지 못했습니다.");
      }

      // TODO: ElevenLabs useConversation 연동
      // 현재는 시뮬레이션 모드로 동작
      console.log("Conversation token received:", data.token.substring(0, 20) + "...");
      
      setStatus("connected");
      onConnect?.();
      
    } catch (error: any) {
      console.error("Failed to start voice session:", error);
      setStatus("disconnected");
      onError?.(error);
      toast.error("음성 연결에 실패했습니다.");
    }
  }, [agentId, onConnect, onError]);

  const endSession = useCallback(async () => {
    if (conversationRef.current) {
      // conversation.endSession() 호출
    }
    
    setStatus("disconnected");
    setIsSpeaking(false);
    setIsListening(false);
    setPartialTranscript("");
    onDisconnect?.();
  }, [onDisconnect]);

  const toggleListening = useCallback(() => {
    if (status !== "connected") return;
    
    setIsListening(prev => !prev);
  }, [status]);

  return {
    status,
    isSpeaking,
    isListening,
    messages,
    partialTranscript,
    startSession,
    endSession,
    toggleListening,
  };
}

// TTS 단독 사용 훅
export function useTextToSpeech() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string, options?: { gender?: "male" | "female"; tone?: string }) => {
    if (!text.trim()) return;
    
    setIsLoading(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text,
            gender: options?.gender || "female",
            tone: options?.tone || "default",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.audioContent) {
        // Base64 -> Audio URL
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        
        // 기존 오디오 정지
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }

        // 새 오디오 재생
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        
        audio.onplay = () => setIsPlaying(true);
        audio.onended = () => {
          setIsPlaying(false);
          audioRef.current = null;
        };
        audio.onerror = () => {
          setIsPlaying(false);
          audioRef.current = null;
          toast.error("오디오 재생에 실패했습니다.");
        };
        
        await audio.play();
      }
    } catch (error) {
      console.error("TTS error:", error);
      toast.error("음성 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  return {
    speak,
    stop,
    isPlaying,
    isLoading,
  };
}
