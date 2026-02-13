import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Link2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useConnection } from "@/contexts/ConnectionContext";
import { formatCurrency } from "@/data/mockData";
import { useIsMobile } from "@/hooks/use-mobile";

interface SummaryStats {
  todayIncome: number;
  todayExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
  isLoading: boolean;
}

// 연동되지 않은 상태의 플레이스홀더 카드
function EmptyStatCard({
  title,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  icon: React.ElementType;
  variant?: "default" | "primary" | "success";
}) {
  const variantStyles = {
    default: "bg-card border-dashed border-2 border-muted",
    primary: "bg-primary/10 border-dashed border-2 border-primary/30",
    success: "bg-success/10 border-dashed border-2 border-success/30",
  };

  const iconStyles = {
    default: "bg-muted/50 text-muted-foreground",
    primary: "bg-primary/20 text-primary",
    success: "bg-success/20 text-success",
  };

  return (
    <Card className={cn("overflow-hidden transition-shadow", variantStyles[variant])}>
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <div className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconStyles[variant]
          )}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium text-muted-foreground truncate">
              {title}
            </p>
            <p className="text-sm font-medium text-muted-foreground/60">—</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 실제 데이터가 있는 카드
function RealStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  isHero = false,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  variant?: "default" | "primary" | "success";
  isHero?: boolean;
}) {
  const variantStyles = {
    default: isHero ? "bg-white/15 backdrop-blur-md border border-red-400/50 text-white" : "bg-card border border-red-400/50",
    primary: isHero ? "bg-white/25 backdrop-blur-md border border-green-400/60 text-white" : "bg-primary text-primary-foreground border border-green-400/60",
    success: isHero ? "bg-white/25 backdrop-blur-md border border-green-400/60 text-white" : "bg-success text-success-foreground border border-green-400/60",
  };

  const iconVariantStyles = {
    default: isHero ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
    primary: isHero ? "bg-white/30 text-white" : "bg-primary-foreground/20 text-primary-foreground",
    success: isHero ? "bg-white/30 text-white" : "bg-success-foreground/20 text-success-foreground",
  };

  return (
    <Card className={cn("overflow-hidden transition-shadow", variantStyles[variant])}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
            iconVariantStyles[variant]
          )}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <p className={cn(
            "text-xs font-medium truncate",
            isHero ? "text-white/80" : (variant === "default" ? "text-muted-foreground" : "opacity-80")
          )}>
            {title}
          </p>
        </div>
        <p className="text-sm md:text-lg font-bold leading-tight text-right">{value}</p>
        {(subtitle || trend) && (
          <div className="flex items-center gap-1 mt-0.5 pl-0.5">
            {trend && (
              <span className={cn(
                "text-[10px] font-semibold",
                variant === "default" 
                  ? (trend.isPositive ? "text-success" : "text-destructive")
                  : "text-current opacity-90"
              )}>
                {trend.isPositive ? "↑" : "↓"}{trend.value}%
              </span>
            )}
            {subtitle && (
              <span className={cn(
                "text-[10px] truncate",
                variant === "default" ? "text-muted-foreground" : "opacity-70"
              )}>
                {subtitle}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 로딩 스켈레톤 카드
function SkeletonStatCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start gap-2.5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface TodaySummarySectionProps {
  isLoggedOut?: boolean;
  isHero?: boolean;
}

export function TodaySummarySection({ isLoggedOut = false, isHero = false }: TodaySummarySectionProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // ConnectionContext에서 캐시된 프로필 사용 (중복 API 호출 방지)
  const { profile, profileLoading } = useConnection();
  const [stats, setStats] = useState<SummaryStats>({
    todayIncome: 0,
    todayExpense: 0,
    monthlyIncome: 0,
    monthlyExpense: 0,
    isLoading: true,
  });

  // 연동 상태 확인
  const isAnyConnected = profile?.hometax_connected || profile?.card_connected || profile?.account_connected;
  const isAllLoading = profileLoading || stats.isLoading;

  // 실제 거래 데이터 불러오기
  useEffect(() => {
    const fetchStats = async () => {
      // 로그아웃 상태면 로딩 종료
      if (isLoggedOut) {
        setStats(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setStats(prev => ({ ...prev, isLoading: false }));
          return;
        }

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

        const [todayResult, monthlyResult] = await Promise.all([
          supabase
            .from("transactions")
            .select("amount, type")
            .eq("user_id", user.id)
            .eq("transaction_date", todayStr),
          supabase
            .from("transactions")
            .select("amount, type")
            .eq("user_id", user.id)
            .gte("transaction_date", monthStart)
            .lte("transaction_date", todayStr),
        ]);

        let todayIncome = 0, todayExpense = 0;
        if (todayResult.data) {
          todayResult.data.forEach((tx) => {
            if (tx.type === "income") todayIncome += Number(tx.amount);
            else if (tx.type === "expense") todayExpense += Number(tx.amount);
          });
        }

        let monthlyIncome = 0, monthlyExpense = 0;
        if (monthlyResult.data) {
          monthlyResult.data.forEach((tx) => {
            if (tx.type === "income") monthlyIncome += Number(tx.amount);
            else if (tx.type === "expense") monthlyExpense += Number(tx.amount);
          });
        }

        setStats({
          todayIncome,
          todayExpense,
          monthlyIncome,
          monthlyExpense,
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to fetch summary stats:", error);
        setStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchStats();
  }, [isLoggedOut]);

  const monthlyProfit = stats.monthlyIncome - stats.monthlyExpense;
  // 매출 또는 지출 중 하나라도 있으면 데이터 있음으로 판단
  const hasAnyData = stats.todayIncome > 0 || stats.todayExpense > 0 || stats.monthlyIncome > 0 || stats.monthlyExpense > 0;

  // 로그아웃 상태: 목업 데이터 표시
  if (isLoggedOut) {
    return (
      <section>
        <h2 className={cn("mb-3 text-base font-semibold", isHero ? "text-white" : "text-foreground")}>오늘의 요약</h2>
        <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-4 gap-3"}>
          <RealStatCard
            title="오늘 매출"
            value={formatCurrency(1250000)}
            icon={TrendingUp}
            variant="primary"
            isHero={isHero}
          />
          <RealStatCard
            title="오늘 지출"
            value={formatCurrency(320000)}
            icon={TrendingDown}
            isHero={isHero}
          />
          <RealStatCard
            title="이번 달 지출"
            value={formatCurrency(4850000)}
            icon={Wallet}
            isHero={isHero}
          />
          <RealStatCard
            title="이번 달 순이익"
            value={formatCurrency(8750000)}
            icon={PiggyBank}
            variant="success"
            isHero={isHero}
          />
        </div>
      </section>
    );
  }

  // 로딩 중
  if (isAllLoading) {
    return (
      <section>
        <h2 className={cn("mb-3 text-base font-semibold", isHero ? "text-white" : "text-foreground")}>오늘의 요약</h2>
        <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-4 gap-3"}>
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
      </section>
    );
  }

  // 로그인 + 미연동: 연동 유도 UI
  if (!isAnyConnected) {
    return (
      <section>
        <h2 className={cn("mb-3 text-base font-semibold", isHero ? "text-white" : "text-foreground")}>오늘의 요약</h2>
        <Card className={cn("border-dashed border-2", isHero ? "border-white/30 bg-white/10 backdrop-blur-md" : "border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10")}>
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className={cn("h-14 w-14 rounded-full flex items-center justify-center", isHero ? "bg-white/20" : "bg-primary/20")}>
                <Link2 className={cn("h-7 w-7", isHero ? "text-white" : "text-primary")} />
              </div>
              <div className="space-y-2">
                <h3 className={cn("font-semibold", isHero ? "text-white" : "text-foreground")}>데이터를 연동해보세요</h3>
                <p className={cn("text-sm max-w-sm", isHero ? "text-white/70" : "text-muted-foreground")}>
                  카드, 계좌, 국세청을 연동하면 실시간 매출/지출 현황을<br className="hidden sm:block" />
                  한눈에 확인할 수 있어요
                </p>
              </div>
              <Button 
                onClick={() => navigate("/onboarding")}
                className="gap-2 rounded-full"
              >
                <Sparkles className="h-4 w-4" />
                연동 시작하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // 연동은 되었지만 데이터가 없는 경우
  if (!hasAnyData) {
    return (
      <section>
        <h2 className={cn("mb-3 text-base font-semibold", isHero ? "text-white" : "text-foreground")}>오늘의 요약</h2>
        <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-4 gap-3"}>
          <EmptyStatCard title="오늘 매출" icon={TrendingUp} variant="primary" />
          <EmptyStatCard title="오늘 지출" icon={TrendingDown} />
          <EmptyStatCard title="이번 달 지출" icon={Wallet} />
          <EmptyStatCard title="이번 달 순이익" icon={PiggyBank} variant="success" />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          아직 이번 달 거래 내역이 없어요. 거래가 발생하면 자동으로 업데이트돼요!
        </p>
      </section>
    );
  }

  // 실제 데이터 표시
    return (
      <section>
        <h2 className={cn("mb-3 text-base font-semibold", isHero ? "text-white" : "text-foreground")}>오늘의 요약</h2>
      <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-4 gap-3"}>
        <RealStatCard
          title="오늘 매출"
          value={stats.todayIncome > 0 ? formatCurrency(stats.todayIncome) : "₩0"}
          icon={TrendingUp}
          variant="primary"
          isHero={isHero}
        />
        <RealStatCard
          title="오늘 지출"
          value={stats.todayExpense > 0 ? formatCurrency(stats.todayExpense) : "₩0"}
          icon={TrendingDown}
          isHero={isHero}
        />
        <RealStatCard
          title="이번 달 지출"
          value={stats.monthlyExpense > 0 ? formatCurrency(stats.monthlyExpense) : "₩0"}
          icon={Wallet}
          isHero={isHero}
        />
        <RealStatCard
          title="이번 달 순이익"
          value={formatCurrency(monthlyProfit)}
          icon={PiggyBank}
          variant="success"
          isHero={isHero}
        />
      </div>
    </section>
  );
}