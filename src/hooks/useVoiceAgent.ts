import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Scribe, CommitStrategy, RealtimeEvents } from "@elevenlabs/client";
import type { RealtimeConnection, PartialTranscriptMessage, CommittedTranscriptMessage } from "@elevenlabs/client";
import { toast } from "sonner";
import type { VisualizationData } from "@/components/chat/DataVisualization";

export interface VoiceMessage {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
  visualization?: VisualizationData | null;
}

type VoiceStatus = "idle" | "listening" | "processing" | "speaking";

const SUPABASE_URL = "https://kuxpsfxkumbfuqsvcucx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1eHBzZnhrdW1iZnVxc3ZjdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMTMwMDcsImV4cCI6MjA4NTU4OTAwN30.Ow_rO5MmbE-6fRYQ-E5Bxbd_0zXr70qURQAgqIGGm5s";
const CHAT_URL = `${SUPABASE_URL}/functions/v1/chat-ai`;
const TTS_URL = `${SUPABASE_URL}/functions/v1/elevenlabs-tts`;

function cleanForTTS(text: string): string {
  return text
    .replace(/#{1,6}\s?/g, "")                          // 마크다운 헤더
    .replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1")             // 볼드/이탤릭
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")              // 링크
    .replace(/`([^`]+)`/g, "$1")                          // 인라인 코드
    .replace(/^\d+\.\s+/gm, "")                           // 번호 목록 (1. 2. 3.)
    .replace(/^[-•*]\s+/gm, "")                           // 불릿 목록
    .replace(/\p{Extended_Pictographic}/gu, "")            // 모든 이모지 제거
    .replace(/\n{2,}/g, " ")                              // 여러 줄바꿈 → 공백
    .replace(/\n/g, " ")                                  // 단일 줄바꿈 → 공백
    .replace(/\s{2,}/g, " ")                              // 연속 공백 정리
    .trim();
}

/** 한국어 받침 여부 확인 (마지막 글자가 받침이 있는지) */
function hasBatchim(str: string): boolean {
  const lastChar = str[str.length - 1];
  if (!lastChar) return false;
  const code = lastChar.charCodeAt(0);
  // 한글 유니코드 범위 체크
  if (code < 0xAC00 || code > 0xD7A3) return false;
  return (code - 0xAC00) % 28 !== 0;
}

export function useVoiceAgent() {
  const { profile } = useProfile();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [lastMessage, setLastMessage] = useState<VoiceMessage | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [isTTSPreparing, setIsTTSPreparing] = useState(false);

  const abortRef = useRef(false);
  const messagesContextRef = useRef<VoiceMessage[]>([]);
  const processingRef = useRef(false);
  const pendingTranscriptRef = useRef<string>("");
  const sessionActiveRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  // 유저 제스처 컨텍스트에서 생성한 Audio 객체 (재사용)
  const persistentAudioRef = useRef<HTMLAudioElement | null>(null);
  // ScribeRealtime 연결을 ref로 관리 (React 훅 아님!)
  const scribeConnectionRef = useRef<RealtimeConnection | null>(null);

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryTone = profile?.secretary_tone || "polite";
  const secretaryGender = profile?.secretary_gender || "female";

  // --- HTMLAudioElement 기반 TTS 재생 ---
  // audioEl이 이미 생성된 경우 해당 엘리먼트에 src를 설정하여 재생
  const playAudioBlob = useCallback(
    (audioBlob: Blob, onPlayStarted?: () => void): Promise<{ interrupted: boolean }> => {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(audioBlob);
        // 첫 재생은 제스처 컨텍스트 Audio 사용, 이후는 새 Audio 생성
        // (재사용 시 일부 브라우저에서 시스템 볼륨 무시 이슈)
        let audio: HTMLAudioElement;
        if (persistentAudioRef.current) {
          audio = persistentAudioRef.current;
          persistentAudioRef.current = null; // 첫 재생 후 소진
        } else {
          audio = new Audio();
        }
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
    setIsTTSPreparing(true);

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

      // TTS 준비 완료, 재생 시작
      setIsTTSPreparing(false);
      onPlayStart?.();

      const { interrupted } = await playAudioBlob(audioBlob);

      if (!abortRef.current && !interrupted) {
        setStatus("listening");
      }

      return interrupted;
    } catch (error) {
      if (!abortRef.current) {
        console.error("[TTS] ❌ Error:", error);
        setIsTTSPreparing(false);
        // TTS 실패 시에도 텍스트는 표시
        onPlayStart?.();
        setStatus("listening");
      }
      return false;
    }
  }, [secretaryGender, secretaryTone, playAudioBlob]);

  // --- chat-ai 호출 ---
  const queryAI = useCallback(async (userText: string): Promise<{ response: string; visualization?: VisualizationData | null }> => {
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
    return {
      response: data.response || "죄송합니다, 응답을 생성하지 못했습니다.",
      visualization: data.visualization || null,
    };
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
      const aiResult = await queryAI(transcript);

      if (abortRef.current || !sessionActiveRef.current) return;

      const agentMsg: VoiceMessage = { role: "agent", text: aiResult.response, timestamp: new Date(), visualization: aiResult.visualization };
      messagesContextRef.current = [...messagesContextRef.current, agentMsg];
      saveMessageToDB("assistant", aiResult.response);

      // 텍스트는 TTS 재생이 시작될 때 표시
      await fetchAndPlayTTS(aiResult.response, () => {
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

          // TTS 재생 중에는 스피커→마이크 에코가 사용자 발화로 오인식되므로 무시
          // (TTS 끝난 후 자동으로 listening 모드로 전환됨)
          if (currentAudioRef.current) {
            console.log("[Scribe] ⏭ Ignoring during TTS playback (echo prevention):", data.text);
            return;
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
  }, [handleCommittedTranscript]);

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
    const gestureAudio = new Audio();
    gestureAudio.preload = "auto";
    persistentAudioRef.current = gestureAudio;
    console.log("[Session] Audio element created (gesture context) - will reuse for all TTS");

    // 말투에 맞는 인사말 생성 (받침 여부에 따라 조사 변경)
    const nameHasBatchim = hasBatchim(secretaryName);
    const greetingByTone: Record<string, string> = {
      polite: `안녕하세요, ${secretaryName}입니다. 어떻게 도와드릴까요?`,
      friendly: `안녕하세요~ ${secretaryName}${nameHasBatchim ? "이에요" : "예요"}! 무엇을 도와드릴까요?`,
      cute: `안녕하세용~ ${secretaryName}${nameHasBatchim ? "이에용" : "에용"}! 무엇을 도와드릴까용? ✨`,
    };
    const greeting = greetingByTone[secretaryTone] || greetingByTone.polite;
    const greetingMsg: VoiceMessage = { role: "agent", text: greeting, timestamp: new Date() };
    const cleanedGreeting = cleanForTTS(greeting);

    // 1. TTS 인사말 fetch
    setStatus("speaking");
    setIsTTSPreparing(true);
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
      setIsTTSPreparing(false);
      console.log("[Session] 2. Playing greeting (pre-created audio)...");

      // 재생 시작 시점에 인사말 텍스트 표시
      const playPromise = playAudioBlob(greetingAudioBlob, () => {
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
      setIsTTSPreparing(false);
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
    persistentAudioRef.current = null;

    // Scribe 연결 해제
    disconnectScribe();

    setStatus("idle");
    setLastMessage(null);
    setIsTTSPreparing(false);
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
      persistentAudioRef.current = null;
      const conn = scribeConnectionRef.current;
      if (conn) {
        try { conn.close(); } catch {}
        scribeConnectionRef.current = null;
      }
    };
  }, []);

  // --- TTS 중단 후 듣기 모드 전환 (세션 유지) ---
  const interruptAndListen = useCallback(() => {
    const audio = currentAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      currentAudioRef.current = null;
      console.log("[Voice] ⏹ TTS interrupted, switching to listening");
    }
    setIsTTSPreparing(false);
    processingRef.current = false;
    pendingTranscriptRef.current = "";
    if (sessionActiveRef.current) {
      setStatus("listening");
    }
  }, []);

  // --- 텍스트 직접 전송 (제안 칩 탭 시 사용) ---
  const sendTextDirectly = useCallback(async (text: string) => {
    if (!sessionActiveRef.current || processingRef.current || abortRef.current) return;
    handleCommittedTranscript(text);
  }, [handleCommittedTranscript]);

  return {
    status,
    isSpeaking: status === "speaking",
    isListening: status === "listening",
    isProcessing: status === "processing",
    isActive: status !== "idle",
    isTTSPreparing,
    lastMessage,
    permissionDenied,
    lastError,
    startSession,
    endSession,
    interruptAndListen,
    resetPermission,
    sendTextDirectly,
  };
}
