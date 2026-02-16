import { useEffect, useRef, useMemo, useState } from "react";
import { QuotaExhaustedModal } from "@/components/chat/QuotaExhaustedModal";
import { Button } from "@/components/ui/button";
import { X, Mic, Sparkles, MessageCircle, Loader2, AlertCircle, MapPin, Star } from "lucide-react";
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
    quota,
  } = useVoiceAgent();

  

  const secretaryName = profile?.secretary_name || "김비서";
  const secretaryAvatarUrl = profile?.secretary_avatar_url || null;

  // 오버레이가 열릴 때 자동 세션 시작, 닫힐 때 세션 종료
  const wasOpenRef = useRef(isOpen);
  const endSessionRef = useRef(endSession);
  const startSessionRef = useRef(startSession);
  endSessionRef.current = endSession;
  startSessionRef.current = startSession;

  const [showQuotaModal, setShowQuotaModal] = useState(false);

  useEffect(() => {
    if (!wasOpenRef.current && isOpen && !isActive) {
      // 할당량 소진 시 세션 시작 대신 모달 표시
      if (quota && quota.remaining <= 0) {
        setShowQuotaModal(true);
      } else {
        startSessionRef.current();
      }
    }
    if (wasOpenRef.current && !isOpen) {
      endSessionRef.current();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, isActive, quota]);

  // 컴포넌트 언마운트 시 세션 강제 종료
  useEffect(() => {
    return () => {
      endSessionRef.current();
    };
  }, []);

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
    if (!isActive) return "저를 눌러 대화를 시작하세요!";
    return "준비 중...";
  };

  return (
    <>
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
            <p className="text-xs text-white/70">
              {quota ? `오늘 ${quota.remaining}/${quota.limit}회 남음` : "음성 대화"}
            </p>
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
                ) : secretaryAvatarUrl ? (
                  <img src={secretaryAvatarUrl} alt={secretaryName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <Sparkles className="h-12 w-12" />
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
                {/* 텍스트 요약 카드 (시각화 없을 때 리스트형 답변) */}
                {!lastMessage.visualization && lastMessage.role === "agent" && (
                  <TextSummaryCards text={lastMessage.text} />
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

    <QuotaExhaustedModal
      open={showQuotaModal}
      onClose={() => {
        setShowQuotaModal(false);
        closeVoice();
      }}
      secretaryName={secretaryName}
      secretaryAvatarUrl={secretaryAvatarUrl}
    />
    </>
  );
}

// --- 텍스트 요약 카드 ---
interface ParsedItem {
  title: string;
  description: string;
}

function parseListItems(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];

  // 1) 숫자 번호 패턴: "1. 타이틀 - 설명"
  const numbered = text.match(/\d+[.)]\s*([^\n]+)/g);
  if (numbered && numbered.length >= 2) {
    for (const line of numbered) {
      const cleaned = line.replace(/^\d+[.)]\s*/, "").trim();
      const sepMatch = cleaned.match(/^([^:\-,–]+)\s*[:\-–,]\s*(.+)$/);
      if (sepMatch) {
        items.push({ title: sepMatch[1].trim(), description: sepMatch[2].trim() });
      } else {
        items.push({ title: cleaned, description: "" });
      }
    }
    return items.slice(0, 5);
  }

  // 2) 순서형 패턴: "첫 번째는 X이에요", "두 번째는 X입니다", "마지막으로 X"
  const ordinalRegex = /(?:첫\s*번째|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째|마지막(?:으로)?(?:\s*(?:세|네|다섯)\s*번째)?)[는은]\s*([^.!?]+?)[이가에](?:에요|예요|입니다|랍니다|거든요|고요|요)/g;
  const ordinalMatches = [...text.matchAll(ordinalRegex)];
  if (ordinalMatches.length >= 2) {
    for (const m of ordinalMatches) {
      const rawName = m[1].trim();
      // 이름 뒤 문장에서 설명 추출
      const afterIdx = (m.index ?? 0) + m[0].length;
      const afterText = text.slice(afterIdx);
      const descMatch = afterText.match(/^[.\s]*([^.!?\n]{0,100}[.!?]?)/);
      let desc = descMatch ? descMatch[1].trim() : "";
      desc = desc.replace(/^\s*[,，]\s*/, "");
      items.push({ title: rawName, description: desc });
    }
    return items.slice(0, 5);
  }

  // 3) 따옴표로 감싼 이름 추출: '마구로센', "스시오마카세" 등
  const quoted = [...text.matchAll(/[''""]([^''""\n]{2,20})[''""](?:[을를이가은는도의에서]|\s)/g)];
  if (quoted.length > 0) {
    for (const m of quoted) {
      const name = m[1].trim();
      const afterIdx = (m.index ?? 0) + m[0].length;
      const afterText = text.slice(afterIdx);
      const descMatch = afterText.match(/^([^.!?\n]{0,80}[.!?]?)/);
      const desc = descMatch ? descMatch[1].trim().replace(/^[을를이가은는도의에서]\s*/, "") : "";
      items.push({ title: name, description: desc });
    }
    return items.slice(0, 5);
  }

  // 4) 고유명사 + 장소 접미사: "스시오마카세 레스토랑은 ..."
  // 일반 명사(맛집, 좋은 레스토랑 등)를 제외하기 위해 고유명사 패턴 적용
  const placeSuffix = "(?:레스토랑|식당|카페|전문점|베이커리|비스트로|스시야|초밥집|횟집|고깃집)";
  const placeRegex = new RegExp(`([가-힣A-Za-z0-9]{2,12}\\s+${placeSuffix}|[A-Za-z][A-Za-z가-힣0-9\\s]{1,14}${placeSuffix})(?:[은는이가도을를에]|\\s)([^.!?\\n]{0,80}[.!?]?)`, "g");
  const placeMatches = [...text.matchAll(placeRegex)];
  // 일반 명사 필터 (역삼동 맛집, 좋은 레스토랑, 분위기 좋은 식당 등 제외)
  const genericTerms = /^(역삼동|강남|홍대|이태원|잠실|센트럴|좋은|유명한|인기|분위기)\s*(맛집|레스토랑|식당|카페)$/;
  const filtered = placeMatches.filter(m => !genericTerms.test(m[1].trim()));
  if (filtered.length > 0) {
    for (const m of filtered) {
      const name = m[1].trim();
      let desc = m[2].trim().replace(/^[은는이가도을를에서]\s*/, "");
      desc = desc.replace(/^\s*[,，]\s*/, "");
      items.push({ title: name, description: desc });
    }
    return items.slice(0, 5);
  }

  // 5) "추천" + 장소/가게 이름 패턴
  const recommendMatch = text.match(/(?:추천[^.]*?)\s+([가-힣A-Za-z0-9]{2,15})[을를이가은는]/);
  if (recommendMatch) {
    const name = recommendMatch[1];
    const descParts: string[] = [];
    const features = text.match(/(?:신선|맛있|분위기|가성비|인기|유명|깔끔|친절|특별)[^.!?]{0,30}[.!?]?/g);
    if (features) descParts.push(...features.slice(0, 2));
    items.push({ title: name, description: descParts.join(" ").trim() });
    return items;
  }

  return [];
}

function TextSummaryCards({ text }: { text: string }) {
  const items = useMemo(() => parseListItems(text), [text]);
  if (items.length < 1) return null;

  return (
    <div className="mt-3 w-full max-w-[85%] flex flex-col gap-2 animate-fade-in">
      {items.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl bg-white/15 backdrop-blur-sm px-4 py-3"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-white text-xs font-bold mt-0.5">
            {i + 1}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white leading-snug">{item.title}</p>
            {item.description && (
              <p className="text-xs text-white/70 mt-0.5 leading-relaxed">{item.description}</p>
            )}
          </div>
        </div>
      ))}
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
