import { useRef, useEffect, useState } from "react";
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
import { Bot, Send, X, MessageCircle, Sparkles, RotateCcw, History, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useChat } from "@/contexts/ChatContext";
import { useAIChat } from "@/hooks/useAIChat";
import { ChatSessionList } from "./ChatSessionList";
import { isToday } from "date-fns";

const quickCommands = [
  "오늘 매출 얼마야?",
  "부가세 현황 확인",
  "직원 목록 보여줘",
  "이번 달 경영 현황 알려줘",
  "할 일 뭐 있어?",
];

export function AIChatPanel() {
  const navigate = useNavigate();
  const { isOpen, closeChat } = useChat();
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
  } = useAIChat();
  const [input, setInput] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    // ScrollArea 내부의 viewport를 찾아서 스크롤
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  };

  useEffect(() => {
    if (isOpen) {
      // 약간의 딜레이를 줘서 DOM 업데이트 후 스크롤
      setTimeout(scrollToBottom, 50);
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
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
                  {isViewingPastSession ? "지난 대화 보기" : "AI 경영 비서"}
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
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden shadow-sm">
                      {secretaryAvatarUrl ? (
                        <img 
                          src={secretaryAvatarUrl} 
                          alt={secretaryName} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img 
                          src="/images/icc-blue.webp" 
                          alt={secretaryName}
                          className="w-5 h-5 object-contain"
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
                      className="h-6 w-auto animate-bounce"
                    />
                    <span className="text-sm text-muted-foreground">처리 중...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {!isViewingPastSession && (
            <div className="border-t px-4 py-2">
              <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {quickCommands.map((cmd) => (
                  <Button
                    key={cmd}
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs text-muted-foreground border-border/50 hover:text-foreground"
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
