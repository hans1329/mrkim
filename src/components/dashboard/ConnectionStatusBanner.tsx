import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, X, ChevronRight, CheckCircle2, Clock, Sparkles, RefreshCw } from "lucide-react";
import { useConnectionDrawer } from "@/contexts/ConnectionDrawerContext";
import { toast } from "sonner";
import { SecretaryInsightCard } from "./SecretaryInsightCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn, josa } from "@/lib/utils";
import { useConnection } from "@/contexts/ConnectionContext";

import { supabase } from "@/integrations/supabase/client";
import { useUnclassifiedCount } from "@/hooks/useDashboardStats";

interface UrgentAlert {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  route: string;
  daysLeft?: number;
}

function generateRealAlerts(unclassifiedCount: number): UrgentAlert[] {
  const alerts: UrgentAlert[] = [];
  const now = new Date();

  const taxDeadlines = [
    { month: 1, day: 25, label: "부가세 신고" },
    { month: 5, day: 31, label: "종합소득세 신고" },
    { month: 7, day: 25, label: "부가세 신고" },
  ];

  let nearest: { diff: number; d: typeof taxDeadlines[0] } | null = null;
  for (const deadline of taxDeadlines) {
    for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
      const deadlineDate = new Date(year, deadline.month - 1, deadline.day);
      const diffDays = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0 && (!nearest || diffDays < nearest.diff)) {
        nearest = { diff: diffDays, d: deadline };
      }
    }
  }

  if (nearest) {
    alerts.push({
      id: `tax-${nearest.d.label}-${nearest.d.month}`,
      title: `${nearest.d.label} 마감 D-${nearest.diff}`,
      description: `${nearest.d.month}월 ${nearest.d.day}일까지 ${nearest.d.label}를 완료해야 합니다.`,
      actionLabel: "확인하기",
      route: "/reports?tab=tax",
      daysLeft: nearest.diff,
    });
  }

  if (unclassifiedCount > 0) {
    alerts.push({
      id: "unclassified",
      title: `미분류 거래 ${unclassifiedCount}건 확인 필요`,
      description: "분류되지 않은 거래가 있습니다. 정확한 분석을 위해 분류해주세요.",
      actionLabel: "분류하기",
      route: "/transactions",
    });
  }

  return alerts;
}

interface ConnectionStatusBannerProps {
  isLoggedOut?: boolean;
  isHero?: boolean;
}

