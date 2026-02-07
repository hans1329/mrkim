import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Scribe, CommitStrategy, RealtimeEvents } from "@elevenlabs/client";
import type { RealtimeConnection, PartialTranscriptMessage, CommittedTranscriptMessage } from "@elevenlabs/client";
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
  const [lastMessage, setLastMessage] = useState<VoiceMessage | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const abortRef = useRef(false);
  const messagesContextRef = useRef<VoiceMessage[]>([]);
  const processingRef = useRef(false);
  const pendingTranscriptRef = useRef<string>("");
  const sessionActiveRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // ScribeRealtime 연결을 ref로 관리 (React 훅 아님!)
  const scribeConnectionRef = useRef<RealtimeConnection | null>(null);

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryTone = profile?.secretary_tone || "polite";
  const secretaryGender = profile?.secretary_gender || "female";

  // --- HTMLAudioElement 기반 TTS 재생 ---
  // audioEl이 이미 생성된 경우 해당 엘리먼트에 src를 설정하여 재생
  const playAudioBlob = useCallback(
    (audioBlob: Blob, preCreatedAudio?: HTMLAudioElement, onPlayStarted?: () => void): Promise<{ interrupted: boolean }> => {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(audioBlob);
        const audio = preCreatedAudio || new Audio();
        audio.src = url;
        currentAudioRef.current = audio;

        audio.onended = () => {
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          resolve({ interrupted: false });
        };

        audio.onerror = (e) => {
          console.error("[Audio] Playback error:", e);
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          resolve({ interrupted: false });
        };

        audio.play().then(() => {
          console.log("[Audio] ▶ Playback started");
          onPlayStarted?.();
        }).catch((err) => {
          console.error("[Audio] play() rejected:", err);
          onPlayStarted?.(); // 실패해도 텍스트는 표시
          currentAudioRef.current = null;
          URL.revokeObjectURL(url);
          resolve({ interrupted: false });
        });
      });
    },
    []
  );

  // --- TTS 인터럽트 ---
  const interruptTTS = useCallback(() => {
    const audio = currentAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      currentAudioRef.current = null;
      console.log("[Audio] ⏹ Interrupted");
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

  // --- TTS fetch + 재생 (onPlayStart: 재생 시작 시 호출되는 콜백) ---
  const fetchAndPlayTTS = useCallback(async (text: string, onPlayStart?: () => void): Promise<boolean> => {
    const cleaned = cleanForTTS(text);
    if (!cleaned || abortRef.current) return false;

    setStatus("speaking");

    try {
      console.log("[TTS] Fetching for:", cleaned.substring(0, 30) + "...");
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

      const audioBlob = await response.blob();
      console.log("[TTS] Received:", audioBlob.size, "bytes");
      if (abortRef.current) return false;

      // 재생 시작 시 텍스트 표시 콜백 호출
      onPlayStart?.();

      const { interrupted } = await playAudioBlob(audioBlob);

      if (!abortRef.current && !interrupted) {
        setStatus("listening");
      }

      return interrupted;
    } catch (error) {
      if (!abortRef.current) {
        console.error("[TTS] ❌ Error:", error);
        // TTS 실패 시에도 텍스트는 표시
        onPlayStart?.();
        setStatus("listening");
      }
      return false;
    }
  }, [secretaryGender, secretaryTone, playAudioBlob]);

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
      saveMessageToDB("assistant", aiResponse);

      // 텍스트는 TTS 재생이 시작될 때 표시
      await fetchAndPlayTTS(aiResponse, () => {
        setLastMessage(agentMsg);
      });

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

  // --- Scribe 연결 (vanilla client, React 훅 없음) ---
  const connectScribe = useCallback(async (): Promise<boolean> => {
    try {
      console.log("[Scribe] Fetching token...");
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        console.error("[Scribe] Token error:", error, data);
        throw new Error("Scribe 토큰을 받지 못했습니다.");
      }

      console.log("[Scribe] Connecting with token...");
      const connection = Scribe.connect({
        token: data.token,
        modelId: "scribe_v2_realtime",
        commitStrategy: CommitStrategy.VAD,
        languageCode: "kor",
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      scribeConnectionRef.current = connection;

      // 이벤트 등록
      connection.on(RealtimeEvents.OPEN, () => {
        console.log("[Scribe] ✅ Connected and listening");
      });

      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data: PartialTranscriptMessage) => {
        if (data.text && sessionActiveRef.current) {
          // TTS 재생 중이 아닐 때만 UI 업데이트
          if (!currentAudioRef.current) {
            setLastMessage({ role: "user", text: data.text, timestamp: new Date() });
          }
        }
      });

      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data: CommittedTranscriptMessage) => {
        if (data.text && sessionActiveRef.current) {
          console.log("[Scribe] Committed:", data.text);

          // 인터럽트: TTS 재생 중 확정된 사용자 발화 시 TTS 중단
          // 배경 소음(TV 등) 오인식 방지를 위해 5글자 이상의 의미있는 발화만 인터럽트 처리
          if (currentAudioRef.current && data.text.trim().length >= 5) {
            console.log("[Interrupt] User speech during TTS:", data.text);
            interruptTTS();
          }

          handleCommittedTranscript(data.text);
        }
      });

      connection.on(RealtimeEvents.ERROR, (error: any) => {
        console.error("[Scribe] ❌ Error:", error);
        if (!abortRef.current) {
          setLastError("음성 인식 오류가 발생했습니다.");
        }
      });

      connection.on(RealtimeEvents.AUTH_ERROR, () => {
        console.error("[Scribe] ❌ Auth error");
        setLastError("음성 인식 인증에 실패했습니다.");
      });

      connection.on(RealtimeEvents.CLOSE, () => {
        console.log("[Scribe] Connection closed");
        scribeConnectionRef.current = null;
      });

      return true;
    } catch (err: any) {
      console.error("[Scribe] ❌ Connection error:", err);
      setLastError("음성 인식 연결에 실패했습니다.");
      toast.error("음성 인식 연결에 실패했습니다.");
      return false;
    }
  }, [interruptTTS, handleCommittedTranscript]);

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

    // ★ 핵심: 유저 제스처 컨텍스트 내에서 즉시 Audio 객체 생성
    // 이렇게 해야 브라우저 자동재생 제한을 우회할 수 있음
    const greetingAudio = new Audio();
    greetingAudio.preload = "auto";
    console.log("[Session] Audio element created (gesture context)");

    const greeting = `안녕하세요, ${secretaryName}입니다. 무엇을 도와드릴까요?`;
    const greetingMsg: VoiceMessage = { role: "agent", text: greeting, timestamp: new Date() };
    const cleanedGreeting = cleanForTTS(greeting);

    // 1. TTS 인사말 fetch
    console.log("[Session] 1. Fetching greeting TTS...");
    let greetingAudioBlob: Blob | null = null;
    try {
      const ttsResponse = await fetch(TTS_URL, {
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

      if (!ttsResponse.ok) throw new Error(`TTS ${ttsResponse.status}`);
      greetingAudioBlob = await ttsResponse.blob();
      console.log("[Session] TTS received:", greetingAudioBlob.size, "bytes");
    } catch (err) {
      console.error("[Session] ❌ TTS fetch error:", err);
    }

    if (abortRef.current) return;

    // 2. 인사말 재생(미리 생성한 Audio 사용) + Scribe 연결 병렬
    messagesContextRef.current = [greetingMsg];

    if (greetingAudioBlob) {
      setStatus("speaking");
      console.log("[Session] 2. Playing greeting (pre-created audio)...");

      // 재생 시작 시점에 인사말 텍스트 표시
      const playPromise = playAudioBlob(greetingAudioBlob, greetingAudio, () => {
        setLastMessage(greetingMsg);
      });
      const scribePromise = connectScribe();

      const { interrupted } = await playPromise;
      const scribeOk = await scribePromise;

      console.log("[Session] Greeting done, interrupted:", interrupted, "scribe:", scribeOk);

      if (!abortRef.current && !interrupted) {
        setStatus(scribeOk ? "listening" : "idle");
        if (!scribeOk) {
          sessionActiveRef.current = false;
        }
      }
    } else {
      // TTS 실패 시 바로 Scribe 연결
      setStatus("listening");
      const scribeOk = await connectScribe();
      if (!scribeOk) {
        sessionActiveRef.current = false;
        setStatus("idle");
      }
    }
  }, [status, permissionDenied, secretaryName, secretaryGender, secretaryTone, playAudioBlob, connectScribe]);

  // --- Scribe 연결 해제 ---
  const disconnectScribe = useCallback(() => {
    const conn = scribeConnectionRef.current;
    if (conn) {
      try {
        conn.close();
      } catch {}
      scribeConnectionRef.current = null;
    }
  }, []);

  // --- 세션 종료 ---
  const endSession = useCallback(() => {
    console.log("[Session] ⏹ Ending voice session");
    abortRef.current = true;
    sessionActiveRef.current = false;
    processingRef.current = false;
    pendingTranscriptRef.current = "";

    // 오디오 중단
    const audio = currentAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      currentAudioRef.current = null;
    }

    // Scribe 연결 해제
    disconnectScribe();

    setStatus("idle");
    setLastMessage(null);
    messagesContextRef.current = [];
  }, [disconnectScribe]);

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
      const audio = currentAudioRef.current;
      if (audio) {
        audio.pause();
        currentAudioRef.current = null;
      }
      const conn = scribeConnectionRef.current;
      if (conn) {
        try { conn.close(); } catch {}
        scribeConnectionRef.current = null;
      }
    };
  }, []);

  return {
    status,
    isSpeaking: status === "speaking",
    isListening: status === "listening",
    isProcessing: status === "processing",
    isActive: status !== "idle",
    lastMessage,
    permissionDenied,
    lastError,
    startSession,
    endSession,
    resetPermission,
  };
}
