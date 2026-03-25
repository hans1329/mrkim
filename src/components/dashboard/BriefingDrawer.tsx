import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Volume2, VolumeX, Loader2, Mic, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface BriefingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  briefingText: string;
  secretaryName: string;
  secretaryAvatarUrl?: string;
  voiceId?: string;
  onOpenChat: () => void;
  onDismiss: () => void;
}

export function BriefingDrawer({
  open,
  onOpenChange,
  briefingText,
  secretaryName,
  secretaryAvatarUrl,
  voiceId,
  onOpenChat,
  onDismiss,
}: BriefingDrawerProps) {
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);

  const profileImgSrc = secretaryAvatarUrl || "/images/icc-5.webp";

  const cleanText = briefingText
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#+\s/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^[-•]\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const stopTTS = () => {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = "";
      ttsAudioRef.current = null;
    }
    setIsPlayingTTS(false);
    setIsTTSLoading(false);
  };

  const handleTTS = async () => {
    if (isPlayingTTS) {
      stopTTS();
      return;
    }

    stopTTS();
    const abort = new AbortController();
    ttsAbortRef.current = abort;

    try {
      setIsTTSLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || abort.signal.aborted) return;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          signal: abort.signal,
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ text: cleanText, voiceId: voiceId || "EXAVITQu4vr4xnSDxMaL" }),
        }
      );
      if (abort.signal.aborted) return;
      if (!res.ok) throw new Error("TTS failed");

      const blob = await res.blob();
      if (abort.signal.aborted) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      audio.onplay = () => { setIsTTSLoading(false); setIsPlayingTTS(true); };
      audio.onended = () => { setIsPlayingTTS(false); setIsTTSLoading(false); ttsAudioRef.current = null; URL.revokeObjectURL(url); };
      audio.onerror = () => { setIsPlayingTTS(false); setIsTTSLoading(false); ttsAudioRef.current = null; };
      await audio.play();
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error("TTS playback failed:", err);
      setIsPlayingTTS(false);
      setIsTTSLoading(false);
    }
  };

  const handleClose = () => {
    stopTTS();
    onOpenChange(false);
  };

  const handleDismiss = () => {
    stopTTS();
    onDismiss();
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={(v) => { if (!v) stopTTS(); onOpenChange(v); }}>
      <DrawerContent className="max-h-[85vh]">
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-foreground/30 my-3" />
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-muted overflow-hidden flex items-center justify-center shadow-sm">
                <img
                  src={profileImgSrc}
                  alt={secretaryName}
                  className={secretaryAvatarUrl ? "h-full w-full object-cover" : "h-6 w-6 object-contain"}
                />
              </div>
              <div>
                <DrawerTitle className="text-base">오늘의 경영 브리핑</DrawerTitle>
                <DrawerDescription className="text-xs">{secretaryName}의 오늘 분석 리포트</DrawerDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10 rounded-full text-xs h-8 px-3"
              onClick={handleTTS}
              disabled={isTTSLoading && !isPlayingTTS}
            >
              {isTTSLoading && !isPlayingTTS ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" />연결 중...</>
              ) : isPlayingTTS ? (
                <><VolumeX className="h-3.5 w-3.5" />중지</>
              ) : (
                <><Volume2 className="h-3.5 w-3.5" />듣기</>
              )}
            </Button>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-2 overflow-y-auto flex-1">
          <div className="rounded-2xl bg-muted/60 border border-success/40 p-4">
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">{cleanText}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 pb-6 pt-2">
          <Button
            variant="default"
            className="flex-1 gap-1.5 rounded-full h-10"
            onClick={() => { handleClose(); onOpenChat(); }}
          >
            <Mic className="h-4 w-4" />
            {secretaryName}와 대화하기
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
