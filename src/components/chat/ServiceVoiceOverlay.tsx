import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Mic, MicOff, Sparkles, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServiceChat } from "@/contexts/ServiceChatContext";

type VoiceStatus = "idle" | "listening" | "processing" | "speaking";

export function ServiceVoiceOverlay() {
  const { isVoiceOpen, closeVoice, switchToChat } = useServiceChat();
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
        setTranscript("김비서가 뭐야?");
        setStatus("processing");
        
        // 처리 후 응답
        setTimeout(() => {
          setResponse("김비서는 소상공인을 위한 AI 경영 비서입니다! 매출 관리, 직원 급여, 세금 신고까지 음성 명령 한 마디로 해결해드려요.");
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
    if (!isVoiceOpen) {
      setStatus("idle");
      setTranscript("");
      setResponse("");
    }
  }, [isVoiceOpen]);

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
          <Button
            variant="ghost"
            size="icon"
            onClick={switchToChat}
            className="text-white hover:bg-white/20"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={closeVoice}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
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

        {/* FAQ 해시태그 버튼 */}
        {status === "idle" && (
          <div className="flex flex-wrap justify-center gap-2 max-w-sm mb-4">
            {["#김비서가 뭐야?", "#뭘 해줄 수 있어?", "#어떻게 써?", "#얼마야?", "#왜 써야 해?", "#누가 쓰면 좋아?", "#무료로 써볼 수 있어?"].map((tag) => (
              <button
                key={tag}
                onClick={() => {
                  setTranscript(tag.replace("#", ""));
                  setStatus("processing");
                  setTimeout(() => {
                    const question = tag.replace("#", "");
                    let answer = "김비서에 대해 더 궁금한 점이 있으시면 말씀해주세요!";
                    if (question.includes("뭐야")) {
                      answer = "김비서는 소상공인을 위한 AI 경영 비서예요. 말 한마디로 매출, 세금, 직원 관리를 도와드려요!";
                    } else if (question.includes("해줄")) {
                      answer = "매출 분석, 세금 알림, 직원 급여 계산, 자동이체 관리 등 사업 운영 전반을 도와드려요.";
                    } else if (question.includes("어떻게")) {
                      answer = "계좌랑 카드만 연결하면 끝! 그 다음부턴 음성으로 물어보거나 명령하시면 돼요.";
                    } else if (question.includes("얼마")) {
                      answer = "월 29,000원부터 시작해요. 14일 무료 체험도 가능하고요!";
                    } else if (question.includes("왜")) {
                      answer = "복잡한 장부 정리, 세금 걱정 없이 본업에만 집중하실 수 있어요!";
                    } else if (question.includes("누가")) {
                      answer = "카페, 음식점, 소매점 등 매장을 운영하시는 사장님들께 딱이에요!";
                    } else if (question.includes("무료")) {
                      answer = "네! 14일간 모든 기능을 무료로 체험하실 수 있어요.";
                    }
                    setResponse(answer);
                    setStatus("speaking");
                    setTimeout(() => setStatus("idle"), 3000);
                  }, 800);
                }}
                className="px-3 py-1.5 rounded-full bg-white/20 text-white/90 text-sm hover:bg-white/30 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

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
