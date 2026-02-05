import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openChat } = useChat();
  const isMobile = useIsMobile();
  
  // 중앙 집중화된 연동 상태 사용
  const {
    isLoggedOut,
    isLoggedInButNotConnected,
    isAnyConnected,
    isTransactionConnected,
    hometaxConnected,
    profile,
    profileLoading,
  } = useConnection();
  
  // URL에 openChat=true가 있으면 채팅 열기
  useEffect(() => {
    if (searchParams.get("openChat") === "true") {
      openChat();
      // 파라미터 제거
      searchParams.delete("openChat");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, openChat, setSearchParams]);
  
  // 로딩 중이면 빈 문자열로 깜빡임 방지, 완료되면 닉네임 > 이름 > null 순서
  const userName = profileLoading ? "" : (profile?.nickname || profile?.name || null);
  const greeting = userName ? `안녕하세요, ${userName}님 👋` : "안녕하세요, 사장님 👋";

  return (
    <MainLayout title={greeting} subtitle="오늘도 김비서가 도와드릴게요">
      <div className="space-y-6">
        {/* 연동 상태 / 긴급 알림 배너 */}
        <ConnectionStatusBanner isLoggedOut={isLoggedOut} />

        {/* AI 김비서 채팅 카드 */}
        <section>
          <AIChatCard />
        </section>

        {/* 오늘의 요약 - 상태에 따라 다르게 표시 */}
        <TodaySummarySection isLoggedOut={isLoggedOut} />

        {/* 로그아웃 상태: 전체 목업 UI - 모든 기능 카드 표시 */}
        {isLoggedOut && (
          <>
            {/* 첫 번째 행: 할 일 + 주간 차트 / 홈택스 + 최근 거래 */}
            <div className={isMobile ? "space-y-6" : "grid grid-cols-2 gap-6"}>
              <div className="space-y-6">
                <section>
                  <TodayActionsCard isLoggedOut />
                </section>
                <section>
                  <WeeklyChart />
                </section>
              </div>
              <div className="space-y-6">
                <section>
                  <HometaxSummaryCard isLoggedOut />
                </section>
                <section>
                  <RecentTransactionsCard />
                </section>
              </div>
            </div>

            {/* 두 번째 행: 직원 + 예치금 / 자동이체 + 알림 */}
            <div className={isMobile ? "space-y-6" : "grid grid-cols-2 gap-6"}>
              <div className="space-y-6">
                <section>
                  <EmployeeSummaryCard isLoggedOut />
                </section>
                <section>
                  <DepositCard isLoggedOut />
                </section>
              </div>
              <div className="space-y-6">
                <section>
                  <AutoTransferCard isLoggedOut />
                </section>
                <section>
                  <AlertCard isLoggedOut />
                </section>
              </div>
            </div>
          </>
        )}

        {/* 로그인 + 미연동 상태: 연동 카드만 */}
        {isLoggedInButNotConnected && <IntegratedConnectionCard />}

        {/* 연동 상태: 실데이터 기반 UI */}
        {isAnyConnected && (
          <div className={isMobile ? "space-y-6" : "grid grid-cols-2 gap-6"}>
            {/* 좌측 칼럼 */}
            <div className="space-y-6">
              {/* 오늘의 할 일 */}
              <section>
                <TodayActionsCard />
              </section>

              {/* 주간 매출/지출 차트 - 카드/계좌 연동 시에만 표시 */}
              {isTransactionConnected && (
                <section>
                  <WeeklyChart />
                </section>
              )}
            </div>

            {/* 우측 칼럼 */}
            <div className="space-y-6">
              {/* 홈택스 현황 - 홈택스 연동 시에만 표시 */}
              {hometaxConnected && (
                <section>
                  <HometaxSummaryCard />
                </section>
              )}

              {/* 최근 거래 내역 - 카드/계좌 연동 시에만 표시 */}
              {isTransactionConnected && (
                <section>
                  <RecentTransactionsCard />
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
