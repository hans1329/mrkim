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

/** 숫자를 한국어 읽기로 변환 (예: 4431570 → "사백사십삼만 천오백칠십") */
function numberToKorean(num: number): string {
  if (num === 0) return "영";
  const units = ["", "만", "억", "조"];
  const smallUnits = ["", "십", "백", "천"];
  const digits = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

  let result = "";
  let unitIndex = 0;
  let n = Math.abs(num);

  while (n > 0) {
    const chunk = n % 10000;
    if (chunk > 0) {
      let chunkStr = "";
      let c = chunk;
      for (let i = 0; i < 4; i++) {
        const d = c % 10;
        if (d > 0) {
          // "일십", "일백", "일천" → "십", "백", "천" (일 생략)
          const digitStr = (d === 1 && i > 0) ? "" : digits[d];
          chunkStr = digitStr + smallUnits[i] + chunkStr;
        }
        c = Math.floor(c / 10);
      }
      result = chunkStr + units[unitIndex] + " " + result;
    }
    n = Math.floor(n / 10000);
    unitIndex++;
  }

  return (num < 0 ? "마이너스 " : "") + result.trim();
}

/** 텍스트 내 숫자+원/건/명/% 패턴을 한글 독음으로 변환 */
function convertNumbersForTTS(text: string): string {
  // 쉼표 포함 숫자 + 단위(원, 건, 명, 개, %) 패턴
  return text.replace(/([\d,]+)\s*(원|건|명|개|%|만원|억원)/g, (_, numStr, unit) => {
    const num = parseInt(numStr.replace(/,/g, ""), 10);
    if (isNaN(num)) return _;
    
    // "만원", "억원" 단위는 이미 큰 단위 포함
    if (unit === "만원") return numberToKorean(num * 10000) + "원";
    if (unit === "억원") return numberToKorean(num * 100000000) + "원";
    if (unit === "%") return numberToKorean(num) + "퍼센트";
    
    return numberToKorean(num) + unit;
  });
}

