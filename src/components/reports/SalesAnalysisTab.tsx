import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const monthlyData = [
  { name: "1월", 매출: 45000000, 카드: 38000000, 현금: 7000000 },
  { name: "2월", 매출: 52000000, 카드: 44000000, 현금: 8000000 },
  { name: "3월", 매출: 48000000, 카드: 40000000, 현금: 8000000 },
  { name: "4월", 매출: 61000000, 카드: 52000000, 현금: 9000000 },
  { name: "5월", 매출: 55000000, 카드: 46000000, 현금: 9000000 },
  { name: "6월", 매출: 67000000, 카드: 57000000, 현금: 10000000 },
];

const weeklyData = [
  { name: "월", 매출: 8500000 },
  { name: "화", 매출: 7200000 },
  { name: "수", 매출: 9100000 },
  { name: "목", 매출: 8800000 },
  { name: "금", 매출: 11500000 },
  { name: "토", 매출: 14200000 },
  { name: "일", 매출: 12800000 },
];

export function SalesAnalysisTab() {
  const totalRevenue = monthlyData.reduce((sum, d) => sum + d.매출, 0);
  const totalCard = monthlyData.reduce((sum, d) => sum + d.카드, 0);
  const totalCash = monthlyData.reduce((sum, d) => sum + d.현금, 0);
  const avgMonthly = Math.round(totalRevenue / monthlyData.length);

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">총 매출</span>
            </div>
            <p className="mt-1 text-lg font-bold">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">월 평균</span>
            </div>
            <p className="mt-1 text-lg font-bold">{formatCurrency(avgMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-chart-1" />
              <span className="text-xs text-muted-foreground">카드 매출</span>
            </div>
            <p className="mt-1 text-lg font-bold">{formatCurrency(totalCard)}</p>
            <p className="text-xs text-muted-foreground">
              {Math.round((totalCard / totalRevenue) * 100)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Banknote className="h-4 w-4 text-chart-2" />
              <span className="text-xs text-muted-foreground">현금 매출</span>
            </div>
            <p className="mt-1 text-lg font-bold">{formatCurrency(totalCash)}</p>
            <p className="text-xs text-muted-foreground">
              {Math.round((totalCash / totalRevenue) * 100)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 매출 추이 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">월별 매출 추이</CardTitle>
        </CardHeader>
        <CardContent>
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
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 요일별 매출 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">요일별 평균 매출</CardTitle>
        </CardHeader>
        <CardContent>
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
                            매출: {formatCurrency(payload[0].value as number)}
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
        </CardContent>
      </Card>
    </div>
  );
}
