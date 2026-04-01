import { useNavigate } from "react-router-dom";
import { useConnectionDrawer } from "@/contexts/ConnectionDrawerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, Link2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnection } from "@/contexts/ConnectionContext";
import { formatCurrency } from "@/data/mockData";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDashboardStats } from "@/hooks/useDashboardStats";

// 연동되지 않은 상태의 플레이스홀더 카드
function EmptyStatCard({
  title,
  icon: Icon,
  variant = "default",
  isHero = false,
}: {
  title: string;
  icon: React.ElementType;
  variant?: "default" | "primary" | "success";
  isHero?: boolean;
}) {
  const variantStyles = {
    default: isHero ? "bg-white/10 backdrop-blur-md border border-white/15 text-white" : "bg-muted/30 border border-border/50",
    primary: isHero ? "bg-white/15 backdrop-blur-md border border-white/20 text-white" : "bg-primary/10 border border-primary/30",
    success: isHero ? "bg-white/15 backdrop-blur-md border border-white/20 text-white" : "bg-success/10 border border-success/30",
  };

  const iconStyles = {
    default: isHero ? "bg-white/20 text-white/60" : "bg-muted/60 text-muted-foreground/60",
    primary: isHero ? "bg-white/25 text-white/70" : "bg-primary/20 text-primary/60",
    success: isHero ? "bg-white/25 text-white/70" : "bg-success/20 text-success/60",
  };

  return (
    <Card className={cn("overflow-hidden transition-shadow", variantStyles[variant])}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
            iconStyles[variant]
          )}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <p className={cn(
            "text-xs font-medium truncate",
            isHero ? "text-white/70" : "text-muted-foreground"
          )}>
            {title}
          </p>
        </div>
        <p className={cn("text-sm font-bold text-right", isHero ? "text-white/40" : "text-muted-foreground/40")}>₩0</p>
        <p className={cn("text-[10px] mt-0.5", isHero ? "text-white/40" : "text-muted-foreground/40")}>거래 없음</p>
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
    default: isHero ? "bg-white/10 backdrop-blur-md border border-white/15 text-white" : "bg-card border border-red-400/50",
    primary: isHero ? "bg-white/15 backdrop-blur-md border border-white/20 text-white" : "bg-primary text-primary-foreground border border-green-400/60",
    success: isHero ? "bg-white/15 backdrop-blur-md border border-white/20 text-white" : "bg-success text-success-foreground border border-green-400/60",
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
  const { openDrawer } = useConnectionDrawer();
  const isMobile = useIsMobile();
  const { profile, profileLoading } = useConnection();
  
  // React Query 캐싱 적용
  const { data: stats, isLoading: statsLoading } = useDashboardStats(!isLoggedOut);

  const isAnyConnected = profile?.hometax_connected || profile?.card_connected || profile?.account_connected;
  const isAllLoading = profileLoading || statsLoading;

  const monthlyProfit = (stats?.monthlyIncome ?? 0) - (stats?.monthlyExpense ?? 0);
  const hasAnyData = (stats?.todayIncome ?? 0) > 0 || (stats?.todayExpense ?? 0) > 0 || (stats?.monthlyIncome ?? 0) > 0 || (stats?.monthlyExpense ?? 0) > 0;

  // 로그아웃 상태: 목업 데이터 표시
  if (isLoggedOut) {
    return (
      <section>
        <h2 className={cn("mb-3 text-base font-semibold", isHero ? "text-white" : "text-foreground")}>오늘의 요약</h2>
        <div className="grid grid-cols-2 gap-3">
          <RealStatCard title="이번 달 매출" value={formatCurrency(12500000)} subtitle="오늘 ₩1,250,000" icon={TrendingUp} variant="primary" isHero={isHero} />
          <RealStatCard title="이번 달 지출" value={formatCurrency(4850000)} subtitle="오늘 ₩320,000" icon={TrendingDown} isHero={isHero} />
        </div>
        <div className="mt-3">
          <RealStatCard title="이번 달 순이익" value={formatCurrency(8750000)} icon={PiggyBank} variant="success" isHero={isHero} />
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

  // 로그인 + 미연동
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
              <Button onClick={() => openDrawer("hometax")} className="gap-2 rounded-full">
                <Sparkles className="h-4 w-4" />
                연동 시작하기
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // 연동 + 데이터 없음
  if (!hasAnyData) {
    return (
      <section>
        <h2 className={cn("mb-3 text-base font-semibold", isHero ? "text-white" : "text-foreground")}>오늘의 요약</h2>
        <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-4 gap-3"}>
          <EmptyStatCard title="오늘 매출" icon={TrendingUp} variant="primary" isHero={isHero} />
          <EmptyStatCard title="오늘 지출" icon={TrendingDown} isHero={isHero} />
          <EmptyStatCard title="이번 달 지출" icon={Wallet} isHero={isHero} />
          <EmptyStatCard title="이번 달 순이익" icon={PiggyBank} variant="success" isHero={isHero} />
        </div>
        <p className={cn("text-xs text-center mt-3", isHero ? "text-white/70" : "text-muted-foreground")}>
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
        <RealStatCard title="오늘 매출" value={stats!.todayIncome > 0 ? formatCurrency(stats!.todayIncome) : "₩0"} icon={TrendingUp} variant="primary" isHero={isHero} />
        <RealStatCard title="오늘 지출" value={stats!.todayExpense > 0 ? formatCurrency(stats!.todayExpense) : "₩0"} icon={TrendingDown} isHero={isHero} />
        <RealStatCard title="이번 달 지출" value={stats!.monthlyExpense > 0 ? formatCurrency(stats!.monthlyExpense) : "₩0"} icon={Wallet} isHero={isHero} />
        <RealStatCard title="이번 달 순이익" value={formatCurrency(monthlyProfit)} icon={PiggyBank} variant="success" isHero={isHero} />
      </div>
    </section>
  );
}
