import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTodayStats, mockDeposits, mockAutoTransfers, formatCurrency } from "@/data/mockData";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickCommands = [
  "오늘 매출 얼마야?",
  "이번달 부가세 현황",
  "예정된 자동이체 알려줘",
];

// 시뮬레이션 응답 생성
const generateResponse = (input: string): string => {
  const lowerInput = input.toLowerCase();
  const stats = getTodayStats();

  if (lowerInput.includes("매출") && (lowerInput.includes("오늘") || lowerInput.includes("얼마"))) {
    return `오늘 총 매출은 ${formatCurrency(stats.income)}입니다.\n\n💳 카드: ${stats.cardRatio}% (${formatCurrency(stats.cardIncome)})\n💵 현금: ${stats.cashRatio}% (${formatCurrency(stats.cashIncome)})\n\n지출은 ${formatCurrency(stats.expense)}이며, 순이익은 ${formatCurrency(stats.profit)}입니다.`;
  }

  if (lowerInput.includes("부가세") || lowerInput.includes("vat")) {
    const vatDeposit = mockDeposits.find((d) => d.type === "vat");
    if (vatDeposit) {
      return `이번 달 부가세 예치금은 ${formatCurrency(vatDeposit.amount)}입니다.\n\n📅 납부 예정일: ${vatDeposit.dueDate}\n🎯 목표 금액: ${formatCurrency(vatDeposit.targetAmount || 0)}\n📊 달성률: ${Math.round(((vatDeposit.amount / (vatDeposit.targetAmount || 1)) * 100))}%`;
    }
  }

  if (lowerInput.includes("자동이체") || lowerInput.includes("예정")) {
    const scheduled = mockAutoTransfers.filter((t) => t.status !== "completed");
    if (scheduled.length > 0) {
      const list = scheduled
        .map((t) => `• ${t.name}: ${formatCurrency(t.amount)} (${t.condition})`)
        .join("\n");
      return `예정된 자동이체 내역입니다:\n\n${list}`;
    }
  }

  if (lowerInput.includes("퇴사") && lowerInput.includes("처리")) {
    return `퇴사 처리를 도와드릴게요. 🤝\n\n다음 정보를 알려주세요:\n1. 퇴사 직원명\n2. 퇴사일\n\n퇴사 처리 시 다음 절차를 자동으로 진행합니다:\n✅ 4대보험 상실신고\n✅ 퇴직금 계산\n✅ 마지막 급여 정산`;
  }

  if (lowerInput.includes("급여") || lowerInput.includes("월급")) {
    const salaryDeposit = mockDeposits.find((d) => d.type === "salary");
    if (salaryDeposit) {
      return `급여 관련 현황입니다:\n\n💰 급여 적립금: ${formatCurrency(salaryDeposit.amount)}\n📅 지급 예정일: ${salaryDeposit.dueDate}\n👥 대상 인원: 3명`;
    }
  }

  if (lowerInput.includes("이상") && lowerInput.includes("결제")) {
    return `최근 이상 결제 감지 내역입니다:\n\n⚠️ 오늘 14:23 - ₩850,000 카드 결제\n   평소 평균 대비 2.5배 높은 금액\n\n이 결제가 정상이라면 "확인"이라고 말씀해주세요.`;
  }

  return `네, 말씀하세요! 😊\n\n다음과 같은 업무를 도와드릴 수 있어요:\n• 매출/지출 현황 조회\n• 직원 관리 (입퇴사 처리)\n• 부가세/급여 예치금 확인\n• 자동이체 설정 및 조회\n• 이상 결제 확인\n\n무엇을 도와드릴까요?`;
};

export function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "안녕하세요, 김비서입니다! 👋\n\n무엇을 도와드릴까요? 매출 현황, 직원 관리, 자금 설정 등 다양한 업무를 말씀만 하시면 처리해드려요.",
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

    // 시뮬레이션 딜레이
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response = generateResponse(input);
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleQuickCommand = (command: string) => {
    setInput(command);
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Panel */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-50 flex h-[600px] w-full flex-col bg-card shadow-2xl transition-all duration-300 sm:bottom-6 sm:right-6 sm:w-[400px] sm:rounded-2xl",
          isOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-primary px-4 py-3 sm:rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-primary-foreground">김비서</h3>
              <p className="text-xs text-primary-foreground/70">AI 경영 비서</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
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
                      : "bg-muted text-foreground rounded-bl-md"
                  )}
                >
                  <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3">
                  <Sparkles className="h-4 w-4 animate-pulse-soft text-primary" />
                  <span className="text-sm text-muted-foreground">김비서가 답변 중...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Commands */}
        <div className="border-t px-4 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-thin">
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
            />
            <Button type="submit" size="icon" disabled={!input.trim() || isTyping}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
