import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface V2VoiceContextType {
  isConnected: boolean;
  partialTranscript: string;
  volumeRef: React.RefObject<number>;
  toggleVoice: () => void;
  onCommit: (callback: (text: string) => void) => void;
}

const V2VoiceContext = createContext<V2VoiceContextType | null>(null);

export function V2VoiceProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const volumeRef = useRef(0);
  const commitCallbackRef = useRef<((text: string) => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataArrayRef = useRef<any>(null);
  const animFrameRef = useRef<number>();

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    commitStrategy: CommitStrategy.VAD,
    languageCode: "kor",
    onCommittedTranscript: (data) => {
      if (data.text?.trim() && commitCallbackRef.current) {
        commitCallbackRef.current(data.text.trim());
      }
    },
  });

  // Audio analysis for oscilloscope
  useEffect(() => {
    if (!scribe.isConnected) {
      volumeRef.current = 0;
      return;
    }

    let cancelled = false;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        const audioCtx = new AudioContext();
        if (audioCtx.state === "suspended") await audioCtx.resume();
        audioCtxRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.55;
        source.connect(analyser);
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.fftSize);
      } catch {}
    };

    const poll = () => {
      if (cancelled) return;
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      if (analyser && dataArray) {
        analyser.getByteTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const n = (dataArray[i] - 128) / 128;
          sumSquares += n * n;
        }
        const rms = Math.sqrt(sumSquares / dataArray.length);
        const boosted = Math.min(1, rms * 8);
        volumeRef.current += (boosted - volumeRef.current) * 0.22;
      } else {
        volumeRef.current += (0 - volumeRef.current) * 0.08;
      }
      animFrameRef.current = requestAnimationFrame(poll);
    };

    initAudio().then(() => { if (!cancelled) poll(); });

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
      streamRef.current = null;
      audioCtxRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
    };
  }, [scribe.isConnected]);

  const toggleVoice = useCallback(async () => {
    if (scribe.isConnected) {
      scribe.disconnect();
      return;
    }

    // 1) HTTPS / 지원 여부 확인
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("이 브라우저는 마이크를 지원하지 않아요", {
        description: "Chrome, Safari 최신 버전에서 다시 시도해주세요.",
      });
      return;
    }

    // 2) 권한 사전 요청 (실패 시 명확히 안내)
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const e = err as DOMException;
      if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
        toast.error("마이크 권한이 차단되어 있어요", {
          description: "브라우저 주소창의 자물쇠 아이콘 → 사이트 설정 → 마이크를 '허용'으로 바꿔주세요.",
          duration: 8000,
        });
      } else if (e?.name === "NotFoundError") {
        toast.error("마이크를 찾을 수 없어요", { description: "마이크가 연결되어 있는지 확인해주세요." });
      } else {
        toast.error("마이크를 켤 수 없어요", { description: e?.message || "잠시 후 다시 시도해주세요." });
      }
      return;
    }

    // 3) 토큰 발급 + 연결
    try {
      const { data, error } = await supabase.functions.invoke("elevenlabs-scribe-token");
      if (error || !data?.token) {
        toast.error("음성 서비스 연결 실패", { description: "잠시 후 다시 시도해주세요." });
        return;
      }
      await scribe.connect({
        token: data.token,
        microphone: { echoCancellation: true, noiseSuppression: true },
      });
      setIsReady(true);
    } catch (err) {
      console.error("scribe connect error:", err);
      toast.error("음성 연결에 실패했어요", { description: "네트워크를 확인하고 다시 시도해주세요." });
    }
  }, [scribe]);

  const onCommit = useCallback((callback: (text: string) => void) => {
    commitCallbackRef.current = callback;
  }, []);

  return (
    <V2VoiceContext.Provider value={{
      isConnected: scribe.isConnected,
      partialTranscript: scribe.partialTranscript || "",
      volumeRef,
      toggleVoice,
      onCommit,
    }}>
      {children}
    </V2VoiceContext.Provider>
  );
}

export function useV2Voice() {
  const ctx = useContext(V2VoiceContext);
  if (!ctx) throw new Error("useV2Voice must be used within V2VoiceProvider");
  return ctx;
}
