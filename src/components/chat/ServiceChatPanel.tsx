import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Send, X, AudioLines } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useServiceChat } from "@/contexts/ServiceChatContext";
import { useServiceFAQ } from "@/hooks/useServiceFAQ";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function ServiceChatPanel() {
  const { isChatOpen, closeChat, switchToVoice } = useServiceChat();
  const { findAnswer, quickQuestions, isLoading: isFAQLoading } = useServiceFAQ();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "안녕하세요! 👋 **김비서**에 대해 궁금한 점을 물어보세요.\n\n💡 아래 버튼을 눌러 빠르게 알아보세요!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const userInput = input;
    setInput("");
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 300));

    const response = findAnswer(userInput);
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  // 기본 빠른 질문 (FAQ 로딩 전)
  const defaultQuickQuestions = ["김비서가 뭐야?", "어떤 기능이 있어?", "요금은 얼마야?", "무료 체험 가능해?"];
  const displayQuestions = quickQuestions.length > 0 ? quickQuestions : defaultQuickQuestions;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-card transition-all duration-300",
        isChatOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-primary px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-primary-foreground">김비서 안내</h3>
            <p className="text-xs text-primary-foreground/70">서비스 문의</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={switchToVoice}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <AudioLines className="h-5 w-5" />
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
          {messages.map((message) => (
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
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                <img 
                  src="/images/icc-blue.webp" 
                  alt="처리 중" 
                  className="h-6 w-auto animate-bounce"
                />
                <span className="text-sm text-muted-foreground">입력 중...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Questions */}
      <div className="border-t px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {isFAQLoading ? (
            <>
              <Skeleton className="h-8 w-24 shrink-0" />
              <Skeleton className="h-8 w-28 shrink-0" />
              <Skeleton className="h-8 w-20 shrink-0" />
            </>
          ) : (
            displayQuestions.map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => handleQuickQuestion(q)}
              >
                {q}
              </Button>
            ))
          )}
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
            placeholder="김비서에 대해 물어보세요..."
            className="flex-1"
            disabled={isTyping}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isTyping}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
