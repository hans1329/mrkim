import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/data/mockData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, DollarSign, Clock, TrendingUp, Shield, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const employeeSalaryData = [
  { name: "이영희", position: "주방장", salary: 4000000, insurance: true },
  { name: "김민수", position: "매니저", salary: 3500000, insurance: true },
  { name: "박서준", position: "서빙", salary: 2400000, insurance: true },
  { name: "최지우", position: "알바", salary: 1200000, insurance: false },
  { name: "정하늘", position: "알바", salary: 960000, insurance: false },
];

const monthlyLaborCost = [
  { name: "1월", 인건비: 9900000 },
  { name: "2월", 인건비: 10200000 },
  { name: "3월", 인건비: 9900000 },
  { name: "4월", 인건비: 11060000 },
  { name: "5월", 인건비: 10800000 },
  { name: "6월", 인건비: 12060000 },
];

export function EmployeeReportTab() {
  const totalSalary = employeeSalaryData.reduce((sum, e) => sum + e.salary, 0);
  const insuredCount = employeeSalaryData.filter(e => e.insurance).length;
  const uninsuredCount = employeeSalaryData.filter(e => !e.insurance).length;
  const avgSalary = Math.round(totalSalary / employeeSalaryData.length);

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">총 직원</span>
            </div>
            <p className="mt-1 text-lg font-bold">{employeeSalaryData.length}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-chart-1" />
              <span className="text-xs text-muted-foreground">월 인건비</span>
            </div>
            <p className="mt-1 text-lg font-bold">{formatCurrency(totalSalary)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-success" />
              <span className="text-xs text-muted-foreground">4대보험 가입</span>
            </div>
            <p className="mt-1 text-lg font-bold">{insuredCount}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ShieldOff className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">미가입 (단기)</span>
            </div>
            <p className="mt-1 text-lg font-bold">{uninsuredCount}명</p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 인건비 추이 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">월별 인건비 추이</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyLaborCost}>
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
                            인건비: {formatCurrency(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="인건비"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 직원별 급여 현황 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">직원별 급여 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {employeeSalaryData.map((employee) => (
            <div
              key={employee.name}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <span className="text-sm font-medium">
                    {employee.name.slice(0, 1)}
                  </span>
                </div>
                <div>
                  <p className="font-medium">{employee.name}</p>
                  <p className="text-xs text-muted-foreground">{employee.position}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatCurrency(employee.salary)}</p>
                <Badge
                  variant={employee.insurance ? "default" : "secondary"}
                  className="text-[10px]"
                >
                  {employee.insurance ? "4대보험" : "미가입"}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
