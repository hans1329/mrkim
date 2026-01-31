import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles, MessageCircle, RotateCcw, Clock } from "lucide-react";
import { getTodayStats, mockDeposits, mockAutoTransfers, mockEmployees, formatCurrency } from "@/data/mockData";
import { useChat } from "@/contexts/ChatContext";

const quickPrompts = [
  "오늘 매출 얼마야?",
  "급여 현황",
  "부가세 확인",
  "이번 달 요약",
];

// 브리핑 메시지 생성
const generateBriefingMessage = (): string => {
  const stats = getTodayStats();
  const vatDeposit = mockDeposits.find((d) => d.type === "vat");
  const salaryDeposit = mockDeposits.find((d) => d.type === "salary");
  const activeEmployees = mockEmployees.filter((e) => e.status === "재직");
  
  const parts = [
    `오늘 매출 ${formatCurrency(stats.income)}, 순이익 ${formatCurrency(stats.profit)}입니다.`,
  ];
  
  if (vatDeposit) {
    parts.push(`부가세 ${formatCurrency(vatDeposit.amount)} 적립 중.`);
  }
  
  if (salaryDeposit && salaryDeposit.dueDate) {
    const dueDate = new Date(salaryDeposit.dueDate);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 0 && diffDays <= 7) {
      parts.push(`급여일 D-${diffDays}.`);
    }
  }
  
  return parts.join(" ");
};

// 브리핑 시간인지 확인 (9시, 12시, 18시, 22시 기준 ±30분)
const isBriefingTime = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  
  const briefingHours = [9, 12, 18, 22];
  
  return briefingHours.some(bh => {
    if (hour === bh && minute <= 30) return true;
    if (hour === bh - 1 && minute >= 30) return true;
    return false;
  });
};

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
  const navigate = useNavigate();
  const { openChat } = useChat();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  
  // 브리핑 메시지
  const briefingMessage = useMemo(() => generateBriefingMessage(), []);
  
  // 브리핑 시간 체크
  useEffect(() => {
    const checkBriefing = () => {
      if (isBriefingTime() && !response) {
        setShowBriefing(true);
      }
    };
    
    checkBriefing();
    const interval = setInterval(checkBriefing, 60000); // 1분마다 체크
    
    return () => clearInterval(interval);
  }, [response]);

  const handleQuickAsk = async (question: string) => {
    setInput("");
    setIsTyping(true);
    setShowBriefing(false);
    
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
  
  const displayMessage = response || (showBriefing ? briefingMessage : null);
  const isBriefingDisplay = !response && showBriefing;

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-[#2196F3] via-[#9C27B0] to-[#FF9800] border-0 shadow-lg min-h-[200px]">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/secretary-settings")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-lg hover:bg-white/30 transition-colors"
            >
              <Bot className="h-6 w-6 text-white" />
            </button>
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

        {/* Response/Briefing Area */}
        {(displayMessage || isTyping) && (
          <div className={`mb-4 rounded-xl backdrop-blur-sm p-3 border ${
            isBriefingDisplay 
              ? "bg-amber-500/30 border-amber-300/50" 
              : "bg-white/40 border-white/30"
          }`}>
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
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isBriefingDisplay && (
                    <Clock className="h-4 w-4 text-amber-200 shrink-0" />
                  )}
                  <p className="text-sm text-white flex-1 line-clamp-2">{displayMessage}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResponse(null);
                    setShowBriefing(false);
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
        <div className="flex flex-wrap gap-1">
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
