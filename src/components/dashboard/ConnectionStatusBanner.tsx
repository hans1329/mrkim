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
import { useProfile } from "@/hooks/useProfile";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UrgentAlert {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

// Mock urgent alerts - 연동 완료 후 AI 엔진에서 생성
const createMockUrgentAlerts = (navigate: ReturnType<typeof useNavigate>): UrgentAlert[] => [
  {
    id: "1",
    title: "부가세 신고 마감 임박",
    description: "1월 25일까지 부가세 신고를 완료해야 합니다.",
    actionLabel: "확인하기",
    onAction: () => navigate("/reports?tab=expense"),
  },
];

interface ConnectionStatusBannerProps {
  isLoggedOut?: boolean;
}

export function ConnectionStatusBanner({ isLoggedOut = false }: ConnectionStatusBannerProps) {
  const navigate = useNavigate();
  const { profile, loading, refetch } = useProfile();
  const [alerts] = useState<UrgentAlert[]>(() => createMockUrgentAlerts(navigate));
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // 페이지로 돌아올 때 프로필 다시 가져오기
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };

    const handleFocus = () => {
      refetch();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refetch]);

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
    setShowLoginDialog(false);
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
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-sm">
            데이터 연동을 완료해주세요
          </h4>
          <span className="text-xs text-muted-foreground">
            0/{totalConnections}
          </span>
        </div>
          
        <p className="text-xs text-muted-foreground mb-3">
          연동하면 김비서가 실시간으로 사업 현황을 분석해드려요
        </p>

        {/* 연동 상태 표시 - 모두 미연동 */}
        <div className="flex items-center gap-2 mb-3">
          {connections.map((conn) => (
            <div
              key={conn.key}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground"
            >
              <Clock className="h-3 w-3" />
              {conn.label}
            </div>
          ))}
        </div>

        {/* 진행률 바 */}
        <div className="mb-3">
          <Progress value={0} className="h-1.5" />
        </div>

        <Button
          size="sm"
          className="h-8 text-xs gap-1"
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
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-sm">
            데이터 연동을 완료해주세요
          </h4>
          <span className="text-xs text-muted-foreground">
            {connectedCount}/{totalConnections}
          </span>
        </div>
          
        <p className="text-xs text-muted-foreground mb-3">
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
                  ? "bg-green-500 text-white" 
                  : "bg-muted text-muted-foreground"
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
          <Progress value={progressPercent} className="h-1.5" />
        </div>

        <Button
          size="sm"
          className="h-8 text-xs gap-1"
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
            onClick={currentAlert.onAction}
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
