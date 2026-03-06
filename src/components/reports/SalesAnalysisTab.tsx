import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/data/mockData";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp, CreditCard, Banknote, Calendar } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO, getDay } from "date-fns";
import { ko } from "date-fns/locale";

export function SalesAnalysisTab() {
  // 최근 6개월 매출 데이터 조회
  const sixMonthsAgo = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");
  const { data: incomeTransactions, isLoading: isLoadingIncome } = useTransactions({
    type: "income",
    startDate: sixMonthsAgo,
  });
  const { data: transferInTransactions, isLoading: isLoadingTransferIn } = useTransactions({
    type: "transfer_in",
    startDate: sixMonthsAgo,
  });

  const isLoading = isLoadingIncome || isLoadingTransferIn;
  const transactions = useMemo(() => {
    return [...(incomeTransactions || []), ...(transferInTransactions || [])];
  }, [incomeTransactions, transferInTransactions]);

  // 월별 데이터 집계
  const { monthlyData, weeklyData, stats } = useMemo(() => {
    if (!transactions?.length) {
      return {
        monthlyData: [],
        weeklyData: [],
        stats: { totalRevenue: 0, avgMonthly: 0, totalCard: 0, totalCash: 0 },
      };
    }

    // 월별 집계
    const monthlyMap = new Map<string, { 매출: number; 카드: number; 현금: number }>();
    
    // 최근 6개월 초기화
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthKey = format(monthDate, "M월");
      monthlyMap.set(monthKey, { 매출: 0, 카드: 0, 현금: 0 });
    }

    // 요일별 집계 (일~토 = 0~6)
    const weeklyMap = new Map<number, { total: number; count: number }>();
    for (let i = 0; i < 7; i++) {
      weeklyMap.set(i, { total: 0, count: 0 });
    }

    let totalCard = 0;
    let totalCash = 0;

    transactions.forEach((tx) => {
      const date = parseISO(tx.transaction_date);
      const monthKey = format(date, "M월");
      const dayOfWeek = getDay(date);

      const current = monthlyMap.get(monthKey);
      if (current) {
        current.매출 += tx.amount;
        if (tx.source_type === "card") {
          current.카드 += tx.amount;
          totalCard += tx.amount;
        } else {
          current.현금 += tx.amount;
          totalCash += tx.amount;
        }
        monthlyMap.set(monthKey, current);
      }

      const weekData = weeklyMap.get(dayOfWeek)!;
      weekData.total += tx.amount;
      weekData.count += 1;
      weeklyMap.set(dayOfWeek, weekData);
    });

    const monthlyData = Array.from(monthlyMap.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));

    const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];
    const weeklyData = [1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
      const data = weeklyMap.get(dayIndex)!;
      return {
        name: dayLabels[dayIndex],
        매출: data.count > 0 ? Math.round(data.total / data.count) : 0,
      };
    });

    const totalRevenue = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const monthCount = monthlyData.filter((m) => m.매출 > 0).length || 1;

    return {
      monthlyData,
      weeklyData,
      stats: {
        totalRevenue,
        avgMonthly: Math.round(totalRevenue / monthCount),
        totalCard,
        totalCash,
      },
    };
  }, [transactions]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[250px]" />
        <Skeleton className="h-[220px]" />
      </div>
    );
  }

  const hasData = transactions && transactions.length > 0;

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">총 매출</span>
            <p className="mt-1 text-base font-bold text-primary">{formatCurrency(stats.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">월 평균 (6개월)</span>
            <p className="mt-1 text-base font-bold text-chart-1">{formatCurrency(stats.avgMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">카드 매출</span>
            <p className="mt-1 text-base font-bold text-chart-2">{formatCurrency(stats.totalCard)}</p>
            <p className="text-xs text-muted-foreground">
              {stats.totalRevenue > 0
                ? Math.round((stats.totalCard / stats.totalRevenue) * 100)
                : 0}
              %
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">현금/이체 매출</span>
            <p className="mt-1 text-base font-bold text-chart-3">{formatCurrency(stats.totalCash)}</p>
            <p className="text-xs text-muted-foreground">
              {stats.totalRevenue > 0
                ? Math.round((stats.totalCash / stats.totalRevenue) * 100)
                : 0}
              %
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 매출 추이 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">월별 매출 추이</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          {hasData ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-card p-2 shadow-md text-xs">
                            <p className="mb-1 font-medium">{label}</p>
                            {payload.map((entry, index) => (
                              <p key={index} style={{ color: entry.color }}>
                                {entry.name}: {formatCurrency(entry.value as number)}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="매출"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    label={({ x, y, value }: { x: number; y: number; value: number }) => (
                      <text
                        x={x}
                        y={y - 10}
                        fill="hsl(var(--foreground))"
                        fontSize={10}
                        textAnchor="middle"
                      >
                        {value >= 1000000
                          ? `${(value / 1000000).toFixed(1)}M`
                          : value >= 10000
                            ? `${Math.round(value / 10000)}만`
                            : formatCurrency(value)}
                      </text>
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              매출 데이터가 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 요일별 매출 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">요일별 평균 매출</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          {hasData ? (
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-card p-2 shadow-md text-xs">
                            <p className="mb-1 font-medium">{label}요일</p>
                            <p style={{ color: payload[0].color }}>
                              평균 매출: {formatCurrency(payload[0].value as number)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="매출"
                    fill="hsl(var(--chart-1))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              매출 데이터가 없습니다
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
