import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { toast } from "sonner";

export interface VoiceMessage {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

type VoiceStatus = "idle" | "listening" | "processing" | "speaking";

const SUPABASE_URL = "https://kuxpsfxkumbfuqsvcucx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1eHBzZnhrdW1iZnVxc3ZjdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTMwMDcsImV4cCI6MjA4NTU4OTAwN30.Ow_rO5MmbE-6fRYQ-E5Bxbd_0zXr70qURQAgqIGGm5s";
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat-ai`;
const TTS_URL = `${SUPABASE_URL}/functions/v1/elevenlabs-tts`;

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

// --- Web Audio API 기반 TTS 재생 헬퍼 ---
// HTMLAudioElement 대신 AudioContext를 사용하여 Scribe 마이크 스트림과의 충돌을 방지
async function playAudioWithWebAudio(
  audioData: ArrayBuffer,
  abortSignal: TTSAbortSignal,
): Promise<{ interrupted: boolean }> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  
  try {
    await ctx.resume();
    const audioBuffer = await ctx.decodeAudioData(audioData);
    
    if (abortSignal.aborted) {
      await ctx.close();
      return { interrupted: false };
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    
    return new Promise<{ interrupted: boolean }>((resolve) => {
      const cleanup = () => {
        try { source.stop(); } catch {}
        ctx.close().catch(() => {});
      };

      // 외부에서 중단할 수 있도록 abort 콜백 등록
      abortSignal.onAbort = () => {
        cleanup();
        resolve({ interrupted: true });
      };

      source.onended = () => {
        if (!abortSignal.aborted) {
          ctx.close().catch(() => {});
          resolve({ interrupted: false });
        }
      };

      source.start(0);
    });
  } catch (error) {
    console.error("[WebAudio] Decode/play error:", error);
    await ctx.close().catch(() => {});
    return { interrupted: false };
  }
}

// TTS 중단 시그널
interface TTSAbortSignal {
  aborted: boolean;
  onAbort?: () => void;
}

export function useVoiceAgent() {
  const { profile } = useProfile();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [lastMessage, setLastMessage] = useState<VoiceMessage | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const abortRef = useRef(false);
  const messagesContextRef = useRef<VoiceMessage[]>([]);
  const processingRef = useRef(false);
  const pendingTranscriptRef = useRef<string>("");
  const sessionActiveRef = useRef(false);
  const currentAbortSignalRef = useRef<TTSAbortSignal | null>(null);

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryTone = profile?.secretary_tone || "polite";
  const secretaryGender = profile?.secretary_gender || "female";

  // --- ElevenLabs Scribe (실시간 STT) ---
  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    languageCode: "kor",
    microphone: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    onConnect: () => {
      console.log("[Scribe] Connected");
    },
    onDisconnect: () => {
      console.log("[Scribe] Disconnected");
    },
    onPartialTranscript: (data) => {
      if (data.text && sessionActiveRef.current) {
        // TTS 재생 중이 아닐 때만 UI 업데이트 (에코 방지)
        if (!currentAbortSignalRef.current) {
          setLastMessage({ role: "user", text: data.text, timestamp: new Date() });
        }
      }
    },
    onCommittedTranscript: (data) => {
      if (data.text && sessionActiveRef.current) {
        console.log("[Scribe] Committed:", data.text);
        
        // 인터럽트: TTS 재생 중에 확정된 사용자 발화 감지 시 TTS 중단
        if (currentAbortSignalRef.current && data.text.length >= 2) {
          console.log("[Interrupt] User committed speech during TTS, stopping audio");
          interruptTTS();
        }
        
        handleCommittedTranscript(data.text);
      }
    },
    onError: (error) => {
      console.error("[Scribe] Error:", error);
      if (!abortRef.current) {
        setLastError("음성 인식 오류가 발생했습니다.");
      }
    },
    onAuthError: () => {
      console.error("[Scribe] Auth error");
      setLastError("음성 인식 인증에 실패했습니다.");
    },
  });

  // --- TTS 인터럽트 ---
  const interruptTTS = useCallback(() => {
    const signal = currentAbortSignalRef.current;
    if (signal) {
      signal.aborted = true;
      signal.onAbort?.();
      currentAbortSignalRef.current = null;
    }
    if (status === "speaking") {
      setStatus("listening");
    }
  }, [status]);

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

  // --- TTS fetch + 재생 (Web Audio API) ---
  const fetchAndPlayTTS = useCallback(async (text: string): Promise<boolean> => {
    const cleaned = cleanForTTS(text);
    if (!cleaned || abortRef.current) return false;

    setStatus("speaking");

    try {
      const response = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          text: cleaned,
          gender: secretaryGender,
          tone: secretaryTone === "friendly" ? "friendly" : "default",
        }),
      });

      if (!response.ok) throw new Error(`TTS error: ${response.status}`);
      if (abortRef.current) return false;

      const audioData = await response.arrayBuffer();
      if (abortRef.current) return false;

      // Web Audio API로 재생 (Scribe 마이크와 충돌 없음)
      const abortSignal: TTSAbortSignal = { aborted: false };
      currentAbortSignalRef.current = abortSignal;

      console.log("[TTS] Playing audio via Web Audio API...");
      const { interrupted } = await playAudioWithWebAudio(audioData, abortSignal);
      
      currentAbortSignalRef.current = null;

      if (!abortRef.current && !interrupted) {
        setStatus("listening");
      }

      return interrupted;
    } catch (error) {
      currentAbortSignalRef.current = null;
      if (!abortRef.current) {
        console.error("[TTS] Error:", error);
        setStatus("listening");
      }
      return false;
    }
  }, [secretaryGender, secretaryTone]);

  // --- chat-ai 호출 ---
  const queryAI = useCallback(async (userText: string): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const userId = session?.user?.id;

    const recentContext = messagesContextRef.current.slice(-6).map(m => ({
      role: m.role === "agent" ? "assistant" : "user",
      content: m.text,
    }));

    recentContext.push({ role: "user", content: userText });

    const response = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${accessToken ?? SUPABASE_ANON_KEY}`,
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
  }, [secretaryName, secretaryTone, secretaryGender]);

  // --- 최종 인식 처리 (인터럽트 대응 포함) ---
  const handleCommittedTranscript = useCallback(async (transcript: string) => {
    if (abortRef.current || !transcript.trim() || !sessionActiveRef.current) return;

    if (processingRef.current) {
      pendingTranscriptRef.current = transcript;
      return;
    }

    processingRef.current = true;

    const userMsg: VoiceMessage = { role: "user", text: transcript, timestamp: new Date() };
    messagesContextRef.current = [...messagesContextRef.current, userMsg];
    setLastMessage(userMsg);
    saveMessageToDB("user", transcript);

    setStatus("processing");

    try {
      const aiResponse = await queryAI(transcript);

      if (abortRef.current || !sessionActiveRef.current) return;

      const agentMsg: VoiceMessage = { role: "agent", text: aiResponse, timestamp: new Date() };
      messagesContextRef.current = [...messagesContextRef.current, agentMsg];
      setLastMessage(agentMsg);
      saveMessageToDB("assistant", aiResponse);

      await fetchAndPlayTTS(aiResponse);

      if (pendingTranscriptRef.current && sessionActiveRef.current) {
        const pending = pendingTranscriptRef.current;
        pendingTranscriptRef.current = "";
        processingRef.current = false;
        handleCommittedTranscript(pending);
        return;
      }
    } catch (error: any) {
      if (!abortRef.current) {
        console.error("Voice pipeline error:", error);
        setLastError(error?.message || "오류가 발생했습니다.");

        const errorMsg: VoiceMessage = {
          role: "agent",
          text: "죄송합니다, 일시적인 오류가 발생했습니다.",
          timestamp: new Date(),
        };
        messagesContextRef.current = [...messagesContextRef.current, errorMsg];
        setLastMessage(errorMsg);
        saveMessageToDB("assistant", errorMsg.text);

        setStatus("listening");
      }
    } finally {
      processingRef.current = false;
    }
  }, [queryAI, fetchAndPlayTTS, saveMessageToDB]);

  // --- 세션 시작 ---
  const startSession = useCallback(async () => {
    if (status !== "idle" || permissionDenied) return;

    abortRef.current = false;
    sessionActiveRef.current = true;
    processingRef.current = false;
    pendingTranscriptRef.current = "";
    messagesContextRef.current = [];
    setLastMessage(null);
    setLastError(null);

    // 1. 유저 제스처 직후: AudioContext 잠금 해제
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctx.resume().then(() => ctx.close()).catch(() => {});
    }

    // 2. 인사말 TTS 프리페치 (유저 제스처 직후 즉시 시작)
    const greeting = `안녕하세요, ${secretaryName}입니다. 무엇을 도와드릴까요?`;
    const greetingMsg: VoiceMessage = { role: "agent", text: greeting, timestamp: new Date() };
    const cleanedGreeting = cleanForTTS(greeting);

    const ttsFetchPromise = fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        text: cleanedGreeting,
        gender: secretaryGender,
        tone: secretaryTone === "friendly" ? "friendly" : "default",
      }),
    });

    // 3. Scribe 토큰 발급 & 연결 (getUserMedia는 Scribe가 내부적으로 처리)
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      
      if (error || !data?.token) {
        throw new Error("Scribe 토큰을 받지 못했습니다.");
      }

      await scribe.connect({ token: data.token });
    } catch (error: any) {
      console.error("Scribe connection error:", error);
      setLastError("음성 인식 연결에 실패했습니다.");
      toast.error("음성 인식 연결에 실패했습니다. 다시 시도해주세요.");
      sessionActiveRef.current = false;
      return;
    }

    setStatus("listening");
    messagesContextRef.current = [greetingMsg];
    setLastMessage(greetingMsg);

    // 4. TTS 응답 수신 & Web Audio API로 재생
    try {
      const ttsResponse = await ttsFetchPromise;
      if (!ttsResponse.ok) throw new Error(`TTS error: ${ttsResponse.status}`);
      if (abortRef.current) return;

      const audioData = await ttsResponse.arrayBuffer();
      if (abortRef.current) return;

      const abortSignal: TTSAbortSignal = { aborted: false };
      currentAbortSignalRef.current = abortSignal;

      setStatus("speaking");
      console.log("[Greeting] Playing via Web Audio API...");
      
      const { interrupted } = await playAudioWithWebAudio(audioData, abortSignal);
      currentAbortSignalRef.current = null;

      if (!abortRef.current && !interrupted) {
        setStatus("listening");
      }
    } catch (error) {
      console.error("Greeting TTS error:", error);
      currentAbortSignalRef.current = null;
      if (!abortRef.current) {
        setStatus("listening");
      }
    }
  }, [status, permissionDenied, secretaryName, secretaryGender, secretaryTone, scribe]);

  // --- 세션 종료 ---
  const endSession = useCallback(() => {
    abortRef.current = true;
    sessionActiveRef.current = false;
    processingRef.current = false;
    pendingTranscriptRef.current = "";
    
    // 현재 재생 중인 오디오 중단
    const signal = currentAbortSignalRef.current;
    if (signal) {
      signal.aborted = true;
      signal.onAbort?.();
      currentAbortSignalRef.current = null;
    }
    
    // Scribe 연결 해제
    if (scribe.isConnected) {
      scribe.disconnect();
    }
    
    setStatus("idle");
    setLastMessage(null);
    messagesContextRef.current = [];
  }, [scribe]);

  // --- 권한 리셋 ---
  const resetPermission = useCallback(() => {
    setPermissionDenied(false);
    setLastError(null);
  }, []);

  // --- 언마운트 정리 ---
  useEffect(() => {
    return () => {
      abortRef.current = true;
      sessionActiveRef.current = false;
      const signal = currentAbortSignalRef.current;
      if (signal) {
        signal.aborted = true;
        signal.onAbort?.();
      }
      if (scribe.isConnected) {
        scribe.disconnect();
      }
    };
  }, [scribe]);

  return {
    status,
    isSpeaking: status === "speaking",
    isListening: status === "listening",
    isProcessing: status === "processing",
    isActive: status !== "idle",
    lastMessage,
    partialTranscript: scribe.partialTranscript,
    permissionDenied,
    lastError,
    startSession,
    endSession,
    resetPermission,
  };
}
