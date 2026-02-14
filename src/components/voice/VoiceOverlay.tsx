import { useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { X, Mic, Sparkles, MessageCircle, Loader2, AlertCircle } from "lucide-react";
import { VoiceDataVisualization } from "@/components/chat/DataVisualization";
import { cn, josa } from "@/lib/utils";
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
    isConnecting,
    isTTSPreparing,
    lastMessage,
    permissionDenied,
    lastError,
    volume,
    setVolume,
    startSession,
    endSession,
    interruptAndListen,
    resetPermission,
    sendTextDirectly,
  } = useVoiceAgent();

  

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryAvatarUrl = profile?.secretary_avatar_url || null;

  // 오버레이가 열릴 때 자동 세션 시작, 닫힐 때 세션 종료
  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    if (!wasOpenRef.current && isOpen && !isActive) {
      startSession();
    }
    // 닫힐 때 안전망: handleClose/handleSwitchToChat에서 이미 종료했어도 이중 호출 안전
    if (wasOpenRef.current && !isOpen) {
      endSession();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, isActive, endSession, startSession]);

  // 컴포넌트 언마운트 시 세션 강제 종료
  useEffect(() => {
    return () => {
      endSession();
    };
  }, [endSession]);

  // (removed: no longer need message scroll)

  const handleClose = async () => {
    // 연결 중이든 활성 상태든 무조건 세션 종료
    try {
      await endSession();
    } catch (e) {
      console.error("[VoiceOverlay] endSession error on close:", e);
    }
    resetPermission();
    closeVoice();
  };

  const handleRetry = () => {
    resetPermission();
    startSession();
  };

  const handleSwitchToChat = async () => {
    // 음성 세션을 확실히 종료한 후 채팅으로 전환
    try {
      await endSession();
    } catch (e) {
      console.error("[VoiceOverlay] endSession error on switch:", e);
    }
    resetPermission();
    closeVoice();
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
    if (isConnecting) return "연결하고 있어요...";
    if (isProcessing) return "데이터를 확인 중입니다...";
    if (isSpeaking && isTTSPreparing) return "잠시만요!";
    if (isSpeaking) return `${josa(secretaryName, "이/가")} 말하고 있어요...`;
    if (isListening) return "듣고 있어요...";
    if (!isActive) return "버튼을 눌러 시작하세요";
    return "준비 중...";
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-primary via-primary to-primary transition-all duration-300",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm overflow-hidden">
              {secretaryAvatarUrl ? (
                <img src={secretaryAvatarUrl} alt={secretaryName} className="h-full w-full object-cover" />
              ) : (
                <Sparkles className="h-5 w-5 text-white" />
              )}
            </div>
          <div>
            <h3 className="font-semibold text-white">{secretaryName}</h3>
            <p className="text-xs text-white/70">음성 대화</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwitchToChat}
            className="text-white hover:bg-white/20 gap-1.5"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">텍스트</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>



      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 relative overflow-y-auto pt-16">
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
              {/* TTS 준비 중 애니메이션 - isConnecting일 때는 절대 표시하지 않음 */}
              {!isConnecting && isSpeaking && isTTSPreparing && (
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
                {isConnecting ? (
                  <Loader2 className="h-12 w-12 animate-spin opacity-70" />
                ) : isProcessing ? (
                  secretaryAvatarUrl ? (
                    <div className="relative h-full w-full">
                      <img src={secretaryAvatarUrl} alt={secretaryName} className="h-full w-full rounded-full object-cover opacity-70" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                      </div>
                    </div>
                  ) : (
                    <Loader2 className="h-12 w-12 animate-spin" />
                  )
                ) : isSpeaking && isTTSPreparing ? (
                  <Loader2 className="h-12 w-12 animate-spin opacity-70" />
                ) : isSpeaking ? (
                  secretaryAvatarUrl ? (
                    <img src={secretaryAvatarUrl} alt={secretaryName} className="h-full w-full rounded-full object-cover animate-pulse" />
                  ) : (
                    <Sparkles className="h-12 w-12 animate-pulse" />
                  )
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

            {/* 빠른 질문 제안 칩 - AI 응답의 후속 질문 우선, 없으면 기본 제안 */}
            {isActive && !isProcessing && !isSpeaking && (
              <DynamicSuggestionChips
                lastMessage={lastMessage}
                onSelect={sendTextDirectly}
              />
            )}

            {/* 활성 상태에서 종료/중단 안내 */}
            {isActive && !isProcessing && (
              <p className="text-white/50 text-xs mt-4">
                {isSpeaking ? "마이크를 눌러 비서의 보고를 중단할 수 있어요" : "마이크를 다시 누르면 종료됩니다"}
              </p>
            )}
          </>
        )}
      </div>

    </div>
  );
}

