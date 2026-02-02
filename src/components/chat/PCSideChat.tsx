import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateAgentResponse, ExecutionResult } from "@/lib/aiAgent";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  executionResult?: ExecutionResult;
  awaitingConfirmation?: boolean;
}

const quickCommands = [
  "오늘 매출 얼마야?",
  "부가세 현황 확인",
  "직원 목록 보여줘",
];

export function PCSideChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "안녕하세요, **김비서**입니다! 👋\n\n사장님의 업무를 도와드릴게요.\n\n💡 **추천 명령**:\n• \"오늘 매출 알려줘\"\n• \"직원 목록 보여줘\"\n• \"부가세 현황 확인\"",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<ExecutionResult | null>(null);
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
    setInput("");
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));

    const response = generateAgentResponse(input);
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response.message,
      timestamp: new Date(),
      executionResult: response.executionResult,
      awaitingConfirmation: response.executionResult?.requiresConfirmation,
    };

    if (response.executionResult?.requiresConfirmation) {
      setPendingConfirmation(response.executionResult);
    }

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleConfirmAction = async (confirmed: boolean) => {
    if (!pendingConfirmation) return;

    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const resultMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: confirmed 
        ? pendingConfirmation.message 
        : "❌ 작업이 취소되었습니다.",
      timestamp: new Date(),
    };

    setMessages((prev) => {
      const updated = prev.map((msg) => 
        msg.awaitingConfirmation ? { ...msg, awaitingConfirmation: false } : msg
      );
      return [...updated, resultMessage];
    });

    setPendingConfirmation(null);
    setIsTyping(false);
  };

  const handleQuickCommand = (command: string) => {
    setInput(command);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-primary/5 px-4 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">김비서</h3>
          <p className="text-xs text-muted-foreground">AI 경영 비서</p>
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
                  "max-w-[90%] rounded-2xl px-4 py-3",
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
                
                {/* 확인 버튼 */}
                {message.awaitingConfirmation && pendingConfirmation && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                    <Button
                      size="sm"
                      onClick={() => handleConfirmAction(true)}
                      className="flex-1 gap-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      확인
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleConfirmAction(false)}
                      className="flex-1 gap-1"
                    >
                      <XCircle className="h-4 w-4" />
                      취소
                    </Button>
                  </div>
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
                  className="h-6 w-6 animate-bounce"
                />
                <span className="text-sm text-muted-foreground">처리 중...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Commands */}
      <div className="border-t px-4 py-2">
        <div className="flex flex-wrap gap-2">
          {quickCommands.map((cmd) => (
            <Button
              key={cmd}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleQuickCommand(cmd)}
            >
              {cmd}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t p-4">
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
            placeholder="김비서에게 명령하세요..."
            className="flex-1"
            disabled={isTyping || !!pendingConfirmation}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isTyping || !!pendingConfirmation}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
