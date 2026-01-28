import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber } from "@/data/mockData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";

const monthlyData = [
  { name: "1월", 매출: 45000000, 지출: 32000000 },
  { name: "2월", 매출: 52000000, 지출: 35000000 },
  { name: "3월", 매출: 48000000, 지출: 33000000 },
  { name: "4월", 매출: 61000000, 지출: 38000000 },
  { name: "5월", 매출: 55000000, 지출: 36000000 },
  { name: "6월", 매출: 67000000, 지출: 41000000 },
];

const categoryData = [
  { name: "식자재", value: 45, color: "hsl(var(--chart-1))" },
  { name: "인건비", value: 30, color: "hsl(var(--chart-2))" },
  { name: "관리비", value: 15, color: "hsl(var(--chart-3))" },
  { name: "기타", value: 10, color: "hsl(var(--chart-4))" },
];

export default function Reports() {
  const totalRevenue = monthlyData.reduce((sum, d) => sum + d.매출, 0);
  const totalExpense = monthlyData.reduce((sum, d) => sum + d.지출, 0);
  const profitMargin = Math.round(((totalRevenue - totalExpense) / totalRevenue) * 100);

  return (
    <MainLayout title="리포트" subtitle="경영 현황 분석" showBackButton>
      <div className="space-y-4">
        {/* 기간 선택 */}
        <Select defaultValue="6months">
          <SelectTrigger>
            <SelectValue placeholder="기간 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">최근 1개월</SelectItem>
            <SelectItem value="3months">최근 3개월</SelectItem>
            <SelectItem value="6months">최근 6개월</SelectItem>
            <SelectItem value="1year">최근 1년</SelectItem>
          </SelectContent>
        </Select>

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
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">총 지출</span>
              </div>
              <p className="mt-1 text-lg font-bold">{formatCurrency(totalExpense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">순이익</span>
              </div>
              <p className="mt-1 text-lg font-bold">{formatCurrency(totalRevenue - totalExpense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">이익률</span>
              </div>
              <p className="mt-1 text-lg font-bold">{profitMargin}%</p>
            </CardContent>
          </Card>
        </div>

        {/* 월별 추이 차트 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">월별 추이</CardTitle>
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
                        return (
                          <div className="rounded-lg border bg-card p-2 shadow-md text-xs">
                            <p>{payload[0].name}: {payload[0].value}%</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {categoryData.map((item) => (
                <div key={item.name} className="flex items-center gap-1">
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs">{item.name} {item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
