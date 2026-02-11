import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TodaySummarySection } from "@/components/dashboard/TodaySummarySection";
import { IntegratedConnectionCard } from "@/components/dashboard/IntegratedConnectionCard";
import { AIChatCard } from "@/components/dashboard/AIChatCard";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { TodayActionsCard } from "@/components/dashboard/TodayActionsCard";
import { ConnectionStatusBanner } from "@/components/dashboard/ConnectionStatusBanner";
import { HometaxSummaryCard } from "@/components/dashboard/HometaxSummaryCard";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { EmployeeSummaryCard } from "@/components/dashboard/EmployeeSummaryCard";
import { AutoTransferCard } from "@/components/dashboard/AutoTransferCard";
import { DepositCard } from "@/components/dashboard/DepositCard";
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useChat } from "@/contexts/ChatContext";
import { useConnection } from "@/contexts/ConnectionContext";
import { Bell, Settings, Receipt, Users, Wallet, TrendingUp, FileText, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// 가로 스크롤 퀵액션 버튼
const quickActions = [
  { label: "매출/매입", icon: Receipt, url: "/transactions" },
  { label: "직원관리", icon: Users, url: "/employees" },
  { label: "자금관리", icon: Wallet, url: "/funds" },
  { label: "리포트", icon: TrendingUp, url: "/reports" },
  { label: "세금계산서", icon: FileText, url: "/reports?tab=tax" },
  { label: "카드관리", icon: CreditCard, url: "/funds?tab=card" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { openChat } = useChat();
  const isMobile = useIsMobile();
  
  const {
    isLoggedOut,
    isLoggedInButNotConnected,
    isAnyConnected,
    isTransactionConnected,
    hometaxConnected,
    profile,
    profileLoading,
  } = useConnection();
  
  useEffect(() => {
    if (searchParams.get("openChat") === "true") {
      openChat();
      searchParams.delete("openChat");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, openChat, setSearchParams]);
  
  const userName = profileLoading ? "" : (profile?.nickname || profile?.name || null);
  const greeting = userName ? `${userName}님` : "사장님";

  // 스크롤 감지 - 헤더 배경 전환용
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const scrollContainer = document.getElementById("app-scroll-container");
    if (!scrollContainer) return;
    const handleScroll = () => setScrolled(scrollContainer.scrollTop > 20);
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
  }, []);

  // 모바일 헤더를 stickyHeader prop으로 분리하여 스크롤 컨테이너 직속 자식으로 렌더링
  const mobileHeader = isMobile ? (
    <div className={cn(
      "sticky top-0 z-30 px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-3 transition-all duration-300",
      scrolled
        ? "bg-background/80 backdrop-blur-md shadow-sm"
        : "bg-transparent"
    )}>
      <div className="flex items-center justify-between">
        <div className="cursor-pointer" onClick={() => navigate("/profile")}>
          {profileLoading ? (
            <Skeleton className={cn("h-6 w-32", scrolled ? "bg-muted" : "bg-white/20")} />
          ) : (
            <h1 className={cn(
              "text-lg font-bold transition-colors duration-300",
              scrolled ? "text-foreground" : "text-white"
            )}>
              안녕하세요, {greeting} 👋
            </h1>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className={cn(
            "h-9 w-9 transition-colors duration-300",
            scrolled ? "text-foreground hover:bg-muted" : "text-white/80 hover:text-white hover:bg-white/10"
          )} onClick={() => navigate("/notifications")}>
            <div className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
                2
              </span>
            </div>
          </Button>
          <Button variant="ghost" size="icon" className={cn(
            "h-9 w-9 transition-colors duration-300",
            scrolled ? "text-foreground hover:bg-muted" : "text-white/80 hover:text-white hover:bg-white/10"
          )} onClick={() => navigate("/settings")}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <MainLayout title={greeting} subtitle="오늘도 김비서가 도와드릴게요" stickyHeader={mobileHeader}>
      {/* 모바일 전용 네이티브 홈 */}
      {isMobile ? (
        <div ref={scrollRef}>
          {/* 히어로 영역 - 헤더 뒤로 확장 */}
          <div className="relative pt-[calc(env(safe-area-inset-top,0px)+60px)] px-5 pb-8">

            <div className="mb-4" />
            <div className="relative">
              <AIChatCard />
            </div>
          </div>

          {/* 히어로 아래 콘텐츠 - 흰 배경 */}
          <div className="bg-background">
          {/* 퀵 액션 가로 스크롤 */}
          <div className="px-4 py-5 relative z-10">
            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.url)}
                  className="flex flex-col items-center gap-1.5 min-w-[64px] group"
                >
                  <div className="h-12 w-12 rounded-2xl bg-card shadow-sm border border-border flex items-center justify-center group-active:scale-95 transition-transform">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground whitespace-nowrap">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 연동 상태 배너 */}
          <div className="px-4 pt-4">
            <ConnectionStatusBanner isLoggedOut={isLoggedOut} />
          </div>

          {/* 오늘의 요약 */}
          <div className="px-4 pt-2">
            <TodaySummarySection isLoggedOut={isLoggedOut} />
          </div>

          {/* 메인 카드들 */}
          <div className="px-4 pt-2 space-y-4 pb-4">
            {/* 로그아웃 상태 */}
            {isLoggedOut && (
              <>
                <TodayActionsCard isLoggedOut />
                <WeeklyChart />
                <HometaxSummaryCard isLoggedOut />
                <RecentTransactionsCard />
                <EmployeeSummaryCard isLoggedOut />
                <DepositCard isLoggedOut />
                <AutoTransferCard isLoggedOut />
                <AlertCard isLoggedOut />
              </>
            )}

            {/* 로그인 + 미연동 */}
            {isLoggedInButNotConnected && <IntegratedConnectionCard />}

            {/* 연동 상태 */}
            {isAnyConnected && (
              <>
                <TodayActionsCard />
                {isTransactionConnected && <WeeklyChart />}
                {hometaxConnected && <HometaxSummaryCard />}
                {isTransactionConnected && <RecentTransactionsCard />}
                <EmployeeSummaryCard />
                <DepositCard />
                <AutoTransferCard />
                <AlertCard />
              </>
            )}
          </div>
          </div>
        </div>
      ) : (
        /* PC 레이아웃은 기존 유지 */
        <div className="space-y-6">
          <ConnectionStatusBanner isLoggedOut={isLoggedOut} />
          <section>
            <AIChatCard />
          </section>
          <TodaySummarySection isLoggedOut={isLoggedOut} />

          {isLoggedOut && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <section><TodayActionsCard isLoggedOut /></section>
                  <section><WeeklyChart /></section>
                </div>
                <div className="space-y-6">
                  <section><HometaxSummaryCard isLoggedOut /></section>
                  <section><RecentTransactionsCard /></section>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <section><EmployeeSummaryCard isLoggedOut /></section>
                  <section><DepositCard isLoggedOut /></section>
                </div>
                <div className="space-y-6">
                  <section><AutoTransferCard isLoggedOut /></section>
                  <section><AlertCard isLoggedOut /></section>
                </div>
              </div>
            </>
          )}

          {isLoggedInButNotConnected && <IntegratedConnectionCard />}

          {isAnyConnected && (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <section><TodayActionsCard /></section>
                  {isTransactionConnected && <section><WeeklyChart /></section>}
                </div>
                <div className="space-y-6">
                  {hometaxConnected && <section><HometaxSummaryCard /></section>}
                  {isTransactionConnected && <section><RecentTransactionsCard /></section>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <section><EmployeeSummaryCard /></section>
                  <section><DepositCard /></section>
                </div>
                <div className="space-y-6">
                  <section><AutoTransferCard /></section>
                  <section><AlertCard /></section>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </MainLayout>
  );
}
