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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingDown, Utensils, Users, Building, MoreHorizontal } from "lucide-react";

const monthlyData = [
  { name: "1월", 지출: 32000000 },
  { name: "2월", 지출: 35000000 },
  { name: "3월", 지출: 33000000 },
  { name: "4월", 지출: 38000000 },
  { name: "5월", 지출: 36000000 },
  { name: "6월", 지출: 41000000 },
];

const categoryData = [
  { name: "식자재", value: 45, amount: 96750000, color: "hsl(var(--chart-1))", icon: Utensils },
  { name: "인건비", value: 30, amount: 64500000, color: "hsl(var(--chart-2))", icon: Users },
  { name: "관리비", value: 15, amount: 32250000, color: "hsl(var(--chart-3))", icon: Building },
  { name: "기타", value: 10, amount: 21500000, color: "hsl(var(--chart-4))", icon: MoreHorizontal },
];

export function ExpenseAnalysisTab() {
  const totalExpense = monthlyData.reduce((sum, d) => sum + d.지출, 0);
  const avgMonthly = Math.round(totalExpense / monthlyData.length);
  const maxMonth = monthlyData.reduce((max, d) => d.지출 > max.지출 ? d : max);
  const minMonth = monthlyData.reduce((min, d) => d.지출 < min.지출 ? d : min);

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-xs text-muted-foreground">총 지출</span>
            </div>
            <p className="mt-1 text-lg font-bold">{formatCurrency(totalExpense)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">월 평균</span>
            </div>
            <p className="mt-1 text-lg font-bold">{formatCurrency(avgMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">최대 지출월</span>
            </div>
            <p className="mt-1 text-lg font-bold">{maxMonth.name}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(maxMonth.지출)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">최소 지출월</span>
            </div>
            <p className="mt-1 text-lg font-bold">{minMonth.name}</p>
            <p className="text-xs text-muted-foreground">{formatCurrency(minMonth.지출)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 지출 추이 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">월별 지출 추이</CardTitle>
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
        </CardContent>
      </Card>

      {/* 지출 카테고리 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">지출 카테고리</CardTitle>
        </CardHeader>
        <CardContent>
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
                  dataKey="value"
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
                          <p>{formatCurrency(data.amount)} ({data.value}%)</p>
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
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{item.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-muted-foreground">{item.value}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
