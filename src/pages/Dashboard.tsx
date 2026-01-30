import { StatCard } from "@/components/dashboard/StatCard";
import { DepositCard } from "@/components/dashboard/DepositCard";
import { AutoTransferCard } from "@/components/dashboard/AutoTransferCard";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { AIChatCard } from "@/components/dashboard/AIChatCard";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { RecentTransactionsCard } from "@/components/dashboard/RecentTransactionsCard";
import { EmployeeSummaryCard } from "@/components/dashboard/EmployeeSummaryCard";
import { OnboardingOverlay } from "@/components/dashboard/OnboardingOverlay";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import {
  getTodayStats,
  mockDeposits,
  mockAutoTransfers,
  mockAlerts,
  formatCurrency,
} from "@/data/mockData";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const stats = getTodayStats();
  const { status, connect } = useOnboardingStatus();
  const navigate = useNavigate();

  const handleConnect = (type: "hometax" | "card" | "account") => {
    // 온보딩 플로우로 이동하거나 모달 열기
    // 임시로 바로 연결 처리 (실제로는 온보딩 위저드로 이동)
    connect(type);
  };

  return (
    <MainLayout title="안녕하세요, 사장님 👋" subtitle="오늘도 김비서가 도와드릴게요">
      <div className="space-y-6">
        {/* AI 김비서 채팅 카드 */}
        <section>
          <AIChatCard />
        </section>

        {/* 오늘의 요약 - 국세청 연결 필요 */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">오늘의 요약</h2>
          <OnboardingOverlay
            isConnected={status.hometax}
            connectionType="hometax"
            onConnect={() => handleConnect("hometax")}
          >
            <div className="grid grid-cols-2 gap-3">
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
          </OnboardingOverlay>
        </section>

        {/* 주간 매출/지출 차트 - 카드 연결 필요 */}
        <section>
          <OnboardingOverlay
            isConnected={status.card}
            connectionType="card"
            onConnect={() => handleConnect("card")}
          >
            <WeeklyChart />
          </OnboardingOverlay>
        </section>

        {/* 최근 거래 내역 - 카드 연결 필요 */}
        <section>
          <OnboardingOverlay
            isConnected={status.card}
            connectionType="card"
            onConnect={() => handleConnect("card")}
          >
            <RecentTransactionsCard />
          </OnboardingOverlay>
        </section>

        {/* 직원 현황 - 국세청 연결 필요 */}
        <section>
          <OnboardingOverlay
            isConnected={status.hometax}
            connectionType="hometax"
            onConnect={() => handleConnect("hometax")}
          >
            <EmployeeSummaryCard />
          </OnboardingOverlay>
        </section>

        {/* 예치금 현황 - 계좌 연결 필요 */}
        <OnboardingOverlay
          isConnected={status.account}
          connectionType="account"
          onConnect={() => handleConnect("account")}
        >
          <DepositCard deposits={mockDeposits} />
        </OnboardingOverlay>

        {/* 자동이체 현황 - 계좌 연결 필요 */}
        <OnboardingOverlay
          isConnected={status.account}
          connectionType="account"
          onConnect={() => handleConnect("account")}
        >
          <AutoTransferCard transfers={mockAutoTransfers} />
        </OnboardingOverlay>

        {/* 알림 - 항상 표시 */}
        <AlertCard alerts={mockAlerts} />
      </div>
    </MainLayout>
  );
}
