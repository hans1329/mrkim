import { StatCard } from "@/components/dashboard/StatCard";
import { DepositCard } from "@/components/dashboard/DepositCard";
import { AutoTransferCard } from "@/components/dashboard/AutoTransferCard";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { AIChatCard } from "@/components/dashboard/AIChatCard";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard";
import { EmployeeSummaryCard } from "@/components/dashboard/EmployeeSummaryCard";
import { TodayActionsCard } from "@/components/dashboard/TodayActionsCard";
import { ConnectionStatusBanner } from "@/components/dashboard/ConnectionStatusBanner";
import {
  getTodayStats,
  mockDeposits,
  mockAutoTransfers,
  mockAlerts,
  formatCurrency,
} from "@/data/mockData";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const stats = getTodayStats();
  const isMobile = useIsMobile();

  return (
    <MainLayout title="안녕하세요, 사장님 👋" subtitle="오늘도 김비서가 도와드릴게요">
      <div className="space-y-6">
        {/* 연동 상태 / 긴급 알림 배너 */}
        <ConnectionStatusBanner />

        {/* AI 김비서 채팅 카드 */}
        <section>
          <AIChatCard />
        </section>

        {/* 오늘의 요약 - 전체 너비 한 줄 */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">오늘의 요약</h2>
          <div className={isMobile ? "grid grid-cols-2 gap-3" : "grid grid-cols-4 gap-3"}>
            <StatCard
              title="오늘 매출"
              value={formatCurrency(stats.income)}
              icon={TrendingUp}
              trend={{ value: 12.5, isPositive: true }}
              variant="primary"
            />
            <StatCard
              title="오늘 지출"
              value={formatCurrency(stats.expense)}
              icon={TrendingDown}
              trend={{ value: 3.2, isPositive: false }}
            />
            <StatCard
              title="순이익"
              value={formatCurrency(stats.profit)}
              subtitle={`카드 ${stats.cardRatio}%`}
              icon={Wallet}
              variant="success"
            />
            <StatCard
              title="운영자금"
              value="₩15.3M"
              subtitle="가용 잔액"
              icon={PiggyBank}
            />
          </div>
        </section>

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

            {/* 예치금 현황 */}
            <DepositCard deposits={mockDeposits} />
          </div>

          {/* 우측 칼럼 */}
          <div className="space-y-6">
            {/* 최근 거래 내역 */}
            <section>
              <RecentTransactionsCard />
            </section>

            {/* 직원 현황 */}
            <section>
              <EmployeeSummaryCard />
            </section>

            {/* 자동이체 현황 */}
            <AutoTransferCard transfers={mockAutoTransfers} />
          </div>
        </div>

        {/* 알림 - 전체 너비 */}
        <AlertCard alerts={mockAlerts} />
      </div>
    </MainLayout>
  );
}
