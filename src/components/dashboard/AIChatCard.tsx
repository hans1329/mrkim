import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Send, Sparkles, Mic, RotateCcw, Clock, Settings } from "lucide-react";
import { formatCurrency } from "@/data/mockData";
import { useChat } from "@/contexts/ChatContext";
import { useVoice } from "@/contexts/VoiceContext";
import { useProfile } from "@/hooks/useProfile";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
interface RealTimeStats {
  todayIncome: number;
  todayExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
  isLoading: boolean;
}
const quickPrompts = ["오늘 매출 얼마야?", "급여 현황", "부가세 확인", "이번 달 요약"];

// 일반 플레이스홀더 메시지
const defaultPlaceholders = ["오늘 매출이 궁금해요", "이번 달 경영 현황은?", "급여일 언제야?", "할 일이 뭐가 있어?", "부가세 얼마나 모였어?"];

// 미완료 설정 안내 메시지
const getIncompleteSettingsMessages = (profile: any, secretaryName: string) => {
  const messages: string[] = [];
  if (!profile?.secretary_avatar_url) {
    messages.push(`${secretaryName}의 프로필 사진을 설정해보세요!`);
  }
  if (!profile?.secretary_name || profile?.secretary_name === "김비서") {
    messages.push("비서의 이름을 직접 지어주세요!");
  }
  if (!profile?.secretary_tone || profile?.secretary_tone === "polite") {
    messages.push("비서의 말투를 바꿔보세요!");
  }
  return messages;
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

// 실제 데이터 기반 브리핑 메시지 생성
const generateRealBriefingMessage = (stats: RealTimeStats, profile: any): string => {
  const {
    hometax_connected,
    card_connected,
    account_connected
  } = profile || {};

  // 연동이 하나도 안된 경우
  if (!hometax_connected && !card_connected && !account_connected) {
    return "데이터를 연동하면 실시간 경영 현황을 알려드릴게요.";
  }

  // 오늘 데이터가 있는 경우
  if (stats.todayIncome > 0 || stats.todayExpense > 0) {
    const parts = [];
    if (stats.todayIncome > 0) {
      parts.push(`오늘 매출 ${formatCurrency(stats.todayIncome)}`);
    }
    if (stats.todayExpense > 0) {
      parts.push(`지출 ${formatCurrency(stats.todayExpense)}`);
    }
    return parts.join(", ") + "입니다.";
  }

  // 이번 달 데이터만 있는 경우
  if (stats.monthlyIncome > 0 || stats.monthlyExpense > 0) {
    const parts = [];
    if (stats.monthlyIncome > 0) {
      parts.push(`이번 달 매출 ${formatCurrency(stats.monthlyIncome)}`);
    }
    if (stats.monthlyExpense > 0) {
      parts.push(`지출 ${formatCurrency(stats.monthlyExpense)}`);
    }
    return parts.join(", ") + "입니다.";
  }

  // 연동은 되어있지만 데이터가 없는 경우
  return "아직 이번 달 거래 내역이 없어요. 거래가 발생하면 알려드릴게요!";
};
export function AIChatCard() {
  const navigate = useNavigate();
  const {
    openChat
  } = useChat();
  const {
    openVoice
  } = useVoice();
  const {
    profile,
    loading: profileLoading
  } = useProfile();
  const isMobile = useIsMobile();
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [realStats, setRealStats] = useState<RealTimeStats>({
    todayIncome: 0,
    todayExpense: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    isLoading: true
  });
  const [hasConversationHistory, setHasConversationHistory] = useState<boolean | null>(null);

  // 설정한 비서 이름과 아바타 사용 (로딩 중에는 undefined)
  const secretaryName = profileLoading ? undefined : profile?.secretary_name || "김비서";
  const secretaryAvatarUrl = profileLoading ? undefined : profile?.secretary_avatar_url || null;

  // 실제 거래 데이터 불러오기
  useEffect(() => {
    const fetchRealStats = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) {
          setRealStats(prev => ({
            ...prev,
            isLoading: false
          }));
          setHasConversationHistory(false);
          return;
        }
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

        // 오늘 거래, 이번달 거래, 대화 기록을 병렬로 조회
        const [todayResult, monthlyResult, chatResult] = await Promise.all([supabase.from("transactions").select("amount, type").eq("user_id", user.id).eq("transaction_date", todayStr), supabase.from("transactions").select("amount, type").eq("user_id", user.id).gte("transaction_date", monthStart).lte("transaction_date", todayStr), supabase.from("chat_messages").select("id").eq("user_id", user.id).limit(1)]);

        // 오늘 통계 (transfer_in은 매출에서 제외)
        let todayIncome = 0;
        let todayExpense = 0;
        if (todayResult.data) {
          todayResult.data.forEach(tx => {
            if (tx.type === "income") todayIncome += Number(tx.amount);
            else if (tx.type === "expense") todayExpense += Number(tx.amount);
            // transfer_in은 매출/지출 모두 제외
          });
        }

        // 이번달 통계 (transfer_in은 매출에서 제외)
        let monthlyIncome = 0;
        let monthlyExpense = 0;
        if (monthlyResult.data) {
          monthlyResult.data.forEach(tx => {
            if (tx.type === "income") monthlyIncome += Number(tx.amount);
            else if (tx.type === "expense") monthlyExpense += Number(tx.amount);
            // transfer_in은 매출/지출 모두 제외
          });
        }

        // 대화 기록 존재 여부
        setHasConversationHistory((chatResult.data?.length ?? 0) > 0);
        setRealStats({
          todayIncome,
          todayExpense,
          monthlyIncome,
          monthlyExpense,
          isLoading: false
        });
      } catch (error) {
        console.error("Failed to fetch real stats:", error);
        setRealStats(prev => ({
          ...prev,
          isLoading: false
        }));
        setHasConversationHistory(false);
      }
    };
    fetchRealStats();
  }, []);

  // 랜덤 플레이스홀더 선택 (미완료 설정 우선)
  const placeholder = useMemo(() => {
    // 첫 대화인 경우 우선 표시
    if (hasConversationHistory === false) {
      return `${secretaryName || "김비서"}와 대화를 시작해보세요!`;
    }

    // 연동 상태에 따른 안내
    const { hometax_connected, card_connected, account_connected } = profile || {};
    if (!hometax_connected && !card_connected && !account_connected) {
      return "계좌·카드·홈택스를 연동하면 실시간 경영 현황을 알려드려요.";
    }
    if (!account_connected) return "계좌를 연동하면 매출·지출을 자동 관리해드려요.";
    if (!card_connected) return "카드를 연동하면 지출 분석까지 가능해요.";
    if (!hometax_connected) return "홈택스를 연동하면 세금계산서까지 관리해드려요.";

    // 미완료 설정 안내
    const incompleteMessages = getIncompleteSettingsMessages(profile, secretaryName || "김비서");
    if (incompleteMessages.length > 0) {
      return incompleteMessages[Math.floor(Math.random() * incompleteMessages.length)];
    }

    // 모두 완료 시
    return defaultPlaceholders[Math.floor(Math.random() * defaultPlaceholders.length)];
  }, [profile, secretaryName, hasConversationHistory]);

  // 실제 데이터 기반 브리핑 메시지
  const briefingMessage = useMemo(() => {
    if (realStats.isLoading) return "";
    return generateRealBriefingMessage(realStats, profile);
  }, [realStats, profile]);

  // 브리핑 시간 체크
  useEffect(() => {
    const checkBriefing = () => {
      // 첫 대화 사용자에게는 브리핑 표시하지 않음
      if (isBriefingTime() && !response && !realStats.isLoading && hasConversationHistory === true) {
        setShowBriefing(true);
      }
    };
    checkBriefing();
    const interval = setInterval(checkBriefing, 60000);
    return () => clearInterval(interval);
  }, [response, realStats.isLoading, hasConversationHistory]);

  // 실제 데이터 기반 빠른 응답
  const generateQuickResponse = (inputText: string): string => {
    const lowerInput = inputText.toLowerCase();
    if (lowerInput.includes("매출") && (lowerInput.includes("오늘") || lowerInput.includes("얼마"))) {
      if (realStats.todayIncome > 0) {
        return `오늘 총 매출은 ${formatCurrency(realStats.todayIncome)}입니다.`;
      }
      return "오늘은 아직 매출 기록이 없어요.";
    }
    if (lowerInput.includes("급여") || lowerInput.includes("월급")) {
      return "급여 현황은 직원 관리 메뉴에서 확인할 수 있어요.";
    }
    if (lowerInput.includes("부가세") || lowerInput.includes("vat")) {
      return "부가세 현황은 리포트 > 세금계산서 탭에서 확인할 수 있어요.";
    }
    if (lowerInput.includes("이번 달") || lowerInput.includes("요약")) {
      if (realStats.monthlyIncome > 0 || realStats.monthlyExpense > 0) {
        return `이번 달 매출 ${formatCurrency(realStats.monthlyIncome)}, 지출 ${formatCurrency(realStats.monthlyExpense)}입니다.`;
      }
      return "이번 달은 아직 거래 내역이 없어요.";
    }
    return `자세한 내용은 ${secretaryName}와 대화해보세요!`;
  };
  const handleQuickAsk = async (question: string) => {
    setInput("");
    setIsTyping(true);
    setShowBriefing(false);
    await new Promise(resolve => setTimeout(resolve, 500));
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
  return <Card className={`overflow-hidden shadow-lg ${isMobile ? "bg-white/90 backdrop-blur-md border-border/50" : "bg-card border-border"}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <button onClick={() => navigate("/secretary-settings")} className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-lg hover:bg-muted transition-colors overflow-hidden">
                {secretaryAvatarUrl ? <img src={secretaryAvatarUrl} alt={secretaryName || "비서"} className="h-full w-auto object-contain" /> : <Bot className="h-8 w-8 text-primary" />}
              </button>
              <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-muted rounded-full">
                <Settings className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground tracking-wide mb-0.5">당신의 경영 비서</p>
              {secretaryName ? <h3 className="font-bold text-foreground">{secretaryName}</h3> : <Skeleton className="h-5 w-16" />}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={openVoice} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 border-0">
            <Mic className="h-4 w-4" />
            대화
          </Button>
        </div>

        {/* Response/Briefing Area */}
        {(displayMessage || isTyping) && <div className={`mb-4 rounded-xl p-2.5 border ${isBriefingDisplay ? "bg-success/10 border-success/20" : "bg-muted border-border"}`}>
            {isTyping ? <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-success" />
                <span className="text-xs text-muted-foreground">답변 중...</span>
              </div> : <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={openChat}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {isBriefingDisplay && <Clock className="h-3.5 w-3.5 text-success shrink-0" />}
                  <p className="text-xs text-foreground/80 flex-1 line-clamp-2">{displayMessage}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={e => {
            e.stopPropagation();
            setResponse(null);
            setShowBriefing(false);
          }}>
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>}
          </div>}

        {/* Input */}
        <form onSubmit={handleSubmit} className="flex gap-2 mb-3 mt-3">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder="비서에게 요청해주세요!" className="flex-1 bg-muted border-border text-sm font-medium placeholder:text-xs placeholder:font-normal placeholder:text-muted-foreground placeholder:leading-normal focus-visible:ring-primary/30 leading-normal text-foreground" disabled={isTyping || profileLoading || realStats.isLoading} />
          <Button type="submit" size="icon" disabled={!input.trim() || isTyping} className="bg-primary hover:bg-primary/90 text-primary-foreground border-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {/* Quick Prompts */}
        <div className="flex flex-wrap gap-1">
          {quickPrompts.map(prompt => <button key={prompt} type="button" className="text-xs px-1.5 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50" onClick={() => handleQuickAsk(prompt)} disabled={isTyping}>
              #{prompt}
            </button>)}
        </div>
      </CardContent>
    </Card>;
}