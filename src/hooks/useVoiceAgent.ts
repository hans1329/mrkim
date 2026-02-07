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

  // ★ 핵심: 세션 동안 재사용하는 단일 AudioContext
  const audioCtxRef = useRef<AudioContext | null>(null);

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryTone = profile?.secretary_tone || "polite";
  const secretaryGender = profile?.secretary_gender || "female";

  // --- AudioContext 얻기 (없으면 생성) ---
  const getAudioContext = useCallback((): AudioContext => {
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      return audioCtxRef.current;
    }
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;
    console.log("[AudioCtx] Created new AudioContext, state:", ctx.state);
    return ctx;
  }, []);

  // --- Web Audio API 기반 TTS 재생 (기존 AudioContext 재사용) ---
  const playAudioWithContext = useCallback(
    async (
      ctx: AudioContext,
      audioData: ArrayBuffer,
      abortSignal: TTSAbortSignal
    ): Promise<{ interrupted: boolean }> => {
      try {
        // suspended면 resume (유저 제스처 직후라면 성공)
        if (ctx.state === "suspended") {
          console.log("[AudioCtx] Resuming suspended context...");
          await ctx.resume();
        }
        console.log("[AudioCtx] State after resume:", ctx.state, "| Data size:", audioData.byteLength);

        const audioBuffer = await ctx.decodeAudioData(audioData.slice(0));
        console.log("[AudioCtx] Decoded buffer:", audioBuffer.duration, "sec");

        if (abortSignal.aborted) {
          return { interrupted: false };
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);

        return new Promise<{ interrupted: boolean }>((resolve) => {
          const cleanup = () => {
            try {
              source.stop();
            } catch {}
          };

          abortSignal.onAbort = () => {
            cleanup();
            resolve({ interrupted: true });
          };

          source.onended = () => {
            if (!abortSignal.aborted) {
              resolve({ interrupted: false });
            }
          };

          source.start(0);
          console.log("[AudioCtx] Playback started");
        });
      } catch (error) {
        console.error("[AudioCtx] Decode/play error:", error);
        return { interrupted: false };
      }
    },
    []
  );

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
      console.log("[Scribe] ✅ Connected and listening");
    },
    onDisconnect: () => {
      console.log("[Scribe] Disconnected");
    },
    onPartialTranscript: (data) => {
      if (data.text && sessionActiveRef.current) {
        if (!currentAbortSignalRef.current) {
          setLastMessage({ role: "user", text: data.text, timestamp: new Date() });
        }
      }
    },
    onCommittedTranscript: (data) => {
      if (data.text && sessionActiveRef.current) {
        console.log("[Scribe] Committed:", data.text);

        if (currentAbortSignalRef.current && data.text.length >= 2) {
          console.log("[Interrupt] User speech during TTS, stopping audio");
          interruptTTS();
        }

        handleCommittedTranscript(data.text);
      }
    },
    onError: (error) => {
      console.error("[Scribe] ❌ Error:", error);
      if (!abortRef.current) {
        setLastError("음성 인식 오류가 발생했습니다.");
      }
    },
    onAuthError: () => {
      console.error("[Scribe] ❌ Auth error");
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

  // --- TTS fetch + 재생 ---
  const fetchAndPlayTTS = useCallback(async (text: string): Promise<boolean> => {
    const cleaned = cleanForTTS(text);
    if (!cleaned || abortRef.current) return false;

    setStatus("speaking");

    try {
      console.log("[TTS] Fetching audio for:", cleaned.substring(0, 30) + "...");
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
      console.log("[TTS] Received audio:", audioData.byteLength, "bytes");
      if (abortRef.current) return false;

      const ctx = getAudioContext();
      const abortSignal: TTSAbortSignal = { aborted: false };
      currentAbortSignalRef.current = abortSignal;

      const { interrupted } = await playAudioWithContext(ctx, audioData, abortSignal);

      currentAbortSignalRef.current = null;

      if (!abortRef.current && !interrupted) {
        setStatus("listening");
      }

      return interrupted;
    } catch (error) {
      currentAbortSignalRef.current = null;
      if (!abortRef.current) {
        console.error("[TTS] ❌ Error:", error);
        setStatus("listening");
      }
      return false;
    }
  }, [secretaryGender, secretaryTone, getAudioContext, playAudioWithContext]);

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

  // --- 최종 인식 처리 ---
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

    console.log("[Session] ▶ Starting voice session...");

    abortRef.current = false;
    sessionActiveRef.current = true;
    processingRef.current = false;
    pendingTranscriptRef.current = "";
    messagesContextRef.current = [];
    setLastMessage(null);
    setLastError(null);

    // ★ 1. 유저 제스처 직후: AudioContext 생성 + resume (이것이 핵심!)
    const ctx = getAudioContext();
    try {
      await ctx.resume();
      console.log("[Session] AudioContext resumed, state:", ctx.state);
    } catch (e) {
      console.error("[Session] AudioContext resume failed:", e);
    }

    // ★ 2. TTS 인사말 프리페치 (유저 제스처 직후 즉시 시작)
    const greeting = `안녕하세요, ${secretaryName}입니다. 무엇을 도와드릴까요?`;
    const greetingMsg: VoiceMessage = { role: "agent", text: greeting, timestamp: new Date() };
    const cleanedGreeting = cleanForTTS(greeting);

    console.log("[Session] Prefetching greeting TTS...");
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

    // ★ 3. Scribe 토큰 발급 & 연결 (병렬)
    try {
      console.log("[Session] Fetching Scribe token...");
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");

      if (error || !data?.token) {
        console.error("[Session] Scribe token error:", error, data);
        throw new Error("Scribe 토큰을 받지 못했습니다.");
      }

      console.log("[Session] Scribe token received, connecting...");
      await scribe.connect({ token: data.token });
      console.log("[Session] Scribe connected successfully");
    } catch (error: any) {
      console.error("[Session] ❌ Scribe connection error:", error);
      setLastError("음성 인식 연결에 실패했습니다.");
      toast.error("음성 인식 연결에 실패했습니다. 다시 시도해주세요.");
      sessionActiveRef.current = false;
      return;
    }

    setStatus("listening");
    messagesContextRef.current = [greetingMsg];
    setLastMessage(greetingMsg);

    // ★ 4. TTS 응답 수신 & 재생 (동일한 AudioContext 사용)
    try {
      const ttsResponse = await ttsFetchPromise;
      console.log("[Session] TTS response status:", ttsResponse.status);

      if (!ttsResponse.ok) throw new Error(`TTS error: ${ttsResponse.status}`);
      if (abortRef.current) return;

      const audioData = await ttsResponse.arrayBuffer();
      console.log("[Session] TTS audio size:", audioData.byteLength, "bytes");
      if (abortRef.current) return;

      const abortSignal: TTSAbortSignal = { aborted: false };
      currentAbortSignalRef.current = abortSignal;

      setStatus("speaking");
      console.log("[Session] Playing greeting via Web Audio API...");

      const { interrupted } = await playAudioWithContext(ctx, audioData, abortSignal);
      currentAbortSignalRef.current = null;

      console.log("[Session] Greeting playback finished, interrupted:", interrupted);

      if (!abortRef.current && !interrupted) {
        setStatus("listening");
      }
    } catch (error) {
      console.error("[Session] ❌ Greeting TTS error:", error);
      currentAbortSignalRef.current = null;
      if (!abortRef.current) {
        setStatus("listening");
      }
    }
  }, [status, permissionDenied, secretaryName, secretaryGender, secretaryTone, scribe, getAudioContext, playAudioWithContext]);

  // --- 세션 종료 ---
  const endSession = useCallback(() => {
    console.log("[Session] ⏹ Ending voice session");
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

    // AudioContext 닫기
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
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
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
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
