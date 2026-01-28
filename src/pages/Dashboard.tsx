import { StatCard } from "@/components/dashboard/StatCard";
import { DepositCard } from "@/components/dashboard/DepositCard";
import { AutoTransferCard } from "@/components/dashboard/AutoTransferCard";
import { AlertCard } from "@/components/dashboard/AlertCard";
import {
  getTodayStats,
  mockDeposits,
  mockAutoTransfers,
  mockAlerts,
  formatCurrency,
} from "@/data/mockData";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";

export default function Dashboard() {
  const stats = getTodayStats();

  return (
    <MainLayout title="안녕하세요, 사장님 👋" subtitle="오늘도 김비서가 도와드릴게요">
      <div className="space-y-6">
        {/* 오늘의 요약 */}
        <section>
          <h2 className="mb-3 text-base font-semibold text-foreground">오늘의 요약</h2>
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
        </section>

        {/* 예치금 현황 */}
        <DepositCard deposits={mockDeposits} />

        {/* 자동이체 현황 */}
        <AutoTransferCard transfers={mockAutoTransfers} />

        {/* 알림 */}
        <AlertCard alerts={mockAlerts} />
      </div>
    </MainLayout>
  );
}
