import { useRef, useEffect, useState, useCallback } from "react";
import { QuotaExhaustedModal } from "./QuotaExhaustedModal";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Bot, Send, X, MessageCircle, Sparkles, RotateCcw, History, Plus, Database, RefreshCw, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { DataVisualization } from "./DataVisualization";
import { useChat } from "@/contexts/ChatContext";
import { useAIChat, type SuggestedAction } from "@/hooks/useAIChat";
import { ChatSessionList } from "./ChatSessionList";
import { isToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const quickCommandGroups = [
  { label: "📊 매출/지출", commands: ["오늘 매출 얼마야?", "이번 달 지출 현황", "지난달 매출 비교"] },
  { label: "💰 세금", commands: ["부가세 현황 확인", "세금계산서 현황", "이번 분기 부가세"] },
  { label: "👥 직원", commands: ["직원 목록 보여줘", "이번 달 급여 총액", "직원 현황 요약"] },
  { label: "🏦 자금", commands: ["예치금 현황", "적금 현황 확인", "자동이체 목록"] },
  { label: "📋 종합", commands: ["이번 달 경영 현황 알려줘", "할 일 뭐 있어?", "오늘 브리핑해줘"] },
];

// 세무사 관련 퀵액션
const taxQuickCommands = [
  "내 담당 세무사 누구야?",
  "신고 일정 확인해줘",
  "세무 상담 기록 보여줘",
  "부가세 절세 방법 알려줘",
];

// 플랫 목록 (기본 표시용)
const defaultQuickCommands = [
  "오늘 매출 얼마야?",
  "부가세 현황 확인",
  "직원 목록 보여줘",
  "이번 달 경영 현황 알려줘",
  "할 일 뭐 있어?",
  "이번 달 지출 현황",
  "세금계산서 현황",
  "예치금 현황",
];

export function AIChatPanel() {
  const navigate = useNavigate();
  const { isOpen, closeChat, consumeInitialMessage } = useChat();
  const { 
    messages, 
    sessions,
    selectedDate,
    isLoading, 
    isLoadingHistory,
    isLoadingSessions,
    showSessionList,
    setShowSessionList,
    sendMessage, 
    resetChat, 
    startNewChat,
    loadMessagesByDate,
    secretaryName,
    secretaryAvatarUrl,
    getPlaceholderText,
    quota,
    refresh,
  } = useAIChat();
  const [input, setInput] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [sendingActions, setSendingActions] = useState<Set<string>>(new Set());
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSendToAccountant = useCallback(async (consultationId: string) => {
    setSendingActions(prev => new Set(prev).add(consultationId));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("send-tax-consultation", {
        body: { consultationId },
      });

      if (response.error) {
        toast.error("자료 전달에 실패했습니다");
        return;
      }

      const result = response.data;
      if (result?.success) {
        setCompletedActions(prev => new Set(prev).add(consultationId));
        toast.success(`${result.accountantName || "세무사"}님에게 자료가 전달되었습니다`);
      } else {
        toast.error(result?.error || "자료 전달에 실패했습니다");
      }
    } catch (e) {
      console.error("Send to accountant error:", e);
      toast.error("자료 전달 중 오류가 발생했습니다");
    } finally {
      setSendingActions(prev => {
        const next = new Set(prev);
        next.delete(consultationId);
        return next;
      });
    }
  }, []);

  const scrollToBottom = () => {
    // ScrollArea 내부의 viewport를 찾아서 스크롤
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  };

  // 패널이 열릴 때마다 데이터 새로고침 (음성→텍스트 전환 시 동기화)
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      refresh();
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, refresh]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 50);
    }
  }, [messages, isOpen]);

  // 초기 메시지가 있으면 자동 전송
  useEffect(() => {
    if (isOpen && !isLoading && !isLoadingHistory) {
      const msg = consumeInitialMessage();
      if (msg) {
        sendMessage(msg);
      }
    }
  }, [isOpen, isLoadingHistory]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (quota && quota.remaining <= 0) {
      setShowQuotaModal(true);
      return;
    }
    const userInput = input;
    setInput("");
    await sendMessage(userInput);
  };

  const handleQuickCommand = (command: string) => {
    setInput(command);
  };

  const isViewingPastSession = selectedDate && !isToday(selectedDate);

  return (
    <>
      {/* 대화 초기화 확인 모달 */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>대화를 초기화할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 대화 내용이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={resetChat}>초기화</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        className={cn(
          "absolute inset-0 z-50 flex flex-col bg-card transition-all duration-300",
          isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        )}
      >
        {/* 세션 목록 뷰 */}
        {showSessionList && (
        <ChatSessionList
          sessions={sessions}
          selectedDate={selectedDate}
          isLoading={isLoadingSessions}
          onSelectSession={loadMessagesByDate}
          onNewChat={startNewChat}
          onBack={() => setShowSessionList(false)}
        />
      )}

      {/* 메인 채팅 뷰 */}
      {!showSessionList && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  closeChat();
                  navigate("/secretary-settings?from=chat");
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20 overflow-hidden cursor-pointer hover:bg-primary-foreground/30 transition-colors"
              >
                {secretaryAvatarUrl ? (
                  <img 
                    src={secretaryAvatarUrl} 
                    alt={secretaryName} 
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Bot className="h-5 w-5 text-primary-foreground" />
                )}
              </button>
              <div>
                <h3 className="font-semibold text-primary-foreground">{secretaryName}</h3>
                <p className="text-xs text-primary-foreground/70">
                  {isViewingPastSession ? "지난 대화 보기" : quota ? `오늘 ${quota.remaining}/${quota.limit}회 남음` : "AI 비서"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSessionList(true)}
                className="text-primary-foreground hover:bg-primary-foreground/20"
                title="대화 기록"
              >
                <History className="h-4 w-4" />
              </Button>
              {isViewingPastSession ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={startNewChat}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                  title="새 대화"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                  title="대화 초기화"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={closeChat}
                className="text-primary-foreground hover:bg-primary-foreground/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* 지난 대화 안내 배너 */}
          {isViewingPastSession && (
            <div className="bg-muted/50 border-b px-4 py-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                지난 대화를 보고 있습니다
              </span>
              <Button
                variant="link"
                size="sm"
                onClick={startNewChat}
                className="text-xs h-auto p-0"
              >
                오늘 대화로 돌아가기
              </Button>
            </div>
          )}

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {/* 로딩 중 스켈레톤 */}
              {isLoadingHistory && (
                <div className="space-y-4">
                  <div className="flex justify-start">
                    <Skeleton className="h-16 w-3/4 rounded-2xl" />
                  </div>
                  <div className="flex justify-end">
                    <Skeleton className="h-10 w-1/2 rounded-2xl" />
                  </div>
                  <div className="flex justify-start">
                    <Skeleton className="h-20 w-4/5 rounded-2xl" />
                  </div>
                </div>
              )}
              
              {/* 환영 메시지 (메시지가 없고 로딩 완료 시) */}
              {!isLoadingHistory && messages.length === 0 && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-muted/60 text-foreground rounded-bl-md">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <p>안녕하세요, <strong>{secretaryName}</strong>입니다! 👋</p>
                      <p>사장님의 업무를 도와드릴게요.</p>
                      <p>💡 <strong>추천 명령</strong>:</p>
                      <ul>
                        <li>"오늘 매출 알려줘"</li>
                        <li>"직원 목록 보여줘"</li>
                        <li>"부가세 현황 확인"</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              {!isLoadingHistory && messages.map((message, index) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 animate-fade-in",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* 봇 아바타 */}
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 min-w-[2rem] min-h-[2rem] max-w-[2rem] max-h-[2rem] rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shadow-sm">
                      {secretaryAvatarUrl ? (
                        <img 
                          src={secretaryAvatarUrl} 
                          alt={secretaryName} 
                          className="w-8 h-8 object-cover"
                        />
                      ) : (
                        <img 
                          src="/images/icc-blue.webp" 
                          alt={secretaryName}
                          className="w-5 h-5 max-w-5 max-h-5 object-contain"
                        />
                      )}
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-1 max-w-[75%]">
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]"
                          : "bg-gradient-to-br from-card to-muted/60 text-foreground rounded-bl-md border border-border/50 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.08)]"
                      )}
                    >
                    {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                          {message.visualization && (
                            <DataVisualization data={message.visualization} />
                          )}
                          {/* 데이터 출처 표시 */}
                          {message.sources && (
                            <div className="mt-2 pt-1.5 border-t border-border/30 flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                              <Database className="h-2.5 w-2.5 flex-shrink-0" />
                              <span>{message.sources.name}</span>
                              <span className="text-muted-foreground/40">·</span>
                              <span>{message.sources.source}</span>
                              <span className="text-muted-foreground/40">·</span>
                              <RefreshCw className="h-2.5 w-2.5 flex-shrink-0" />
                              <span>{message.sources.syncedAtLabel}</span>
                            </div>
                          )}
                          {/* 액션 카드 (세무사 자료 전달 등) */}
                          {message.suggestedActions && message.suggestedActions.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-border/30 space-y-2">
                              {message.suggestedActions.map((action) => {
                                const isSending = sendingActions.has(action.consultationId);
                                const isCompleted = completedActions.has(action.consultationId);
                                return (
                                  <button
                                    key={action.consultationId}
                                    onClick={() => !isSending && !isCompleted && handleSendToAccountant(action.consultationId)}
                                    disabled={isSending || isCompleted}
                                    className={cn(
                                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                                      isCompleted
                                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                                        : isSending
                                          ? "bg-muted/50 text-muted-foreground border border-border cursor-wait"
                                          : "bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/40 cursor-pointer"
                                    )}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                    ) : isSending ? (
                                      <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                                    ) : (
                                      <FileText className="h-4 w-4 flex-shrink-0" />
                                    )}
                                    <span>
                                      {isCompleted
                                        ? "자료가 전달되었습니다 ✓"
                                        : isSending
                                          ? "전달 중..."
                                          : action.label}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                          {/* 후속 액션 제안 칩 */}
                          {message.followUpSuggestions && message.followUpSuggestions.length > 0 && index === messages.length - 1 && (
                            <div className="mt-3 pt-2 border-t border-border/20 flex flex-wrap gap-1.5">
                              {message.followUpSuggestions.map((suggestion, sIdx) => (
                                <button
                                  key={sIdx}
                                  onClick={() => {
                                    setInput("");
                                    sendMessage(suggestion);
                                  }}
                                  disabled={isLoading}
                                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-secondary/60 hover:bg-secondary text-secondary-foreground border border-border/30 hover:border-border/60 transition-all disabled:opacity-50"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      )}
                    </div>
                    {/* 타임스탬프 */}
                    <span className={cn(
                      "text-[10px] text-muted-foreground/60 px-1",
                      message.role === "user" ? "text-right" : "text-left"
                    )}>
                      {new Date(message.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                    <img 
                      src="/images/icc-blue.webp" 
                      alt="처리 중" 
                      className="h-6 w-6 max-w-6 object-contain animate-bounce"
                    />
                    <span className="text-sm text-muted-foreground">처리 중...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {!isViewingPastSession && (
            <div className="border-t px-4 py-2 space-y-1.5">
              {/* 세무사 퀵액션 */}
              <div className="flex gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {taxQuickCommands.map((cmd) => (
                  <Button
                    key={cmd}
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-[10px] h-7 px-2 border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    onClick={() => handleQuickCommand(cmd)}
                  >
                    🧾 {cmd}
                  </Button>
                ))}
              </div>
              {/* 일반 퀵커맨드 */}
              <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {defaultQuickCommands.map((cmd) => (
                  <Button
                    key={cmd}
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-[10px] h-7 px-2 text-muted-foreground border-border/50 hover:bg-primary hover:text-primary-foreground hover:border-primary"
                    onClick={() => handleQuickCommand(cmd)}
                  >
                    {cmd}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
            {isViewingPastSession ? (
              <Button
                onClick={startNewChat}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                새 대화 시작하기
              </Button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
              <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                   placeholder={getPlaceholderText()}
                  className="flex-1 text-sm placeholder:text-xs"
                  disabled={isLoading}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </>
      )}
      </div>

      <QuotaExhaustedModal
        open={showQuotaModal}
        onClose={() => setShowQuotaModal(false)}
        secretaryName={secretaryName}
        secretaryAvatarUrl={secretaryAvatarUrl}
      />
    </>
  );
}

export function FloatingChatButton() {
  const { isOpen, openChat } = useChat();
  
  if (isOpen) return null;
  
  return (
    <Button
      onClick={openChat}
      className="absolute bottom-20 right-4 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform z-40"
      size="icon"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
}
