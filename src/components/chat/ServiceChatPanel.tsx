import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { useServiceChat } from "@/contexts/ServiceChatContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickQuestions = [
  "김비서가 뭐야?",
  "어떤 기능이 있어?",
  "요금은 얼마야?",
  "무료 체험 가능해?",
];

// 데모용 응답 (나중에 AI로 대체)
const getServiceResponse = (input: string): string => {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes("뭐야") || lowerInput.includes("무엇") || lowerInput.includes("소개")) {
    return "**김비서**는 소상공인을 위한 AI 경영 비서입니다! 🤖\n\n매출 관리, 직원 급여, 세금 신고까지 복잡한 사업장 관리를 **음성 명령 한 마디**로 해결해드려요.\n\n\"오늘 매출 얼마야?\" 라고 물어보시면 바로 답변해드립니다!";
  }
  
  if (lowerInput.includes("기능") || lowerInput.includes("할 수 있")) {
    return "김비서의 주요 기능이에요:\n\n📊 **매출/지출 관리** - 실시간 현황 파악\n👥 **직원 관리** - 급여, 4대보험 자동 계산\n💰 **자금 관리** - 자동이체, 예치금 관리\n📋 **세무 지원** - 부가세, 종합소득세 안내\n🔔 **알림 서비스** - 중요 일정 리마인드\n\n모두 **음성으로** 편하게 이용하실 수 있어요!";
  }
  
  if (lowerInput.includes("요금") || lowerInput.includes("가격") || lowerInput.includes("얼마")) {
    return "김비서 요금 안내입니다:\n\n🆓 **무료 체험** - 14일간 모든 기능 무료\n💼 **스탠다드** - 월 29,000원\n🏢 **프로** - 월 49,000원 (다중 사업장)\n\n지금 가입하시면 **첫 달 50% 할인** 혜택이 있어요!";
  }
  
  if (lowerInput.includes("무료") || lowerInput.includes("체험") || lowerInput.includes("시작")) {
    return "네, **14일 무료 체험**이 가능합니다! 🎉\n\n카드 등록 없이 바로 시작할 수 있어요.\n\n👆 위의 **회원가입** 버튼을 눌러 시작해보세요!";
  }
  
  return "궁금한 점이 있으시군요! 😊\n\n김비서는 소상공인의 사업장 관리를 도와주는 AI 비서입니다.\n\n더 자세한 내용이 궁금하시면 아래 질문을 눌러보세요!";
};

export function ServiceChatPanel() {
  const { isOpen, closeChat } = useServiceChat();
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
    setInput("");
    setIsTyping(true);

    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));

    const response = getServiceResponse(input);
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

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-card transition-all duration-300",
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
            <h3 className="font-semibold text-primary-foreground">김비서 안내</h3>
            <p className="text-xs text-primary-foreground/70">서비스 문의</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeChat}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-5 w-5" />
        </Button>
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
                <Sparkles className="h-4 w-4 animate-pulse-soft text-primary" />
                <span className="text-sm text-muted-foreground">입력 중...</span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Questions */}
      <div className="border-t px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1">
          {quickQuestions.map((q) => (
            <Button
              key={q}
              variant="outline"
              size="sm"
              className="shrink-0 text-xs"
              onClick={() => handleQuickQuestion(q)}
            >
              {q}
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
