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

// 시간대별 인사말 (11종)
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 7) return "이른 아침부터 부지런하시네요!";
  if (hour < 9) return "좋은 아침이에요! 오늘도 파이팅!";
  if (hour < 10) return "상쾌한 아침이에요!";
  if (hour < 12) return "오전도 화이팅이에요!";
  if (hour < 13) return "점심 맛있게 드세요!";
  if (hour < 14) return "점심은 드셨나요?";
  if (hour < 16) return "오후도 힘내세요!";
  if (hour < 18) return "퇴근 시간이 다가오고 있어요!";
  if (hour < 20) return "오늘 하루 수고하셨어요!";
  if (hour < 22) return "편안한 저녁 보내세요!";
  return "늦은 시간까지 고생이 많으세요!";
}

// 데이터 기반 인사이트 생성 (다중 반환)
function generateInsights(stats: { todayIncome: number; todayExpense: number; monthlyIncome: number; monthlyExpense: number } | null): string[] {
  if (!stats) return [];
  const insights: string[] = [];
  const { todayIncome, todayExpense, monthlyIncome, monthlyExpense } = stats;

  if (todayIncome > 0 && todayExpense > 0) {
    const ratio = Math.round((todayExpense / todayIncome) * 100);
    if (ratio > 80) {
      insights.push("오늘 지출 비중이 높아요. 비용 항목을 점검해보세요.");
      insights.push("매출 대비 지출이 많은 날이에요. 고정비를 확인해보세요.");
    } else if (ratio < 30) {
      insights.push("오늘 수익성이 좋아요! 이 페이스를 유지해보세요.");
      insights.push("지출을 잘 관리하고 계시네요! 훌륭해요.");
    } else {
      insights.push("오늘 매출과 지출 균형이 적절해요.");
      insights.push("안정적인 수익 구조를 유지하고 계시네요.");
    }
    const net = todayIncome - todayExpense;
    if (net > 0) insights.push("오늘 순이익이 발생하고 있어요. 좋은 흐름이에요!");
  }

  if (todayIncome > 0) {
    insights.push("오늘 매출이 발생했어요! 좋은 시작이에요.");
    insights.push("매출이 들어오고 있어요. 오늘 목표를 세워보는 건 어떨까요?");
  }
  if (todayExpense > 0) {
    insights.push("오늘 지출이 있었어요. 매출도 곧 따라올 거예요!");
    insights.push("지출 내역을 한눈에 확인하려면 거래 메뉴를 이용해보세요.");
  }

  if (monthlyIncome > 0) {
    const dayOfMonth = new Date().getDate();
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const remaining = daysInMonth - dayOfMonth;
    insights.push(`이번 달 남은 ${remaining}일, 더 좋은 성과를 기대해요!`);
    insights.push("이번 달도 꾸준히 잘 하고 계세요.");
    if (dayOfMonth <= 7) insights.push("월초에요! 이번 달 경영 목표를 세워보세요.");
    if (dayOfMonth > 15) insights.push("이번 달 후반부에요. 월간 목표를 점검해보세요!");
    if (dayOfMonth > 25) insights.push("월말이 다가와요. 다음 달 준비를 시작해보세요!");
  }

  if (monthlyExpense > 0 && monthlyIncome > 0) {
    const monthlyNet = monthlyIncome - monthlyExpense;
    if (monthlyNet > 0) insights.push("이번 달 순이익이 발생하고 있어요!");
    else insights.push("이번 달 지출이 매출보다 많아요. 비용 절감 포인트를 찾아보세요.");
  }

  return insights;
}

// 일반 경영 팁 (30종)
const generalTips = [
  // 자금 관리 (8종)
  "정기적인 지출 점검으로 불필요한 비용을 줄일 수 있어요.",
  "카드 매출은 2~3일 후 입금되니 자금 계획 시 참고하세요.",
  "비상금을 매출의 10~20% 정도 유지하면 안심이에요.",
  "고정 지출을 줄이면 수익성이 크게 개선될 수 있어요.",
  "매달 고정비와 변동비를 구분해서 관리해보세요.",
  "통장을 용도별로 분리하면 자금 흐름 파악이 쉬워요.",
  "월말에 다음 달 예상 지출을 미리 계산해두면 좋아요.",
  "현금흐름표를 주기적으로 확인하면 자금난을 예방할 수 있어요.",
  // 세금/신고 (7종)
  "세금계산서는 발행 즉시 정리하면 신고 시 편해요.",
  "부가세 신고 기간 전에 매입 세금계산서를 꼭 확인하세요.",
  "간이과세자는 연 매출 8,000만원 기준을 체크해보세요.",
  "경비 처리 가능한 항목을 미리 파악해두면 절세에 도움돼요.",
  "사업용 카드 사용 내역은 자동으로 경비 증빙이 돼요.",
  "홈택스에서 전자세금계산서 발급 내역을 수시로 확인하세요.",
  "종합소득세는 5월에 신고해요. 미리미리 준비하세요!",
  // 매출/영업 (7종)
  "매출이 늘어나는 요일 패턴을 파악해보세요.",
  "단골 고객 비율을 높이면 안정적인 매출을 유지할 수 있어요.",
  "계절별 매출 변동을 미리 예측하면 재고 관리에 도움돼요.",
  "신규 고객 유입 채널을 분석해보세요.",
  "매출 목표를 주 단위로 쪼개면 달성이 쉬워져요.",
  "고객 리뷰에 답변하면 재방문율이 높아진다는 연구 결과가 있어요.",
  "온라인 마케팅은 소액으로도 시작할 수 있어요.",
  // 직원/인사 (5종)
  "직원 급여일 전에 자금을 미리 확보해두세요.",
  "4대보험 신고는 매월 10일까지 완료해야 해요.",
  "알바생도 주 15시간 이상이면 주휴수당이 발생해요.",
  "근로계약서는 반드시 서면으로 작성하고 보관하세요.",
  "직원 칭찬은 업무 동기 부여에 큰 효과가 있어요!",
  // 일반 경영 (3종)
  "매주 30분만 투자해서 주간 경영 현황을 점검해보세요.",
  "거래처와의 결제 조건을 주기적으로 재협상해보세요.",
  "업종별 평균 영업이익률과 비교해보는 것도 좋아요.",
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
    const dataInsights = generateInsights(stats);
    // 데이터 기반 인사이트와 일반 팁을 합친 풀에서 선택
    const pool = dataInsights.length > 0 ? dataInsights : generalTips;
    return pool[(refreshKey + new Date().getMinutes()) % pool.length];
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
