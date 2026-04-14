import { createContext, useContext, useState, useRef, useEffect, useCallback, ReactNode } from "react";
import { useScribe, CommitStrategy } from "@elevenlabs/react";
import { supabase } from "@/integrations/supabase/client";

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
  const dataArrayRef = useRef<Uint8Array | null>(null);
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
    } else {
      try {
        const { data } = await supabase.functions.invoke("elevenlabs-scribe-token");
        if (data?.token) {
          await scribe.connect({
            token: data.token,
            microphone: { echoCancellation: true, noiseSuppression: true },
          });
          setIsReady(true);
        }
      } catch {}
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
