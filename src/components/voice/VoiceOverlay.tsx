import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Mic, MicOff, Sparkles, MessageCircle, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVoice } from "@/contexts/VoiceContext";
import { useChat } from "@/contexts/ChatContext";
import { useElevenLabsConversation } from "@/hooks/useElevenLabsConversation";
import { useProfile } from "@/hooks/useProfile";
import { ScrollArea } from "@/components/ui/scroll-area";

export function VoiceOverlay() {
  const { isOpen, closeVoice } = useVoice();
  const { openChat } = useChat();
  const { profile } = useProfile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    status,
    isSpeaking,
    isConnecting,
    messages,
    permissionDenied,
    lastError,
    startSession,
    endSession,
    resetPermission,
  } = useElevenLabsConversation();

  const secretaryName = profile?.secretary_name || "김비서";
  const isConnected = status === "connected";

  // 오버레이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      if (isConnected) {
        endSession();
      }
    }
  }, [isOpen, isConnected, endSession]);

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleClose = () => {
    if (isConnected) {
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

  const getStatusText = () => {
    if (permissionDenied) return "마이크 권한이 필요합니다";
    if (isConnecting) return "연결 중...";
    if (!isConnected) return "버튼을 눌러 시작하세요";
    if (isSpeaking) return `${secretaryName}가 말하고 있어요...`;
    return "듣고 있어요...";
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

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-3 py-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 animate-fade-in",
                msg.role === "user"
                  ? "ml-auto bg-white text-primary"
                  : "mr-auto bg-white/20 text-white"
              )}
            >
              <p className="text-sm">{msg.text}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Voice Status Area */}
      <div className="flex flex-col items-center py-8 px-6">
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
            {/* 음성 시각화 */}
            <div className="relative mb-6">
              {/* 펄스 애니메이션 */}
              {isConnected && !isSpeaking && (
                <>
                  <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                  <div className="absolute inset-[-20px] rounded-full bg-white/10 animate-pulse" />
                </>
              )}
              {isSpeaking && (
                <>
                  <div className="absolute inset-[-10px] rounded-full bg-white/15 animate-pulse" />
                  <div className="absolute inset-[-25px] rounded-full bg-white/10 animate-pulse" style={{ animationDelay: '0.2s' }} />
                </>
              )}
              
              {/* 상태 아이콘 */}
              <div
                className={cn(
                  "relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-all duration-300",
                  isConnecting
                    ? "bg-white/30 text-white"
                    : isConnected && !isSpeaking
                    ? "bg-white text-primary scale-110 shadow-2xl"
                    : isConnected && isSpeaking
                    ? "bg-white/30 text-white"
                    : "bg-white/20 text-white"
                )}
              >
                {isConnecting ? (
                  <Loader2 className="h-10 w-10 animate-spin" />
                ) : isConnected && !isSpeaking ? (
                  <Mic className="h-10 w-10" />
                ) : isSpeaking ? (
                  <Sparkles className="h-10 w-10 animate-pulse" />
                ) : (
                  <MicOff className="h-10 w-10" />
                )}
              </div>
            </div>

            {/* 상태 텍스트 */}
            <p className="text-white/80 text-sm mb-2">{getStatusText()}</p>

            {lastError && !isConnected && (
              <p className="text-white/60 text-xs text-center max-w-xs mb-2">
                {lastError}
              </p>
            )}

            {/* 음파 애니메이션 (듣는 중) */}
            {isConnected && !isSpeaking && (
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
          </>
        )}
      </div>

      {/* Footer */}
      <div className="pb-[calc(env(safe-area-inset-bottom)+80px)] px-6 flex flex-col items-center gap-3">
        {!permissionDenied && !isConnected && (
          <Button
            variant="outline"
            onClick={startSession}
            disabled={isConnecting}
            className="border-white/30 text-white bg-white/10 hover:bg-white/20"
          >
            음성 시작
          </Button>
        )}
        {isConnected && (
          <Button
            variant="outline"
            onClick={endSession}
            className="border-white/30 text-white bg-white/10 hover:bg-white/20"
          >
            대화 종료
          </Button>
        )}
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
