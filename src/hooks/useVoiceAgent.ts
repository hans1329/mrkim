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

export function useVoiceAgent() {
  const { profile } = useProfile();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [lastMessage, setLastMessage] = useState<VoiceMessage | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef(false);
  const messagesContextRef = useRef<VoiceMessage[]>([]);
  const processingRef = useRef(false);
  const pendingTranscriptRef = useRef<string>("");
  const sessionActiveRef = useRef(false);

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
      // 부분 인식 중 → 화면에 실시간 표시
      if (data.text && sessionActiveRef.current) {
        // TTS 재생 중이 아닐 때만 UI 업데이트 (에코 방지)
        const isTTSPlaying = audioElRef.current && !audioElRef.current.paused;
        if (!isTTSPlaying) {
          setLastMessage({ role: "user", text: data.text, timestamp: new Date() });
        }
      }
    },
    onCommittedTranscript: (data) => {
      // 최종 인식 완료 → AI 파이프라인 시작
      if (data.text && sessionActiveRef.current) {
        console.log("[Scribe] Committed:", data.text);
        
        // 인터럽트: TTS 재생 중에 확정된 사용자 발화 감지 시 TTS 중단
        const isTTSPlaying = audioElRef.current && !audioElRef.current.paused;
        if (isTTSPlaying && data.text.length >= 2) {
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
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
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

  // --- 오디오 유틸 ---
  const stopAudio = useCallback(() => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
  }, []);

  const primeAudio = useCallback(() => {
    if (!audioElRef.current) {
      audioElRef.current = new Audio();
    }
    const el = audioElRef.current;
    el.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
    el.play().then(() => {
      el.pause();
      el.currentTime = 0;
    }).catch(() => {});
  }, []);

  // --- TTS 재생 (인터럽트 지원, raw binary blob 방식) ---
  const speakText = useCallback(async (text: string): Promise<boolean> => {
    if (abortRef.current) return false;

    const cleaned = cleanForTTS(text);
    if (!cleaned) return false;

    setStatus("speaking");

    let blobUrl: string | null = null;
    let interrupted = false;

    try {
      // fetch()로 raw 바이너리 오디오를 직접 받음 (ElevenLabs 공식 권장)
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

      // blob()으로 바이너리 오디오 수신 → Object URL 생성
      const audioBlob = await response.blob();
      blobUrl = URL.createObjectURL(audioBlob);

      if (!audioElRef.current) {
        audioElRef.current = new Audio();
      }
      const el = audioElRef.current;
      el.src = blobUrl;

      await new Promise<void>((resolve, reject) => {
        el.onended = () => resolve();
        el.onpause = () => {
          if (el.currentTime < el.duration - 0.1) {
            interrupted = true;
            resolve();
          }
        };
        el.onerror = (e) => {
          console.error("Audio element error:", e);
          reject(new Error("Audio playback failed"));
        };
        el.play().catch((err) => {
          console.error("Audio play() failed:", err);
          reject(err);
        });
      });
    } catch (error) {
      if (!abortRef.current) {
        console.error("TTS error:", error);
      }
    } finally {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
      if (!abortRef.current && !interrupted) {
        setStatus("listening");
      }
    }

    return interrupted;
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

    // 이미 처리 중이면 대기열에 저장 (이전 요청은 인터럽트로 취소됨)
    if (processingRef.current) {
      pendingTranscriptRef.current = transcript;
      return;
    }

    processingRef.current = true;

    // 사용자 메시지 저장
    const userMsg: VoiceMessage = { role: "user", text: transcript, timestamp: new Date() };
    messagesContextRef.current = [...messagesContextRef.current, userMsg];
    setLastMessage(userMsg);
    saveMessageToDB("user", transcript);

    setStatus("processing");

    try {
      const aiResponse = await queryAI(transcript);

      if (abortRef.current || !sessionActiveRef.current) return;

      // AI 응답 저장
      const agentMsg: VoiceMessage = { role: "agent", text: aiResponse, timestamp: new Date() };
      messagesContextRef.current = [...messagesContextRef.current, agentMsg];
      setLastMessage(agentMsg);
      saveMessageToDB("assistant", aiResponse);

      // TTS 재생 (인터럽트 가능)
      await speakText(aiResponse);

      // 대기 중인 인터럽트 트랜스크립트 처리
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
  }, [queryAI, speakText, saveMessageToDB]);

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

    primeAudio();

    try {
      // 마이크 권한 확인
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPermissionDenied(true);
      toast.error("마이크 권한이 필요합니다. 브라우저 설정에서 마이크 접근을 허용해주세요.");
      return;
    }

    // Scribe 토큰 발급 & 연결
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

    // 인사 메시지
    const greeting = `안녕하세요, ${secretaryName}입니다. 무엇을 도와드릴까요?`;
    const greetingMsg: VoiceMessage = { role: "agent", text: greeting, timestamp: new Date() };
    messagesContextRef.current = [greetingMsg];
    setLastMessage(greetingMsg);

    // 인사말 TTS 재생 (Scribe는 이미 연결되어 듣고 있으므로 인터럽트 가능)
    await speakText(greeting);
  }, [status, permissionDenied, secretaryName, speakText, primeAudio, scribe]);

  // --- 세션 종료 ---
  const endSession = useCallback(() => {
    abortRef.current = true;
    sessionActiveRef.current = false;
    processingRef.current = false;
    pendingTranscriptRef.current = "";
    
    // Scribe 연결 해제
    if (scribe.isConnected) {
      scribe.disconnect();
    }
    
    stopAudio();
    if (audioElRef.current) {
      audioElRef.current.src = "";
      audioElRef.current = null;
    }
    setStatus("idle");
    setLastMessage(null);
    messagesContextRef.current = [];
  }, [scribe, stopAudio]);

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
      if (scribe.isConnected) {
        scribe.disconnect();
      }
      stopAudio();
      if (audioElRef.current) {
        audioElRef.current.src = "";
        audioElRef.current = null;
      }
    };
  }, [scribe, stopAudio]);

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