export function ConnectionStatusBanner({ isLoggedOut = false, isHero = false }: ConnectionStatusBannerProps) {
  const navigate = useNavigate();
  const { openDrawer } = useConnectionDrawer();
  const { profile, profileLoading: loading, isLoggedIn, hometaxConnected, cardConnected, accountConnected, deliveryConnected } = useConnection();
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const secretaryName = profile?.secretary_name || "김비서";

  // React Query 캐싱 적용
  const { data: unclassifiedCount = 0 } = useUnclassifiedCount(!isLoggedOut && !loading && isLoggedIn);

  // 알림 생성 (메모이제이션)
  const alerts = useMemo(() => {
    if (isLoggedOut || loading) return [];
    return generateRealAlerts(unclassifiedCount);
  }, [isLoggedOut, loading, unclassifiedCount]);

  const handleStartConnection = () => {
    openDrawer();
  };

  const handleLoginConfirm = () => {
    navigate("/login?redirect=/");
  };

  const connections = [
    { key: "hometax", label: "국세청", connected: hometaxConnected },
    { key: "card", label: "카드", connected: cardConnected },
    { key: "account", label: "계좌", connected: accountConnected },
    { key: "delivery", label: "배달", connected: deliveryConnected },
  ];
  
  const connectedCount = connections.filter(c => c.connected).length;
  const totalConnections = connections.length;
  const isFullyConnected = connectedCount === totalConnections;
  const progressPercent = (connectedCount / totalConnections) * 100;

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id));

  const handleDismissAlert = (id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  // 로그아웃 상태 — 연동 안내는 TodaySummarySection에서 처리
  if (isLoggedOut) {
    return <SecretaryInsightCard isHero={isHero} />;
  }

  // 연동 0건 — TodaySummarySection의 연동 안내 카드로 대체
  if (connectedCount === 0) {
    return <SecretaryInsightCard isHero={isHero} />;
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-muted/50 border p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-3 w-48 mb-3" />
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <Skeleton className="h-1.5 w-full mb-3" />
        <Skeleton className="h-8 w-28" />
      </div>
    );
  }

  if (!isFullyConnected && connectedCount > 0) {
    return (
      <div className={cn(
        "rounded-xl p-4 h-full flex flex-col",
        !isHero && "mb-4",
        isHero 
          ? "bg-white/15 backdrop-blur-md border border-white/20" 
          : "bg-card border border-border shadow-sm"
      )}>
        <div className="flex items-center gap-2 mb-1">
          <h4 className={cn("font-semibold text-sm", isHero && "text-white")}>
            데이터 연동을 완료해주세요
          </h4>
          <span className={cn("text-xs", isHero ? "text-white/70" : "text-muted-foreground")}>
            {connectedCount}/{totalConnections}
          </span>
        </div>
          
        <p className={cn("text-xs font-normal mb-3", isHero ? "text-white/70" : "text-muted-foreground")}>
          연동하면 {josa(secretaryName, "이/가")} 실시간으로 사업 현황을 분석해드려요
        </p>

        <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar py-0.5">
          {connections.map((conn) => (
            <div
              key={conn.key}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap shrink-0",
                conn.connected 
                  ? (isHero 
                      ? "bg-emerald-400/30 text-white ring-1 ring-emerald-300/40" 
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-700/50")
                  : (isHero 
                      ? "bg-white/10 text-white/60" 
                      : "bg-muted/60 text-muted-foreground/60")
              )}
            >
              {conn.connected ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Clock className="h-3 w-3 opacity-60" />
              )}
              {conn.label}
            </div>
          ))}
        </div>

        <div className="mb-3">
          <Progress value={progressPercent} className={cn("h-1.5", isHero && "[&]:bg-white/20 [&>div]:bg-white/60")} />
        </div>

        <Button
          size="sm"
          className={cn("h-10 gap-1 rounded-full", isHero && "bg-white text-primary hover:bg-white/90")}
          onClick={handleStartConnection}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {connectedCount > 0 ? "이어서 연동하기" : "연동 시작하기"}
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (visibleAlerts.length === 0) {
    return <SecretaryInsightCard isHero={isHero} />;
  }

  const currentAlert = visibleAlerts[0];
  const isUrgent = currentAlert.daysLeft !== undefined && currentAlert.daysLeft <= 10;

  return (
    <div className={cn(
      "relative rounded-xl backdrop-blur-md p-4 mb-4 min-h-[180px] flex flex-col shadow-sm",
      isUrgent
        ? "bg-white/80 border border-destructive/25"
        : "bg-white/80 border border-primary/25"
    )}>
      <button
        className={cn(
          "absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center transition-colors",
          isUrgent ? "bg-destructive/20 hover:bg-destructive/30" : "bg-primary/20 hover:bg-primary/30"
        )}
        onClick={() => handleDismissAlert(currentAlert.id)}
      >
        <X className={cn("h-3.5 w-3.5", isUrgent ? "text-destructive" : "text-primary")} />
      </button>

      <div className="flex items-start gap-3 mt-8">
        <div className="shrink-0 mt-0.5">
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center",
            isUrgent ? "bg-destructive/20" : "bg-primary/20"
          )}>
            <AlertTriangle className={cn("h-4 w-4", isUrgent ? "text-destructive" : "text-primary")} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={cn("font-semibold text-sm", isUrgent ? "text-destructive" : "text-primary")}>
            {currentAlert.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentAlert.description}
          </p>
        </div>
      </div>

      <div className="flex justify-end mt-auto pt-3">
        <Button
          size="sm"
          variant={isUrgent ? "destructive" : "default"}
          className="h-8 text-xs rounded-full px-4"
          onClick={() => navigate(currentAlert.route)}
        >
          {currentAlert.actionLabel}
          <ChevronRight className="h-3 w-3 ml-1" />
        </Button>
      </div>
      
      {visibleAlerts.length > 1 && (
        <div className={cn("mt-2 pt-2 border-t", isUrgent ? "border-destructive/20" : "border-primary/20")}>
          <span className="text-xs text-muted-foreground">
            +{visibleAlerts.length - 1}개의 알림이 더 있습니다
          </span>
        </div>
      )}
    </div>
  );
}
