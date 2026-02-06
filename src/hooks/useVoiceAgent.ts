import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

interface VoiceMessage {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

type VoiceStatus = "idle" | "listening" | "processing" | "speaking";

// Web Speech API 타입 선언
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-ai`;
const TTS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;

// 마크다운/이모지 제거 (TTS 최적화)
function cleanForTTS(text: string): string {
  return text
    .replace(/#{1,6}\s?/g, "")
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")
    .replace(/📊|📋|💡|🔴|✅|❌|⚠️|📈|📉|👋|😅|💰|📌|🎯/g, "")
    .replace(/^[-•]\s/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function useVoiceAgent() {
  const { profile } = useProfile();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryTone = profile?.secretary_tone || "polite";
  const secretaryGender = profile?.secretary_gender || "female";

  // 음성 인식 정리
  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
    }
  }, []);

  // 오디오 정리
  const stopAudio = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
  }, []);

  // 사용자 제스처 시점에 Audio 엘리먼트 프라이밍 (autoplay 정책 우회)
  const primeAudio = useCallback(() => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    // 무음 재생으로 unlock (사용자 클릭 컨텍스트에서 호출)
    const el = audioElRef.current;
    el.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
    el.play().then(() => {
      el.pause();
      el.currentTime = 0;
    }).catch(() => {});
  }, []);

  // TTS 재생 (프라이밍된 Audio 엘리먼트 재사용 → 시스템 볼륨 따름)
  const speakText = useCallback(async (text: string): Promise<void> => {
    if (abortRef.current) return;

    const cleaned = cleanForTTS(text);
    if (!cleaned) return;

    setStatus("speaking");

    try {
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          text: cleaned,
          gender: secretaryGender,
          tone: secretaryTone === "friendly" ? "friendly" : "default",
        }),
      });

      if (!response.ok) throw new Error(`TTS error: ${response.status}`);

      const data = await response.json();
      if (!data?.audioContent) throw new Error("No audio content");

      if (abortRef.current) return;

      // 프라이밍된 Audio 엘리먼트에 새 src 설정 후 재생
      const el = audioElRef.current || new Audio();
      audioElRef.current = el;
      el.src = `data:audio/mpeg;base64,${data.audioContent}`;

      await new Promise<void>((resolve, reject) => {
        el.onended = () => resolve();
        el.onerror = () => reject(new Error("Audio playback failed"));
        el.play().catch(reject);
      });
    } catch (error) {
      if (!abortRef.current) {
        console.error("TTS error:", error);
      }
    } finally {
      if (!abortRef.current) {
        setStatus("idle");
      }
    }
  }, [secretaryGender, secretaryTone]);

  // chat-ai 호출
  const queryAI = useCallback(async (userText: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const userId = session?.user?.id;

    // 최근 메시지 컨텍스트 (현재 세션 내)
    const recentContext = messages.slice(-6).map(m => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.text,
    }));

    recentContext.push({ role: "user", content: userText });

    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${accessToken ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: recentContext,
        secretaryName,
        secretaryTone,
        secretaryGender,
        userId,
        voiceMode: true,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || "죄송합니다, 응답을 생성하지 못했습니다.";
  }, [messages, secretaryName, secretaryTone, secretaryGender]);

  // 음성 인식 → AI → TTS 파이프라인
  const processVoiceInput = useCallback(async (transcript: string) => {
    if (abortRef.current || !transcript.trim()) return;

    // 사용자 메시지 추가
    setMessages(prev => [...prev, {
      role: "user",
      text: transcript,
      timestamp: new Date(),
    }]);

    setStatus("processing");

    try {
      const aiResponse = await queryAI(transcript);

      if (abortRef.current) return;

      // AI 응답 메시지 추가
      setMessages(prev => [...prev, {
        role: "agent",
        text: aiResponse,
        timestamp: new Date(),
      }]);

      // TTS로 응답 읽기
      await speakText(aiResponse);

      // TTS 끝나면 다시 듣기 시작
      if (!abortRef.current) {
        startListening();
      }
    } catch (error: any) {
      if (!abortRef.current) {
        console.error("Voice pipeline error:", error);
        setLastError(error?.message || "오류가 발생했습니다.");

        setMessages(prev => [...prev, {
          role: "agent",
          text: "죄송합니다, 일시적인 오류가 발생했습니다.",
          timestamp: new Date(),
        }]);

        setStatus("idle");
      }
    }
  }, [queryAI, speakText]);

  // 음성 인식 시작
  const startListening = useCallback(() => {
    if (abortRef.current) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setLastError("이 브라우저는 음성 인식을 지원하지 않습니다.");
      toast.error("음성 인식을 지원하지 않는 브라우저입니다. Chrome을 사용해주세요.");
      setStatus("idle");
      return;
    }

    stopRecognition();

    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (!abortRef.current) {
        setStatus("listening");
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        processVoiceInput(transcript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);

      if (event.error === "not-allowed") {
        setPermissionDenied(true);
        setStatus("idle");
        toast.error("마이크 권한이 필요합니다.");
        return;
      }

      if (event.error === "no-speech") {
        // 말을 안 했으면 다시 듣기
        if (!abortRef.current) {
          startListening();
        }
        return;
      }

      if (event.error === "aborted") {
        // 의도적 종료
        return;
      }

      if (!abortRef.current) {
        setLastError(`음성 인식 오류: ${event.error}`);
        setStatus("idle");
      }
    };

    recognition.onend = () => {
      // onresult 또는 onerror에서 처리되지 않은 경우
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [stopRecognition, processVoiceInput]);

  // 세션 시작
  const startSession = useCallback(async () => {
    if (status !== "idle" || permissionDenied) return;

    abortRef.current = false;
    setMessages([]);
    setLastError(null);

    // 사용자 제스처 시점에 Audio 엘리먼트 프라이밍 (autoplay 정책 우회 핵심)
    primeAudio();

    try {
      // 마이크 권한 확인
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPermissionDenied(true);
      toast.error("마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.");
      return;
    }

    // 인사 메시지 추가
    const greeting = `안녕하세요, ${secretaryName}입니다. 무엇을 도와드릴까요?`;
    setMessages([{
      role: "agent",
      text: greeting,
      timestamp: new Date(),
    }]);

    // 인사말 TTS 재생 후 듣기 시작
    await speakText(greeting);

    if (!abortRef.current) {
      startListening();
    }
  }, [status, permissionDenied, secretaryName, speakText, startListening, primeAudio]);

  // 세션 종료
  const endSession = useCallback(() => {
    abortRef.current = true;
    stopRecognition();
    stopAudio();
    if (audioElRef.current) {
      audioElRef.current.src = "";
      audioElRef.current = null;
    }
    setStatus("idle");
    setMessages([]);
  }, [stopRecognition, stopAudio]);

  // 권한 리셋
  const resetPermission = useCallback(() => {
    setPermissionDenied(false);
    setLastError(null);
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      abortRef.current = true;
      stopRecognition();
      stopAudio();
      if (audioElRef.current) {
        audioElRef.current.src = "";
        audioElRef.current = null;
      }
    };
  }, [stopRecognition, stopAudio]);

  return {
    status,
    isSpeaking: status === "speaking",
    isListening: status === "listening",
    isProcessing: status === "processing",
    isActive: status !== "idle",
    messages,
    permissionDenied,
    lastError,
    startSession,
    endSession,
    resetPermission,
  };
}