function cleanForTTS(text: string): string {
  let cleaned = text
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
  
  // 숫자+단위를 한글 독음으로 변환
  cleaned = convertNumbersForTTS(cleaned);
  
  return cleaned;
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
  const [volume, setVolumeState] = useState(1);

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
  const suppressSTTRef = useRef(false); // ★ 응답 구성 시작~음성 출력 완료 구간 차단
  const consecutiveErrorsRef = useRef(0);
  const MAX_CONSECUTIVE_ERRORS = 3;
  const MIN_TRANSCRIPT_LENGTH = 5; // 잡음/에코 필터링
  const handleCommittedTranscriptRef = useRef<(transcript: string) => void>(() => {});

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryTone = profile?.secretary_tone || "polite";
  const secretaryGender = profile?.secretary_gender || "female";

  // --- HTMLAudioElement 기반 TTS 재생 ---
  // audioEl이 이미 생성된 경우 해당 엘리먼트에 src를 설정하여 재생
  const playAudioBlob = useCallback(
    (audioBlob: Blob, onPlayStarted?: () => void): Promise<{ interrupted: boolean }> => {
      return new Promise((resolve) => {
        const url = URL.createObjectURL(audioBlob);
        // 모바일 자동재생 정책 대응: persistent audio를 항상 재사용
        // (소진하지 않고 계속 같은 엘리먼트 사용 → 제스처 컨텍스트 유지)
      const audio = persistentAudioRef.current || new Audio();
      audio.src = url;
      audio.volume = volume;
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
          console.error("[Audio] play() rejected:", err?.name, err?.message);
          console.error("[Audio] This may be a mobile autoplay policy issue. User gesture context may have expired.");
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

      connection.on(RealtimeEvents.OPEN, () => {
        console.log("[Scribe] ✅ Connected and listening");
      });

      connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data: PartialTranscriptMessage) => {
        if (data.text && sessionActiveRef.current) {
          if (suppressSTTRef.current) return;
          setLastMessage({ role: "user", text: data.text, timestamp: new Date() });
        }
      });

      connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data: CommittedTranscriptMessage) => {
        if (data.text && sessionActiveRef.current) {
          if (suppressSTTRef.current) {
            console.log("[Scribe] ⏭ Suppressed:", data.text);
            return;
          }
          console.log("[Scribe] Committed:", data.text);
          handleCommittedTranscriptRef.current(data.text);
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
  }, []);

  // --- 최종 인식 처리 ---
  const handleCommittedTranscript = useCallback(async (transcript: string) => {
    if (abortRef.current || !transcript.trim() || !sessionActiveRef.current) return;

    // ★ 최소 길이 필터 - 잡음/에코 방지
    const cleaned = transcript.trim().replace(/[()（）\s]/g, "");
    if (cleaned.length < MIN_TRANSCRIPT_LENGTH) {
      console.log("[Scribe] ⏭ Too short, ignoring:", transcript);
      return;
    }

    // ★ 연속 에러 시 자동 중단
    if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
      console.log("[Voice] ⛔ Too many consecutive errors, stopping");
      setLastError("연속 오류가 발생하여 음성 인식을 일시 중지했습니다. 마이크를 다시 눌러 시작하세요.");
      setStatus("idle");
      sessionActiveRef.current = false;
      return;
    }

    if (processingRef.current) {
      pendingTranscriptRef.current = transcript;
      return;
    }

    // ★ 준비 시작 즉시 STT 차단 (에코/중복 방지)
    processingRef.current = true;
    suppressSTTRef.current = true;
    console.log("[STT] 🔇 Suppressed (from processing start)");

    const userMsg: VoiceMessage = { role: "user", text: transcript, timestamp: new Date() };
    messagesContextRef.current = [...messagesContextRef.current, userMsg];
    setLastMessage(userMsg);
    saveMessageToDB("user", transcript);

    setStatus("processing");

    try {
      const aiResult = await queryAI(transcript);

      if (abortRef.current || !sessionActiveRef.current) return;

      // ★ 성공 시 에러 카운터 리셋
      consecutiveErrorsRef.current = 0;

      const agentMsg: VoiceMessage = { role: "agent", text: aiResult.response, timestamp: new Date(), visualization: aiResult.visualization };
      messagesContextRef.current = [...messagesContextRef.current, agentMsg];
      saveMessageToDB("assistant", aiResult.response);

      await fetchAndPlayTTS(aiResult.response, () => {
        setLastMessage(agentMsg);
      });

      // ★ TTS 완료 → STT 즉시 재개
      suppressSTTRef.current = false;
      console.log("[STT] 🔊 Resumed (TTS done)");

      if (pendingTranscriptRef.current && sessionActiveRef.current) {
        const pending = pendingTranscriptRef.current;
        pendingTranscriptRef.current = "";
        processingRef.current = false;
        handleCommittedTranscript(pending);
        return;
      }
    } catch (error: any) {
      if (!abortRef.current) {
        consecutiveErrorsRef.current += 1;
        console.error(`Voice pipeline error (${consecutiveErrorsRef.current}/${MAX_CONSECUTIVE_ERRORS}):`, error);
        
        const isQuotaError = error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED");
        const errorText = isQuotaError 
          ? "죄송합니다, 잠시 후 다시 시도해주세요." 
          : "죄송합니다, 일시적인 오류가 발생했습니다.";
        
        setLastError(error?.message || "오류가 발생했습니다.");

        const errorMsg: VoiceMessage = {
          role: "agent",
          text: errorText,
          timestamp: new Date(),
        };
        messagesContextRef.current = [...messagesContextRef.current, errorMsg];
        setLastMessage(errorMsg);
        saveMessageToDB("assistant", errorMsg.text);

        // ★ 에러 시에도 STT 재개
        setTimeout(() => {
          suppressSTTRef.current = false;
        }, 2000);
        
        setStatus("listening");
      }
    } finally {
      processingRef.current = false;
    }
  }, [queryAI, fetchAndPlayTTS, saveMessageToDB]);

  // ref를 항상 최신 handleCommittedTranscript로 동기화
  handleCommittedTranscriptRef.current = handleCommittedTranscript;


  // --- 세션 시작 ---
  const startSession = useCallback(async () => {
    if (status !== "idle" || permissionDenied) return;

    console.log("[Session] ▶ Starting voice session...");

    abortRef.current = false;
    sessionActiveRef.current = true;
    processingRef.current = false;
    suppressSTTRef.current = true; // ★ 인사말 재생 끝날 때까지 STT 차단
    pendingTranscriptRef.current = "";
    messagesContextRef.current = [];
    setLastMessage(null);
    setLastError(null);
    consecutiveErrorsRef.current = 0;

    // ★ 핵심: 유저 제스처 컨텍스트 내에서 즉시 Audio 객체 생성
    // 이미 있으면 재사용 (두 번째 세션 시작 시)
    if (!persistentAudioRef.current) {
      const gestureAudio = new Audio();
      gestureAudio.preload = "auto";
      persistentAudioRef.current = gestureAudio;
      console.log("[Session] Audio element created (gesture context)");
    } else {
      console.log("[Session] Reusing existing audio element");
    }

    // 말투에 맞는 인사말 생성 (받침 여부에 따라 조사 변경)
    const nameHasBatchim = hasBatchim(secretaryName);
    const greetingByTone: Record<string, string> = {
      polite: `${secretaryName}입니다! 무엇을 도와드릴까요?`,
      friendly: `${secretaryName}${nameHasBatchim ? "이에요" : "예요"}! 무엇을 도와드릴까요?`,
      cute: `${secretaryName}${nameHasBatchim ? "이에용" : "에용"}! 무엇을 도와드릴까용? ✨`,
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

    // 2. 인사말 재생 + Scribe 연결 병렬 (STT 플래그로 에코 차단)
    messagesContextRef.current = [greetingMsg];

    if (greetingAudioBlob) {
      setIsTTSPreparing(false);
      console.log("[Session] 2. Playing greeting + connecting Scribe (parallel)...");

      const playPromise = playAudioBlob(greetingAudioBlob, () => {
        setLastMessage(greetingMsg);
      });
      const scribePromise = connectScribe();

      const { interrupted } = await playPromise;
      const scribeOk = await scribePromise;

      console.log("[Session] Greeting done, interrupted:", interrupted, "scribe:", scribeOk);

      // ★ 인사말 재생 완료 → STT 즉시 활성화
      suppressSTTRef.current = false;
      console.log("[STT] 🔊 Greeting done, STT enabled");

      if (!abortRef.current && !interrupted) {
        setStatus(scribeOk ? "listening" : "idle");
        if (!scribeOk) sessionActiveRef.current = false;
      }
    } else {
      setIsTTSPreparing(false);
      suppressSTTRef.current = false;
      setStatus("listening");
      const scribeOk = await connectScribe();
      if (!scribeOk) {
        sessionActiveRef.current = false;
        setStatus("idle");
      }
    }
  }, [status, permissionDenied, profile, secretaryName, secretaryGender, secretaryTone, playAudioBlob, connectScribe]);

  

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
    // persistentAudioRef는 유지 (재시작 시 제스처 컨텍스트 재사용)

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
    suppressSTTRef.current = false;
    if (sessionActiveRef.current) {
      setStatus("listening");
    }
  }, []);

  // --- 텍스트 직접 전송 (제안 칩 탭 시 사용) ---
  const sendTextDirectly = useCallback(async (text: string) => {
    if (!sessionActiveRef.current || processingRef.current || abortRef.current) return;
    handleCommittedTranscript(text);
  }, [handleCommittedTranscript]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
    if (persistentAudioRef.current) {
      persistentAudioRef.current.volume = clamped;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.volume = clamped;
    }
  }, []);

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
    volume,
    setVolume,
    startSession,
    endSession,
    interruptAndListen,
    resetPermission,
    sendTextDirectly,
  };
}
