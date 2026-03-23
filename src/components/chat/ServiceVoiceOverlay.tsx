import { useEffect, useMemo, useRef } from "react";
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
    interruptSpeaking,
  } = useServiceVoiceAgent(isVoiceOpen);

  const wasOpenRef = useRef(isVoiceOpen);
  const startSessionRef = useRef(startSession);
  const endSessionRef = useRef(endSession);

  startSessionRef.current = startSession;
  endSessionRef.current = endSession;

  useEffect(() => {
    if (!wasOpenRef.current && isVoiceOpen) {
      void startSessionRef.current();
    }

    if (wasOpenRef.current && !isVoiceOpen) {
      void endSessionRef.current();
    }

    wasOpenRef.current = isVoiceOpen;
  }, [isVoiceOpen]);

  useEffect(() => {
    return () => {
      void endSessionRef.current();
    };
  }, []);

  const faqTags = useMemo(() => faqs.slice(0, 3).map((faq) => faq.question), [faqs]);

  const handleMicClick = () => {
    if (isProcessing) return;

    if (isActive || isConnecting) {
      void endSession();
      return;
    }

    resetPermission();
    void startSession();
  };

  const handleRetry = () => {
    resetPermission();
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

  const statusText = useMemo(() => {
    if (permissionDenied) return "마이크 권한이 필요합니다";
    if (isConnecting) return "연결하고 있어요...";
    if (isProcessing) return "안내 내용을 확인 중...";
    if (isSpeaking) return "김비서가 답변 중...";
    if (isListening) return "듣고 있어요...";
    if (status === "idle") return "버튼을 눌러 서비스를 음성으로 안내받아보세요";
    return "준비 중...";
  }, [isConnecting, isListening, isProcessing, isSpeaking, permissionDenied, status]);

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
              onClick={handleRetry}
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
            >
              다시 시도
            </Button>
          </div>
        ) : (
          <>
            {transcript ? (
              <div className="mb-6 max-w-xs animate-fade-in text-center">
                <p className="mb-1 text-sm text-white/60">내가 말한 내용</p>
                <p className="text-lg font-medium text-white">{transcript}</p>
              </div>
            ) : null}

            <div className="relative mb-8">
              {!isActive && !isConnecting ? (
                <>
                  <div className="absolute inset-[-12px] animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full border-2 border-white/30" />
                  <div
                    className="absolute inset-[-24px] animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full border border-white/20"
                    style={{ animationDelay: "0.6s" }}
                  />
                </>
              ) : null}

              {isListening ? (
                <>
                  <div className="absolute inset-0 animate-ping rounded-full bg-white/20" style={{ animationDuration: "1.5s" }} />
                  <div className="absolute inset-[-20px] animate-pulse rounded-full bg-white/10" />
                </>
              ) : null}

              {isSpeaking ? (
                <>
                  <div className="absolute inset-[-10px] animate-pulse rounded-full bg-white/15" />
                  <div
                    className="absolute inset-[-25px] animate-pulse rounded-full bg-white/10"
                    style={{ animationDelay: "0.2s" }}
                  />
                </>
              ) : null}

              <button
                onClick={handleMicClick}
                disabled={isProcessing}
                className={cn(
                  "relative z-10 flex h-32 w-32 items-center justify-center rounded-full transition-all duration-300 overflow-hidden",
                  isConnecting
                    ? "bg-white/30"
                    : isListening
                      ? "scale-110 bg-white shadow-2xl"
                      : isSpeaking
                        ? "bg-white/40"
                        : isProcessing
                          ? "cursor-wait bg-white/30"
                          : "bg-white/20 hover:scale-105 hover:bg-white/30"
                )}
              >
                {isConnecting ? (
                  <Loader2 className="h-12 w-12 animate-spin text-white" />
                ) : (
                  <img
                    src="/images/icc-5.webp"
                    alt="김비서"
                    className={cn(
                      "h-20 w-20 object-contain",
                      isListening && "animate-pulse"
                    )}
                  />
                )}
              </button>
            </div>

            <p className="mb-4 text-sm text-white/80">{statusText}</p>

            {(status === "idle" || isListening) ? (
              <div className="mb-4 flex max-w-sm flex-wrap justify-center gap-2">
                {faqLoading
                  ? Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="h-8 w-24 animate-pulse rounded-full bg-white/10" />
                    ))
                  : faqTags.map((question) => (
                      <button
                        key={question}
                        onClick={() => handleFaqClick(question)}
                        disabled={!isActive || isConnecting || isProcessing}
                        className="rounded-full bg-white/20 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        #{question}
                      </button>
                    ))}
              </div>
            ) : null}

            {response ? (
              <div className="mt-6 max-w-sm animate-fade-in text-center">
                <div className="rounded-2xl bg-white/20 px-6 py-4 backdrop-blur-sm">
                  <p className="leading-relaxed text-white">{response}</p>
                </div>
              </div>
            ) : null}
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