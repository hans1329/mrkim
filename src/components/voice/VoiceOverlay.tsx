import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Mic, MicOff, Sparkles, MessageCircle, Loader2, AlertCircle } from "lucide-react";
import { VoiceDataVisualization } from "@/components/chat/DataVisualization";
import { cn } from "@/lib/utils";
import { useVoice } from "@/contexts/VoiceContext";
import { useChat } from "@/contexts/ChatContext";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useProfile } from "@/hooks/useProfile";

export function VoiceOverlay() {
  const { isOpen, closeVoice } = useVoice();
  const { openChat } = useChat();
  const { profile } = useProfile();
  
  const {
    status,
    isSpeaking,
    isListening,
    isProcessing,
    isActive,
    isTTSPreparing,
    lastMessage,
    permissionDenied,
    lastError,
    startSession,
    endSession,
    interruptAndListen,
    resetPermission,
    sendTextDirectly,
  } = useVoiceAgent();

  const secretaryName = profile?.secretary_name || "김비서";

  // 오버레이가 닫힐 때 세션 종료
  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    if (wasOpenRef.current && !isOpen && isActive) {
      endSession();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, isActive, endSession]);

  // (removed: no longer need message scroll)

  const handleClose = () => {
    if (isActive) {
      endSession();
    }
    resetPermission();
    closeVoice();
  };

  const handleRetry = () => {
    resetPermission();
    startSession();
  };

  const handleSwitchToChat = () => {
    handleClose();
    openChat();
  };

  const handleMicClick = () => {
    if (isProcessing) return;
    
    // TTS 재생 중이면 중단하고 듣기 모드로 전환
    if (isSpeaking) {
      interruptAndListen();
      return;
    }
    
    if (isActive) {
      endSession();
    } else {
      startSession();
    }
  };

  const getStatusText = () => {
    if (permissionDenied) return "마이크 권한이 필요합니다";
    if (isProcessing) return "답변을 준비하고 있어요...";
    if (isSpeaking && isTTSPreparing) return "잠시만요!";
    if (isSpeaking) return `${secretaryName}가 말하고 있어요...`;
    if (isListening) return "듣고 있어요...";
    if (!isActive) return "버튼을 눌러 시작하세요";
    return "준비 중...";
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
            <h3 className="font-semibold text-white">{secretaryName}</h3>
            <p className="text-xs text-white/70">음성 대화</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
        {/* 권한 거부 상태 */}
        {permissionDenied ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20">
              <AlertCircle className="h-10 w-10 text-white" />
            </div>
            <p className="text-white/80 text-sm text-center max-w-xs">
              마이크 권한이 필요합니다.<br />
              브라우저 설정에서 마이크 접근을 허용한 후 다시 시도해주세요.
            </p>
            <Button
              variant="outline"
              onClick={handleRetry}
              className="border-white/30 text-white bg-white/10 hover:bg-white/20"
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <>
            {/* 마이크 버튼 */}
            <div className="relative mb-6">
              {/* 펄스 애니메이션 - 듣는 중 */}
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                  <div className="absolute inset-[-20px] rounded-full bg-white/10 animate-pulse" />
                </>
              )}
              {/* 펄스 애니메이션 - 말하는 중 (TTS 준비 중에는 다른 애니메이션) */}
              {isSpeaking && !isTTSPreparing && (
                <>
                  <div className="absolute inset-[-10px] rounded-full bg-white/15 animate-pulse" />
                  <div className="absolute inset-[-25px] rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '0.2s' }} />
                </>
              )}
              {/* TTS 준비 중 애니메이션 - 점진적 로딩 효과 */}
              {isSpeaking && isTTSPreparing && (
                <div className="absolute inset-[-15px] rounded-full border-2 border-white/30 border-t-white/80 animate-spin" style={{ animationDuration: '1.2s' }} />
              )}
              
              <button
                onClick={handleMicClick}
                disabled={isProcessing}
                className={cn(
                  "relative z-10 flex h-28 w-28 items-center justify-center rounded-full transition-all duration-300 cursor-pointer",
                  isProcessing
                    ? "bg-white/30 text-white cursor-wait"
                    : isSpeaking
                    ? "bg-white/40 text-white hover:bg-white/50 active:bg-white/60"
                    : isListening
                    ? "bg-white text-primary scale-110 shadow-2xl hover:scale-105 active:scale-100"
                    : isActive
                    ? "bg-white/30 text-white hover:bg-white/40 active:bg-white/50"
                    : "bg-white/20 text-white hover:bg-white/30 hover:scale-105 active:scale-100"
                )}
              >
                {isProcessing ? (
                  <Loader2 className="h-12 w-12 animate-spin" />
                ) : isSpeaking && isTTSPreparing ? (
                  <Loader2 className="h-12 w-12 animate-spin opacity-70" />
                ) : isSpeaking ? (
                  <Sparkles className="h-12 w-12 animate-pulse" />
                ) : isListening ? (
                  <Mic className="h-12 w-12" />
                ) : (
                  <Mic className="h-12 w-12" />
                )}
              </button>
            </div>

            {/* 상태 텍스트 */}
            <p className="text-white/80 text-sm mb-2">{getStatusText()}</p>

            {lastError && !isActive && (
              <p className="text-white/60 text-xs text-center max-w-xs mb-2">
                {lastError}
              </p>
            )}

            {/* 음파 애니메이션 (듣는 중) */}
            {isListening && (
              <div className="flex items-center gap-1 h-6">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-white/60 rounded-full animate-pulse"
                    style={{
                      height: `${Math.random() * 16 + 8}px`,
                      animationDelay: `${i * 0.1}s`,
                      animationDuration: '0.5s',
                    }}
                  />
                ))}
              </div>
            )}

            {/* 마지막 메시지 (버튼 아래) */}
            {lastMessage && (
              <div className="mt-6 w-full flex flex-col items-center">
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-5 py-3 animate-fade-in",
                    lastMessage.role === "user"
                      ? "bg-white text-primary"
                      : "bg-white/20 text-white backdrop-blur-sm"
                  )}
                >
                  <p className="text-sm leading-relaxed">{lastMessage.text}</p>
                </div>
                {/* 시각화 데이터 */}
                {lastMessage.visualization && lastMessage.role === "agent" && (
                  <VoiceDataVisualization data={lastMessage.visualization} />
                )}
              </div>
            )}

            {/* 빠른 질문 제안 칩 */}
            {isActive && !isProcessing && !isSpeaking && (
              <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-sm">
                {[
                  "오늘 매출 알려줘",
                  "이번 달 지출 현황",
                  "직원 급여 정리해줘",
                  "세금 언제 내야 해?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendTextDirectly(suggestion)}
                    className="px-3 py-1.5 rounded-full bg-white/20 text-white/90 text-xs hover:bg-white/30 active:bg-white/40 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {/* 활성 상태에서 종료/중단 안내 */}
            {isActive && !isProcessing && (
              <p className="text-white/50 text-xs mt-4">
                {isSpeaking ? "마이크를 눌러 AI 발화를 중단할 수 있어요" : "마이크를 다시 누르면 종료됩니다"}
              </p>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+80px)] px-6 flex flex-col items-center gap-3">
        <Button
          variant="ghost"
          onClick={handleSwitchToChat}
          className="text-white/70 hover:text-white hover:bg-white/20 gap-2 border border-white/30"
        >
          <MessageCircle className="h-4 w-4" />
          텍스트로 대화하기
        </Button>
      </div>
    </div>
  );
}
