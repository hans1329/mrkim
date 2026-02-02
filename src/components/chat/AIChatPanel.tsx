import { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Send, X, MessageCircle, Sparkles, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useChat } from "@/contexts/ChatContext";
import { useAIChat } from "@/hooks/useAIChat";

const quickCommands = [
  "오늘 매출 얼마야?",
  "부가세 현황 확인",
  "직원 목록 보여줘",
  "이번 달 경영 현황 알려줘",
  "할 일 뭐 있어?",
];

export function AIChatPanel() {
  const { isOpen, closeChat } = useChat();
  const { messages, isLoading, isLoadingHistory, sendMessage, resetChat, secretaryName } = useAIChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userInput = input;
    setInput("");
    await sendMessage(userInput);
  };

  const handleQuickCommand = (command: string) => {
    setInput(command);
  };

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col bg-card transition-all duration-300",
        isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-primary px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-primary-foreground">{secretaryName}</h3>
            <p className="text-xs text-primary-foreground/70">AI 경영 비서</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={resetChat}
            className="text-primary-foreground hover:bg-primary-foreground/20"
            title="대화 초기화"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
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

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
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
          {!isLoadingHistory && messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex animate-fade-in",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted/60 text-foreground rounded-bl-md"
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
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                <Sparkles className="h-4 w-4 animate-pulse-soft text-primary" />
                <span className="text-sm text-muted-foreground">처리 중...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Commands */}
      <div className="border-t px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {quickCommands.map((cmd) => (
            <Button
              key={cmd}
              variant="outline"
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => handleQuickCommand(cmd)}
            >
              {cmd}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
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
            placeholder={`${secretaryName}에게 명령하세요...`}
            className="flex-1"
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
      </div>
    </div>
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