// --- 동적 제안 칩 컴포넌트 ---
const DEFAULT_SUGGESTIONS = [
  "오늘 매출 알려줘",
  "이번 달 지출 현황",
  "직원 급여 정리해줘",
  "세금 언제 내야 해?",
];

/** AI 응답에서 후속 질문을 추출하여 제안 칩으로 변환 */
function extractFollowUpSuggestions(text: string): string[] {
  const suggestions: string[] = [];
  // 한국어 질문 패턴: ~할까요?, ~볼까요?, ~드릴까요?, ~있으세요?, ~싶으세요? 등
  const questionPattern = /([^.!?\n]*(?:할까요|볼까요|드릴까요|있으세요|싶으세요|알아볼까요|확인해볼까요|정리해드릴까요|비교해볼까요|알려드릴까요)\??)/g;
  let match;
  while ((match = questionPattern.exec(text)) !== null) {
    let q = match[1].trim();
    // "혹시", "그리고" 등 접속사 제거하고 핵심만 추출
    q = q.replace(/^(혹시|그리고|그런데|참고로|아,?\s*그리고)\s*/g, "").trim();
    // 질문을 명령형으로 변환: "수입 내역도 확인해볼까요?" -> "수입 내역 확인해줘"
    const imperative = convertToImperative(q);
    if (imperative && imperative.length >= 4 && imperative.length <= 30) {
      suggestions.push(imperative);
    }
  }
  return suggestions;
}

function convertToImperative(question: string): string {
  return question
    .replace(/\?$/, "")
    .replace(/도\s+/, " ")
    .replace(/확인해볼까요/, "확인해줘")
    .replace(/알아볼까요/, "알아봐줘")
    .replace(/정리해드릴까요/, "정리해줘")
    .replace(/비교해볼까요/, "비교해줘")
    .replace(/알려드릴까요/, "알려줘")
    .replace(/해볼까요/, "해줘")
    .replace(/할까요/, "해줘")
    .replace(/볼까요/, "봐줘")
    .replace(/드릴까요/, "해줘")
    .replace(/있으세요/, "알려줘")
    .replace(/싶으세요/, "해줘")
    .trim();
}

function DynamicSuggestionChips({
  lastMessage,
  onSelect,
}: {
  lastMessage: { role: string; text: string } | null;
  onSelect: (text: string) => void;
}) {
  const suggestions = useMemo(() => {
    if (lastMessage?.role === "agent" && lastMessage.text) {
      const extracted = extractFollowUpSuggestions(lastMessage.text);
      if (extracted.length > 0) {
        // 추출된 후속 질문 + 기본 제안 중 일부
        return [...extracted, ...DEFAULT_SUGGESTIONS.slice(0, 4 - extracted.length)];
      }
    }
    return DEFAULT_SUGGESTIONS;
  }, [lastMessage]);

  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2 max-w-sm">
      {suggestions.map((suggestion) => (
        <button
          key={suggestion}
          onClick={() => onSelect(suggestion)}
          className="px-3 py-1.5 rounded-full bg-white/20 text-white/90 text-xs hover:bg-white/30 active:bg-white/40 transition-colors"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
