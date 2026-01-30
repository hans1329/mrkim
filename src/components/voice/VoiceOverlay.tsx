import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Mic, MicOff, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoice } from "@/contexts/VoiceContext";

type VoiceStatus = "idle" | "listening" | "processing" | "speaking";

export function VoiceOverlay() {
  const { isOpen, closeVoice } = useVoice();
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");

  // 데모용 상태 시뮬레이션
  const handleMicClick = () => {
    if (status === "idle") {
      setStatus("listening");
      setTranscript("");
      setResponse("");
      
      // 시뮬레이션: 3초 후 인식 완료
      setTimeout(() => {
        setTranscript("오늘 매출 알려줘");
        setStatus("processing");
        
        // 처리 후 응답
        setTimeout(() => {
          setResponse("오늘 총 매출은 2,340,000원이며, 순이익은 520,000원입니다.");
          setStatus("speaking");
          
          // 응답 후 대기
          setTimeout(() => {
            setStatus("idle");
          }, 3000);
        }, 1000);
      }, 3000);
    } else if (status === "listening") {
      setStatus("idle");
    }
  };

  // 오버레이가 닫힐 때 상태 리셋
  useEffect(() => {
    if (!isOpen) {
      setStatus("idle");
      setTranscript("");
      setResponse("");
    }
  }, [isOpen]);

  const getStatusText = () => {
    switch (status) {
      case "listening":
        return "듣고 있어요...";
      case "processing":
        return "처리 중...";
      case "speaking":
        return "김비서가 답변 중...";
      default:
        return "마이크를 눌러 말씀하세요";
    }
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-primary via-primary/90 to-primary/80 transition-all duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">김비서</h3>
            <p className="text-xs text-white/70">음성 대화</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeVoice}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* 사용자 발화 */}
        {transcript && (
          <div className="mb-6 max-w-xs text-center animate-fade-in">
            <p className="text-sm text-white/60 mb-1">내가 말한 내용</p>
            <p className="text-lg text-white font-medium">{transcript}</p>
          </div>
        )}

        {/* 음성 시각화 영역 */}
        <div className="relative mb-8">
          {/* 외곽 펄스 애니메이션 */}
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
          
          {/* 메인 마이크 버튼 */}
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

        {/* 상태 텍스트 */}
        <p className="text-white/80 text-sm mb-4">{getStatusText()}</p>

        {/* 음파 애니메이션 (듣는 중) */}
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

        {/* AI 응답 */}
        {response && (
          <div className="mt-6 max-w-sm text-center animate-fade-in">
            <div className="rounded-2xl bg-white/20 backdrop-blur-sm px-6 py-4">
              <p className="text-white leading-relaxed">{response}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer 힌트 */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+24px)] text-center">
        <p className="text-xs text-white/50">
          {status === "idle" ? "탭하여 음성 대화 시작" : ""}
        </p>
      </div>
    </div>
  );
}
