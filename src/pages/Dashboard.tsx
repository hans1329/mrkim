import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { StatCard } from "@/components/dashboard/StatCard";
import { TodaySummarySection } from "@/components/dashboard/TodaySummarySection";
 import { IntegratedConnectionCard } from "@/components/dashboard/IntegratedConnectionCard";
import { AIChatCard } from "@/components/dashboard/AIChatCard";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { TodayActionsCard } from "@/components/dashboard/TodayActionsCard";
import { ConnectionStatusBanner } from "@/components/dashboard/ConnectionStatusBanner";
import { HometaxSummaryCard } from "@/components/dashboard/HometaxSummaryCard";
import {  
 } from "@/data/mockData";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/useProfile";
import { useChat } from "@/contexts/ChatContext";
 
 // 연동된 상태에서만 표시할 컴포넌트들을 lazy import
 import { DepositCard } from "@/components/dashboard/DepositCard";
 import { AutoTransferCard } from "@/components/dashboard/AutoTransferCard";
 import { AlertCard } from "@/components/dashboard/AlertCard";
 import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard";
 import { EmployeeSummaryCard } from "@/components/dashboard/EmployeeSummaryCard";
 import { mockDeposits, mockAutoTransfers, mockAlerts } from "@/data/mockData";

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { openChat } = useChat();
  const isMobile = useIsMobile();
  const { profile, loading } = useProfile();
  
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
  const userName = loading ? "" : (profile?.nickname || profile?.name || null);
  const greeting = userName ? `안녕하세요, ${userName}님 👋` : "안녕하세요, 사장님 👋";
 
   // 연동 상태 확인 (하나라도 연동되어 있으면 true)
   const isConnected = profile?.hometax_connected || profile?.card_connected || profile?.account_connected;

  return (
    <MainLayout title={greeting} subtitle="오늘도 김비서가 도와드릴게요">
      <div className="space-y-6">
        {/* 연동 상태 / 긴급 알림 배너 */}
        <ConnectionStatusBanner />

        {/* AI 김비서 채팅 카드 */}
        <section>
          <AIChatCard />
        </section>

         {/* 오늘의 요약 - 실데이터 연동 */}
         <TodaySummarySection />

        {/* PC: 2칼럼 그리드 레이아웃 / Mobile: 1칼럼 */}
        <div className={isMobile ? "space-y-6" : "grid grid-cols-2 gap-6"}>
          {/* 좌측 칼럼 */}
          <div className="space-y-6">
            {/* 오늘의 할 일 */}
            <section>
              <TodayActionsCard />
            </section>

            {/* 주간 매출/지출 차트 */}
            <section>
              <WeeklyChart />
            </section>

           {/* 예치금 현황 - 연동 시에만 표시 */}
           {isConnected && <DepositCard deposits={mockDeposits} />}
          </div>

          {/* 우측 칼럼 */}
          <div className="space-y-6">
           {/* 홈택스 현황 - 연동 시에만 표시 */}
           {isConnected && (
             <section>
               <HometaxSummaryCard />
             </section>
           )}

           {/* 최근 거래 내역 - 연동 시에만 표시 */}
           {isConnected && (
             <section>
               <RecentTransactionsCard />
             </section>
           )}

           {/* 직원 현황 - 연동 시에만 표시 */}
           {isConnected && (
             <section>
               <EmployeeSummaryCard />
             </section>
           )}

           {/* 자동이체 현황 - 연동 시에만 표시 */}
           {isConnected && <AutoTransferCard transfers={mockAutoTransfers} />}
           
           {/* 알림 - 연동 시에만 표시 */}
           {isConnected && <AlertCard alerts={mockAlerts} />}
           
           {/* 미연동 시 통합 연동 카드 표시 */}
           {!isConnected && !loading && <IntegratedConnectionCard />}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
