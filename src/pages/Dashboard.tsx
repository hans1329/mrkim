import { StatCard } from "@/components/dashboard/StatCard";
import { DepositCard } from "@/components/dashboard/DepositCard";
import { AutoTransferCard } from "@/components/dashboard/AutoTransferCard";
import { AlertCard } from "@/components/dashboard/AlertCard";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import {
  getTodayStats,
  mockDeposits,
  mockAutoTransfers,
  mockAlerts,
  formatCurrency,
} from "@/data/mockData";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";

export default function Dashboard() {
  const stats = getTodayStats();

  return (
    <div className="space-y-6">
      {/* 오늘의 요약 */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-foreground">오늘의 요약</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="오늘 매출"
            value={formatCurrency(stats.income)}
            subtitle="전일 대비"
            icon={TrendingUp}
            trend={{ value: 12.5, isPositive: true }}
            variant="primary"
          />
          <StatCard
            title="오늘 지출"
            value={formatCurrency(stats.expense)}
            subtitle="전일 대비"
            icon={TrendingDown}
            trend={{ value: 3.2, isPositive: false }}
          />
          <StatCard
            title="순이익"
            value={formatCurrency(stats.profit)}
            subtitle={`카드 ${stats.cardRatio}% / 현금 ${stats.cashRatio}%`}
            icon={Wallet}
            variant="success"
          />
          <StatCard
            title="운영자금"
            value="₩15,340,000"
            subtitle="가용 잔액"
            icon={PiggyBank}
          />
        </div>
      </section>

      {/* 차트 */}
      <section>
        <WeeklyChart />
      </section>

      {/* 상세 카드들 */}
      <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <DepositCard deposits={mockDeposits} />
        <AutoTransferCard transfers={mockAutoTransfers} />
        <AlertCard alerts={mockAlerts} />
      </section>
    </div>
  );
}
