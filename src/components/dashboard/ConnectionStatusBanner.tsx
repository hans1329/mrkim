import { useNavigate } from "react-router-dom";
import { AlertTriangle, X, ChevronRight, CheckCircle2, Clock, Sparkles } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useConnection } from "@/contexts/ConnectionContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UrgentAlert {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  route: string;
}

// 실제 데이터 기반 긴급 알림 생성
function generateRealAlerts(
  unclassifiedCount: number,
  navigate: ReturnType<typeof useNavigate>
): UrgentAlert[] {
  const alerts: UrgentAlert[] = [];
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const day = now.getDate();

  // 가장 가까운 세금 마감일 표시
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
    });
  }

  // 미분류 거래 알림
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
  // ConnectionContext에서 캐시된 프로필 사용 (중복 API 호출 방지)
  const { profile, profileLoading: loading } = useConnection();
  const [alerts, setAlerts] = useState<UrgentAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // 실제 데이터 기반 알림 생성
  useEffect(() => {
    if (isLoggedOut || loading) return;
    
    const fetchUnclassifiedCount = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { count } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("category", null);
      
      const realAlerts = generateRealAlerts(count || 0, navigate);
      setAlerts(realAlerts);
    };
    
    fetchUnclassifiedCount();
  }, [isLoggedOut, loading, navigate]);

  // React Query가 캐싱과 refetch를 자동 관리하므로 별도의 visibility/focus 핸들러 불필요

  // 연동 시작 버튼 핸들러 - 로그인 여부 확인
  const handleStartConnection = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      navigate("/onboarding");
    } else {
      setShowLoginDialog(true);
    }
  };

  const handleLoginConfirm = () => {
    // AlertDialogAction이 자동으로 다이얼로그를 닫으므로 상태 변경 불필요
    navigate("/login?redirect=/onboarding");
  };

  // 프로필에서 실제 연동 상태 가져오기
  const connections = [
    { key: "hometax", label: "국세청", connected: profile?.hometax_connected ?? false },
    { key: "card", label: "카드", connected: profile?.card_connected ?? false },
    { key: "account", label: "계좌", connected: profile?.account_connected ?? false },
  ];
  
  const connectedCount = connections.filter(c => c.connected).length;
  const totalConnections = connections.length;
  const isFullyConnected = connectedCount === totalConnections;
  const progressPercent = (connectedCount / totalConnections) * 100;

  // 긴급 알림 (연동 완료 시에만)
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.includes(alert.id));

  const handleDismissAlert = (id: string) => {
    setDismissedAlerts(prev => [...prev, id]);
  };

  // 로그아웃 상태: 항상 연동 배너 표시 (목업 상태)
  if (isLoggedOut) {
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
            0/{totalConnections}
          </span>
        </div>
          
        <p className={cn("text-xs mb-3", isHero ? "text-white/70" : "text-muted-foreground")}>
          연동하면 김비서가 실시간으로 사업 현황을 분석해드려요
        </p>

        {/* 연동 상태 표시 - 모두 미연동 */}
        <div className="flex items-center gap-2 mb-3">
          {connections.map((conn) => (
            <div
              key={conn.key}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                isHero ? "bg-white/20 text-white/80" : "bg-muted text-muted-foreground"
              )}
            >
              <Clock className="h-3 w-3" />
              {conn.label}
            </div>
          ))}
        </div>

        {/* 진행률 바 */}
        <div className="mb-3">
          <Progress value={0} className={cn("h-1.5", isHero && "[&]:bg-white/20 [&>div]:bg-white/60")} />
        </div>

        <Button
          size="sm"
          className={cn("h-8 text-xs gap-1 rounded-full", isHero && "bg-white text-primary hover:bg-white/90")}
          onClick={handleStartConnection}
        >
          <Sparkles className="h-3.5 w-3.5" />
          연동 시작하기
          <ChevronRight className="h-3 w-3" />
        </Button>

        {/* 로그인 필요 다이얼로그 */}
        <AlertDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>로그인이 필요합니다</AlertDialogTitle>
              <AlertDialogDescription>
                데이터 연동을 위해 먼저 로그인해주세요.
                로그인 후 연동 화면으로 이동합니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={handleLoginConfirm}>
                로그인하기
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // 로딩 중일 때 스켈레톤 표시
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

  // 연동이 완료되지 않은 경우: 연동 상태 배너
  if (!isFullyConnected) {
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
          
        <p className={cn("text-xs mb-3", isHero ? "text-white/70" : "text-muted-foreground")}>
          연동하면 김비서가 실시간으로 사업 현황을 분석해드려요
        </p>

        {/* 연동 상태 표시 */}
        <div className="flex items-center gap-2 mb-3">
          {connections.map((conn) => (
            <div
              key={conn.key}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                conn.connected 
                  ? (isHero ? "bg-white/30 text-white" : "bg-success text-success-foreground")
                  : (isHero ? "bg-white/20 text-white/80" : "bg-muted text-muted-foreground")
              )}
            >
              {conn.connected ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {conn.label}
            </div>
          ))}
        </div>

        {/* 진행률 바 */}
        <div className="mb-3">
          <Progress value={progressPercent} className={cn("h-1.5", isHero && "[&]:bg-white/20 [&>div]:bg-white/60")} />
        </div>

        <Button
          size="sm"
          className={cn("h-8 text-xs gap-1 rounded-full", isHero && "bg-white text-primary hover:bg-white/90")}
          onClick={handleStartConnection}
        >
          <Sparkles className="h-3.5 w-3.5" />
          {connectedCount > 0 ? "이어서 연동하기" : "연동 시작하기"}
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // 연동 완료 + 긴급 알림이 없는 경우: 표시 안 함
  if (visibleAlerts.length === 0) {
    return null;
  }

  // 연동 완료 + 긴급 알림 있는 경우: 긴급 알림 배너
  const currentAlert = visibleAlerts[0];

  return (
    <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm text-destructive">
                {currentAlert.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentAlert.description}
              </p>
            </div>
            <button
              className="h-6 w-6 shrink-0 rounded-full bg-foreground/20 flex items-center justify-center hover:bg-foreground/30 transition-colors"
              onClick={() => handleDismissAlert(currentAlert.id)}
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs mt-2"
            onClick={() => navigate(currentAlert.route)}
          >
            {currentAlert.actionLabel}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
      
      {visibleAlerts.length > 1 && (
        <div className="mt-2 pt-2 border-t border-destructive/20">
          <span className="text-xs text-muted-foreground">
            +{visibleAlerts.length - 1}개의 알림이 더 있습니다
          </span>
        </div>
      )}
    </div>
  );
}
