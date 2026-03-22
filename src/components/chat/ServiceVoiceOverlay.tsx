import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Mic, MicOff, Sparkles, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServiceChat } from "@/contexts/ServiceChatContext";
import { useServiceFAQ } from "@/hooks/useServiceFAQ";
import { supabase } from "@/integrations/supabase/client";

type VoiceStatus = "idle" | "listening" | "processing" | "speaking";

// 마크다운 기호 제거 (TTS용)
function stripMarkdown(text: string): string {
  return text
    .replace(/[*_~`#>\-\[\]()!]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim();
}

export function ServiceVoiceOverlay() {
  const { isVoiceOpen, closeVoice, switchToChat } = useServiceChat();
  const { faqs, isLoading: faqLoading } = useServiceFAQ();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
  }, []);

  // TTS 재생
  const speakText = useCallback(async (text: string) => {
    try {
      const cleanText = stripMarkdown(text);
      if (!cleanText) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: cleanText, gender: "female" }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob.size || !blob.type.startsWith("audio/")) {
        throw new Error(`Invalid audio response: ${blob.type || "unknown"}`);
      }

      const url = URL.createObjectURL(blob);
      cleanupAudio();
      audioUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        cleanupAudio();
        setStatus("idle");
      };

      audio.onerror = () => {
        cleanupAudio();
        setStatus("idle");
      };

      await audio.play();
    } catch (e) {
      console.error("TTS playback error:", e);
      cleanupAudio();
      // TTS 실패해도 4초 후 idle로
      setTimeout(() => setStatus("idle"), 4000);
    }
  }, [cleanupAudio]);

  const askServiceChat = useCallback(async (question: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("service-chat", {
        body: {
          message: question,
          conversationHistory: conversationHistory.slice(-10),
        },
      });

      if (error) throw error;

      const answer = data?.response || "죄송합니다, 응답을 생성하지 못했습니다.";

      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: answer },
      ]);

      return answer;
    } catch (e) {
      console.error("Service voice chat error:", e);
      return "죄송합니다, 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
    }
  }, [conversationHistory]);

  const handleTagClick = useCallback(async (question: string) => {
    setTranscript(question);
    setStatus("processing");

    const answer = await askServiceChat(question);
    setResponse(answer);
    setStatus("speaking");

    // TTS로 음성 재생
    await speakText(answer);
  }, [askServiceChat, speakText]);

  // 데모용 마이크
  const handleMicClick = useCallback(() => {
    if (status === "idle") {
      setStatus("listening");
      setTranscript("");
      setResponse("");

      setTimeout(async () => {
        const demoQuestion = "김비서가 뭐야?";
        setTranscript(demoQuestion);
        setStatus("processing");

        const answer = await askServiceChat(demoQuestion);
        setResponse(answer);
        setStatus("speaking");

        await speakText(answer);
      }, 3000);
    } else if (status === "listening") {
      setStatus("idle");
    }
  }, [status, askServiceChat, speakText]);

  // 오버레이 닫힐 때 정리
  useEffect(() => {
    if (!isVoiceOpen) {
      setStatus("idle");
      setTranscript("");
      setResponse("");
      cleanupAudio();
    }
  }, [cleanupAudio, isVoiceOpen]);

  useEffect(() => {
    return () => cleanupAudio();
  }, [cleanupAudio]);

  const getStatusText = () => {
    switch (status) {
      case "listening": return "듣고 있어요...";
      case "processing": return "처리 중...";
      case "speaking": return "김비서가 답변 중...";
      default: return "마이크를 눌러 말씀하세요";
    }
  };

  const faqTags = faqs.slice(0, 7).map(f => f.question);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-primary transition-all duration-300",
        isVoiceOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">김비서 안내</h3>
            <p className="text-xs text-white/70">서비스 문의</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={switchToChat} className="text-white hover:bg-white/20">
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={closeVoice} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {transcript && (
          <div className="mb-6 max-w-xs text-center animate-fade-in">
            <p className="text-sm text-white/60 mb-1">내가 말한 내용</p>
            <p className="text-lg text-white font-medium">{transcript}</p>
          </div>
        )}

        <div className="relative mb-8">
          {status === "listening" && (
            <>
              <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute inset-[-20px] rounded-full bg-white/10 animate-pulse" />
            </>
          )}
          {status === "speaking" && (
            <>
              <div className="absolute inset-[-10px] rounded-full bg-white/15 animate-pulse" />
              <div className="absolute inset-[-25px] rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '0.2s' }} />
            </>
          )}

          <button
            onClick={handleMicClick}
            disabled={status === "processing" || status === "speaking"}
            className={cn(
              "relative z-10 flex h-32 w-32 items-center justify-center rounded-full transition-all duration-300",
              status === "listening"
                ? "bg-white text-primary scale-110 shadow-2xl"
                : status === "processing" || status === "speaking"
                ? "bg-white/30 text-white cursor-not-allowed"
                : "bg-white/20 text-white hover:bg-white/30 hover:scale-105"
            )}
          >
            {status === "listening" ? (
              <MicOff className="h-12 w-12" />
            ) : status === "processing" ? (
              <Sparkles className="h-12 w-12 animate-spin" />
            ) : (
              <Mic className="h-12 w-12" />
            )}
          </button>
        </div>

        <p className="text-white/80 text-sm mb-4">{getStatusText()}</p>

        {status === "idle" && (
          <div className="flex flex-wrap justify-center gap-2 max-w-sm mb-4">
            {faqLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 w-24 rounded-full bg-white/10 animate-pulse" />
              ))
            ) : (
              faqTags.map((q) => (
                <button
                  key={q}
                  onClick={() => handleTagClick(q)}
                  className="px-3 py-1.5 rounded-full bg-white/20 text-white/90 text-sm hover:bg-white/30 transition-colors"
                >
                  #{q}
                </button>
              ))
            )}
          </div>
        )}

        {status === "listening" && (
          <div className="flex items-center gap-1 h-8">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-white/60 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 24 + 8}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.5s',
                }}
              />
            ))}
          </div>
        )}

        {response && (
          <div className="mt-6 max-w-sm text-center animate-fade-in">
            <div className="rounded-2xl bg-white/20 backdrop-blur-sm px-6 py-4">
              <p className="text-white leading-relaxed">{response}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+24px)] text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={switchToChat}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          텍스트로 문의하기
        </Button>
      </div>
    </div>
  );
}
