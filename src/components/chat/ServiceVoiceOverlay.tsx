import { useEffect, useRef } from "react";
import { AlertCircle, Loader2, MessageCircle, Mic, MicOff, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useServiceChat } from "@/contexts/ServiceChatContext";
import { useServiceFAQ } from "@/hooks/useServiceFAQ";
import { useServiceVoiceAgent } from "@/hooks/useServiceVoiceAgent";

export function ServiceVoiceOverlay() {
  const { isVoiceOpen, closeVoice, switchToChat } = useServiceChat();
  const { faqs, isLoading: faqLoading } = useServiceFAQ();
  const {
    status,
    isActive,
    isConnecting,
    isListening,
    isSpeaking,
    isProcessing,
    transcript,
    response,
    permissionDenied,
    startSession,
    endSession,
    resetPermission,
    sendTextDirectly,
  } = useServiceVoiceAgent(isVoiceOpen);

  const wasOpenRef = useRef(isVoiceOpen);

  useEffect(() => {
    if (!wasOpenRef.current && isVoiceOpen && !isActive) {
      void startSession();
    }

    if (wasOpenRef.current && !isVoiceOpen) {
      void endSession();
    }

    wasOpenRef.current = isVoiceOpen;
  }, [endSession, isActive, isVoiceOpen, startSession]);

  useEffect(() => {
    return () => {
      void endSession();
    };
  }, [endSession]);

  const handleMicClick = () => {
    if (isProcessing) return;

    if (isActive) {
      void endSession();
      return;
    }

    void startSession();
  };

  const handleClose = () => {
    resetPermission();
    closeVoice();
  };

  const handleSwitchToChat = () => {
    void endSession();
    switchToChat();
  };

  const handleFaqClick = (question: string) => {
    if (!isActive || isConnecting || isProcessing) return;
    sendTextDirectly(question);
  };

  const getStatusText = () => {
    if (permissionDenied) return "마이크 권한이 필요합니다";
    if (isConnecting) return "연결하고 있어요...";
    if (isProcessing) return "안내 내용을 확인 중...";
    if (isSpeaking) return "김비서가 답변 중...";
    if (isListening) return "듣고 있어요...";
    return "버튼을 눌러 서비스를 음성으로 안내받아보세요";
  };

  const faqTags = faqs.slice(0, 7).map((faq) => faq.question);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-primary transition-all duration-300",
        isVoiceOpen ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
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
          <Button variant="ghost" size="icon" onClick={handleSwitchToChat} className="text-white hover:bg-white/20">
            <MessageCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {permissionDenied ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20">
              <AlertCircle className="h-10 w-10 text-white" />
            </div>
            <p className="max-w-xs text-sm text-white/80">
              브라우저에서 마이크 권한을 허용하신 뒤 다시 시도해주세요.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                resetPermission();
                void startSession();
              }}
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <>
            {transcript && (
              <div className="mb-6 max-w-xs text-center animate-fade-in">
                <p className="mb-1 text-sm text-white/60">내가 말한 내용</p>
                <p className="text-lg font-medium text-white">{transcript}</p>
              </div>
            )}

            <div className="relative mb-8">
              {!isActive && !isConnecting && (
                <>
                  <div className="absolute inset-[-12px] rounded-full border-2 border-white/30 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
                  <div className="absolute inset-[-24px] rounded-full border border-white/20 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]" style={{ animationDelay: "0.6s" }} />
                </>
              )}

              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-white/20 animate-ping" style={{ animationDuration: "1.5s" }} />
                  <div className="absolute inset-[-20px] rounded-full bg-white/10 animate-pulse" />
                </>
              )}

              {isSpeaking && (
                <>
                  <div className="absolute inset-[-10px] rounded-full bg-white/15 animate-pulse" />
                  <div className="absolute inset-[-25px] rounded-full bg-white/10 animate-pulse" style={{ animationDelay: "0.2s" }} />
                </>
              )}

              <button
                onClick={handleMicClick}
                disabled={isProcessing}
                className={cn(
                  "relative z-10 flex h-32 w-32 items-center justify-center rounded-full transition-all duration-300",
                  isConnecting
                    ? "bg-white/30 text-white"
                    : isListening
                      ? "scale-110 bg-white text-primary shadow-2xl"
                      : isSpeaking
                        ? "bg-white/40 text-white"
                        : isProcessing
                          ? "cursor-wait bg-white/30 text-white"
                          : "bg-white/20 text-white hover:scale-105 hover:bg-white/30"
                )}
              >
                {isConnecting ? (
                  <Loader2 className="h-12 w-12 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-12 w-12" />
                ) : (
                  <Mic className="h-12 w-12" />
                )}
              </button>
            </div>

            <p className="mb-4 text-sm text-white/80">{getStatusText()}</p>

            {(status === "idle" || isListening) && (
              <div className="mb-4 flex max-w-sm flex-wrap justify-center gap-2">
                {faqLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
                  ))
                ) : (
                  faqTags.map((question) => (
                    <button
                      key={question}
                      onClick={() => handleFaqClick(question)}
                      disabled={!isActive || isConnecting || isProcessing}
                      className="rounded-full bg-white/20 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      #{question}
                    </button>
                  ))
                )}
              </div>
            )}

            {response && (
              <div className="mt-6 max-w-sm text-center animate-fade-in">
                <div className="rounded-2xl bg-white/20 px-6 py-4 backdrop-blur-sm">
                  <p className="leading-relaxed text-white">{response}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="pb-[calc(env(safe-area-inset-bottom)+24px)] text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSwitchToChat}
          className="text-white/70 hover:bg-white/10 hover:text-white"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          텍스트로 문의하기
        </Button>
      </div>
    </div>
  );
}