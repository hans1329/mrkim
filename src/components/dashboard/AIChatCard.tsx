import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles, MessageCircle, RotateCcw } from "lucide-react";
import { getTodayStats, mockDeposits, mockAutoTransfers, formatCurrency } from "@/data/mockData";
import { useChat } from "@/contexts/ChatContext";

const quickPrompts = [
  "오늘 매출 얼마야?",
  "급여 현황",
  "부가세 확인",
  "이번 달 요약",
];

// 간단한 응답 생성
const generateQuickResponse = (input: string): string => {
  const lowerInput = input.toLowerCase();
  const stats = getTodayStats();

  if (lowerInput.includes("매출") && (lowerInput.includes("오늘") || lowerInput.includes("얼마"))) {
    return `오늘 총 매출은 ${formatCurrency(stats.income)}이며, 순이익은 ${formatCurrency(stats.profit)}입니다.`;
  }

  if (lowerInput.includes("부가세") || lowerInput.includes("vat")) {
    const vatDeposit = mockDeposits.find((d) => d.type === "vat");
    if (vatDeposit) {
      return `부가세 예치금 ${formatCurrency(vatDeposit.amount)} (납부일: ${vatDeposit.dueDate})`;
    }
  }

  if (lowerInput.includes("급여") || lowerInput.includes("월급")) {
    const salaryDeposit = mockDeposits.find((d) => d.type === "salary");
    if (salaryDeposit) {
      return `급여 적립금 ${formatCurrency(salaryDeposit.amount)} (지급일: ${salaryDeposit.dueDate})`;
    }
  }

  if (lowerInput.includes("자동이체") || lowerInput.includes("예정")) {
    const scheduled = mockAutoTransfers.filter((t) => t.status !== "completed");
    return `예정된 자동이체 ${scheduled.length}건`;
  }

  if (lowerInput.includes("이번 달") || lowerInput.includes("요약")) {
    const stats = getTodayStats();
    return `이번 달 총 매출 ${formatCurrency(stats.income * 22)}, 예상 순이익 ${formatCurrency(stats.profit * 22)}입니다. 부가세와 급여 지급 일정을 확인해보세요.`;
  }

  return "자세한 내용은 김비서와 대화해보세요!";
};

export function AIChatCard() {
  const { openChat } = useChat();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const handleQuickAsk = async (question: string) => {
    setInput("");
    setIsTyping(true);
    
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const answer = generateQuickResponse(question);
    setResponse(answer);
    setIsTyping(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    handleQuickAsk(input);
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-[#2196F3] via-[#9C27B0] to-[#FF9800] border-0 shadow-lg min-h-[200px]">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">김비서</h3>
              <p className="text-xs text-white/80">AI 경영 비서가 도와드릴게요</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={openChat}
            className="gap-1.5 bg-white/20 hover:bg-white/30 text-white border border-white/40 backdrop-blur-sm"
          >
            <MessageCircle className="h-4 w-4" />
            대화
          </Button>
        </div>

        {/* Response Area */}
        {(response || isTyping) && (
          <div className="mb-4 rounded-xl bg-white/40 backdrop-blur-sm p-3 border border-white/30">
            {isTyping ? (
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                <span className="text-sm text-muted-foreground">답변 중...</span>
              </div>
            ) : (
              <div 
                className="flex items-center justify-between gap-2 cursor-pointer"
                onClick={openChat}
              >
                <p className="text-sm text-white flex-1 line-clamp-2">{response}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResponse(null);
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3 mt-6">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="김비서에게 물어보세요..."
            className="flex-1 bg-white/20 border-0 backdrop-blur-sm text-white placeholder:text-white/60 focus-visible:ring-white/30"
            disabled={isTyping}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isTyping}
            className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-1.5">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="text-[11px] px-1 py-0.5 text-white/70 hover:text-white transition-colors disabled:opacity-50"
              onClick={() => handleQuickAsk(prompt)}
              disabled={isTyping}
            >
              #{prompt}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
