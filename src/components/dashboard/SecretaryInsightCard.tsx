import { useState, useEffect, useMemo } from "react";
import { Lightbulb, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { supabase } from "@/integrations/supabase/client";

interface SecretaryInsightCardProps {
  isHero?: boolean;
}

// 시간대별 인사말
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 9) return "좋은 아침이에요!";
  if (hour < 12) return "오전도 화이팅!";
  if (hour < 14) return "점심은 드셨나요?";
  if (hour < 18) return "오후도 힘내세요!";
  if (hour < 22) return "오늘 하루 수고하셨어요!";
  return "늦은 시간까지 고생이 많으세요!";
}

// 데이터 기반 인사이트 생성
function generateInsight(stats: { todayIncome: number; todayExpense: number; monthlyIncome: number; monthlyExpense: number } | null): string {
  if (!stats) return "오늘도 좋은 하루 보내세요!";

  const { todayIncome, todayExpense, monthlyIncome, monthlyExpense } = stats;

  if (todayIncome > 0 && todayExpense > 0) {
    const ratio = Math.round((todayExpense / todayIncome) * 100);
    if (ratio > 80) return "오늘 지출 비중이 높아요. 비용 항목을 한번 점검해보시는 건 어떨까요?";
    if (ratio < 30) return "오늘 수익성이 좋아요! 이 페이스를 유지해보세요.";
    return "오늘 매출과 지출 균형이 적절해요.";
  }

  if (todayIncome > 0) return "오늘 매출이 발생했어요! 좋은 시작이에요.";
  if (todayExpense > 0) return "오늘 지출이 있었어요. 매출도 곧 따라올 거예요!";

  if (monthlyIncome > 0) {
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projected = Math.round((monthlyIncome / dayOfMonth) * daysInMonth);
    if (projected > monthlyIncome * 1.2) return "이번 달 매출 추세가 좋아요!";
    return "이번 달도 꾸준히 잘 하고 계세요.";
  }

  return "오늘도 좋은 하루 보내세요!";
}

// 일반 팁 (데이터 없을 때 대체)
const generalTips = [
  "정기적인 지출 점검으로 불필요한 비용을 줄일 수 있어요.",
  "세금계산서는 발행 즉시 정리하면 신고 시 편해요.",
  "매출이 늘어나는 요일 패턴을 파악해보세요.",
  "직원 급여일 전에 자금을 미리 확보해두세요.",
  "카드 매출은 2~3일 후 입금되니 자금 계획 시 참고하세요.",
];

export function SecretaryInsightCard({ isHero = false }: SecretaryInsightCardProps) {
  const { profile, loading: profileLoading } = useProfileQuery();
  const secretaryName = profileLoading ? undefined : (profile?.secretary_name || "김비서");
  const [stats, setStats] = useState<{ todayIncome: number; todayExpense: number; monthlyIncome: number; monthlyExpense: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setStatsLoading(false); return; }

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

        const [todayRes, monthlyRes] = await Promise.all([
          supabase.from("transactions").select("amount, type").eq("user_id", user.id).eq("transaction_date", todayStr),
          supabase.from("transactions").select("amount, type").eq("user_id", user.id).gte("transaction_date", monthStart).lte("transaction_date", todayStr),
        ]);

        let todayIncome = 0, todayExpense = 0, monthlyIncome = 0, monthlyExpense = 0;
        todayRes.data?.forEach(tx => {
          if (tx.type === "income") todayIncome += Number(tx.amount);
          else if (tx.type === "expense") todayExpense += Number(tx.amount);
        });
        monthlyRes.data?.forEach(tx => {
          if (tx.type === "income") monthlyIncome += Number(tx.amount);
          else if (tx.type === "expense") monthlyExpense += Number(tx.amount);
        });

        setStats({ todayIncome, todayExpense, monthlyIncome, monthlyExpense });
      } catch (e) {
        console.error("SecretaryInsightCard stats error:", e);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, [refreshKey]);

  const insight = useMemo(() => {
    if (statsLoading) return "";
    const dataInsight = generateInsight(stats);
    // 데이터 기반 인사이트가 기본 메시지이면 일반 팁으로 대체
    if (dataInsight === "오늘도 좋은 하루 보내세요!") {
      return generalTips[(refreshKey + new Date().getMinutes()) % generalTips.length];
    }
    return dataInsight;
  }, [stats, statsLoading, refreshKey]);

  const greeting = useMemo(() => getTimeGreeting(), [refreshKey]);

  if (profileLoading || statsLoading) {
    return (
      <div className={cn(
        "rounded-xl p-4 h-full flex flex-col",
        isHero
          ? "bg-white/10 backdrop-blur-md border border-white/15"
          : "bg-card border border-border shadow-sm"
      )}>
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className={cn("h-8 w-8 rounded-full", isHero ? "bg-white/20" : "")} />
          <Skeleton className={cn("h-4 w-32", isHero ? "bg-white/20" : "")} />
        </div>
        <Skeleton className={cn("h-3 w-full mb-2", isHero ? "bg-white/20" : "")} />
        <Skeleton className={cn("h-3 w-3/4", isHero ? "bg-white/20" : "")} />
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl p-4 h-full flex flex-col",
      isHero
        ? "bg-white/10 backdrop-blur-md border border-white/15"
        : "bg-card border border-border shadow-sm"
    )}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            isHero ? "bg-white/20" : "bg-primary/10"
          )}>
            <Lightbulb className={cn("h-4 w-4", isHero ? "text-white" : "text-primary")} />
          </div>
          <h4 className={cn("font-semibold text-sm", isHero ? "text-white" : "text-foreground")}>
            {secretaryName}의 한마디
          </h4>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", isHero ? "text-white/60 hover:text-white hover:bg-white/10" : "text-muted-foreground hover:text-foreground")}
          onClick={() => setRefreshKey(k => k + 1)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* 인사말 */}
      <p className={cn("text-xs mb-2", isHero ? "text-white/60" : "text-muted-foreground")}>
        {greeting}
      </p>

      {/* 인사이트 */}
      <div className={cn(
        "flex-1 flex items-start gap-2 rounded-lg p-3",
        isHero ? "bg-white/10" : "bg-muted/50"
      )}>
        <Sparkles className={cn("h-4 w-4 shrink-0 mt-0.5", isHero ? "text-white/70" : "text-primary/60")} />
        <p className={cn("text-sm leading-relaxed", isHero ? "text-white/90" : "text-foreground/80")}>
          {insight}
        </p>
      </div>
    </div>
  );
}
