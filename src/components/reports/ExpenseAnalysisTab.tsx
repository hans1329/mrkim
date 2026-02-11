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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingDown } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useMemo } from "react";
import { format, subMonths, startOfMonth, parseISO } from "date-fns";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function ExpenseAnalysisTab() {
  // 최근 6개월 지출 데이터 조회
  const sixMonthsAgo = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");
  const { data: transactions, isLoading } = useTransactions({
    type: "expense",
    startDate: sixMonthsAgo,
  });

  // 월별 및 카테고리별 데이터 집계
  const { monthlyData, categoryData, stats } = useMemo(() => {
    if (!transactions?.length) {
      return {
        monthlyData: [],
        categoryData: [],
        stats: { totalExpense: 0, avgMonthly: 0, maxMonth: null, minMonth: null },
      };
    }

    // 월별 집계
    const monthlyMap = new Map<string, number>();
    
    // 최근 6개월 초기화
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthKey = format(monthDate, "M월");
      monthlyMap.set(monthKey, 0);
    }

    // 카테고리별 집계
    const categoryMap = new Map<string, { amount: number; icon: string }>();

    transactions.forEach((tx) => {
      const date = parseISO(tx.transaction_date);
      const monthKey = format(date, "M월");

      const current = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, current + tx.amount);

      const category = tx.category || "미분류";
      const catData = categoryMap.get(category) || { amount: 0, icon: tx.category_icon || "📋" };
      catData.amount += tx.amount;
      categoryMap.set(category, catData);
    });

    const monthlyData = Array.from(monthlyMap.entries()).map(([name, 지출]) => ({
      name,
      지출,
    }));

    const totalExpense = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    // 카테고리 데이터 (상위 5개 + 기타)
    const sortedCategories = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        icon: data.icon,
        value: Math.round((data.amount / totalExpense) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);

    let categoryData = sortedCategories.slice(0, 5).map((cat, index) => ({
      ...cat,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

    // 나머지 합산
    if (sortedCategories.length > 5) {
      const otherAmount = sortedCategories.slice(5).reduce((sum, c) => sum + c.amount, 0);
      categoryData.push({
        name: "기타",
        amount: otherAmount,
        icon: "📦",
        value: Math.round((otherAmount / totalExpense) * 100),
        color: "hsl(var(--muted-foreground))",
      });
    }

    const maxMonth = monthlyData.reduce((max, d) => (d.지출 > (max?.지출 || 0) ? d : max), monthlyData[0]);
    const minMonth = monthlyData.reduce(
      (min, d) => (d.지출 > 0 && d.지출 < (min?.지출 || Infinity) ? d : min),
      monthlyData.find((m) => m.지출 > 0) || monthlyData[0]
    );

    const monthCount = monthlyData.filter((m) => m.지출 > 0).length || 1;

    return {
      monthlyData,
      categoryData,
      stats: {
        totalExpense,
        avgMonthly: Math.round(totalExpense / monthCount),
        maxMonth,
        minMonth,
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
        <Skeleton className="h-[350px]" />
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
            <span className="text-xs text-muted-foreground">총 지출</span>
            <p className="mt-1 text-base font-bold text-primary">{formatCurrency(stats.totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">월 평균</span>
            <p className="mt-1 text-base font-bold text-chart-1">{formatCurrency(stats.avgMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">최대 지출월</span>
            <p className="mt-1 text-base font-bold text-chart-2">{stats.maxMonth?.name || "-"}</p>
            <p className="text-xs text-muted-foreground">
              {stats.maxMonth ? formatCurrency(stats.maxMonth.지출) : "-"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">최소 지출월</span>
            <p className="mt-1 text-base font-bold text-chart-3">{stats.minMonth?.name || "-"}</p>
            <p className="text-xs text-muted-foreground">
              {stats.minMonth ? formatCurrency(stats.minMonth.지출) : "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 지출 추이 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">월별 지출 추이</CardTitle>
        </CardHeader>
        <CardContent>
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
                            <p style={{ color: payload[0].color }}>
                              지출: {formatCurrency(payload[0].value as number)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="지출"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              지출 데이터가 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 지출 카테고리 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">지출 카테고리</CardTitle>
        </CardHeader>
        <CardContent>
          {hasData && categoryData.length > 0 ? (
            <>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="amount"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-card p-2 shadow-md text-xs">
                              <p className="font-medium">{data.name}</p>
                              <p>
                                {formatCurrency(data.amount)} ({data.value}%)
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 카테고리 상세 */}
              <div className="mt-4 space-y-2">
                {categoryData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-base">{item.icon}</span>
                      <span className="text-sm">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(item.amount)}</p>
                      <p className="text-xs text-muted-foreground">{item.value}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
              지출 데이터가 없습니다
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
