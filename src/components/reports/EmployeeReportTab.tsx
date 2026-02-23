import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Users, DollarSign, Shield, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEmployees, type Employee } from "@/hooks/useEmployees";
import { useMemo } from "react";
import { format, subMonths } from "date-fns";

export function EmployeeReportTab() {
  const { data: employees, isLoading } = useEmployees();

  // 직원 데이터 집계
  const { employeeSalaryData, stats, monthlyLaborCost } = useMemo(() => {
    if (!employees?.length) {
      return {
        employeeSalaryData: [],
        stats: { totalSalary: 0, insuredCount: 0, uninsuredCount: 0, avgSalary: 0 },
        monthlyLaborCost: [],
      };
    }

    // 재직중인 직원만 필터링
    const activeEmployees = employees.filter((e) => e.status === "재직");

    // 급여 데이터 (정규직: 월급, 알바: 시급 * 주간시간 * 4주 추정)
    const employeeSalaryData = activeEmployees
      .map((emp) => {
        let salary = emp.monthly_salary || 0;
        if (emp.employee_type === "알바" && emp.hourly_rate && emp.weekly_hours) {
          salary = Math.round(emp.hourly_rate * emp.weekly_hours * 4);
        }

        const hasAllInsurance =
          emp.insurance_national_pension &&
          emp.insurance_health &&
          emp.insurance_employment &&
          emp.insurance_industrial;

        return {
          id: emp.id,
          name: emp.name,
          position: emp.position || emp.employee_type,
          salary,
          insurance: hasAllInsurance,
          employeeType: emp.employee_type,
        };
      })
      .sort((a, b) => b.salary - a.salary);

    const totalSalary = employeeSalaryData.reduce((sum, e) => sum + e.salary, 0);
    const insuredCount = employeeSalaryData.filter((e) => e.insurance).length;
    const uninsuredCount = employeeSalaryData.filter((e) => !e.insurance).length;
    const avgSalary = employeeSalaryData.length > 0 ? Math.round(totalSalary / employeeSalaryData.length) : 0;

    // 월별 인건비 추이 (최근 6개월) - 각 월에 재직 중이었던 직원의 급여 합산
    const monthlyLaborCost = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthKey = format(monthDate, "M월");
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      // 해당 월에 재직 중이었던 직원 필터링
      const activeInMonth = employees.filter((emp) => {
        const startDate = emp.start_date ? new Date(emp.start_date) : null;
        const endDate = emp.end_date ? new Date(emp.end_date) : null;
        // 입사일이 해당 월 말 이전이고, 퇴사일이 없거나 해당 월 초 이후
        const startedBefore = !startDate || startDate <= monthEnd;
        const notEndedYet = !endDate || endDate >= monthStart;
        return startedBefore && notEndedYet;
      });

      const monthlyCost = activeInMonth.reduce((sum, emp) => {
        let salary = emp.monthly_salary || 0;
        if (emp.employee_type === "알바" && emp.hourly_rate && emp.weekly_hours) {
          salary = Math.round(emp.hourly_rate * emp.weekly_hours * 4);
        }
        return sum + salary;
      }, 0);

      monthlyLaborCost.push({
        name: monthKey,
        인건비: monthlyCost,
        인원: activeInMonth.length,
      });
    }

    return {
      employeeSalaryData,
      stats: { totalSalary, insuredCount, uninsuredCount, avgSalary },
      monthlyLaborCost,
    };
  }, [employees]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[250px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  const hasData = employeeSalaryData.length > 0;

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">총 직원</span>
            <p className="mt-1 text-base font-bold text-primary">{employeeSalaryData.length}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">월 인건비</span>
            <p className="mt-1 text-base font-bold text-chart-1">{formatCurrency(stats.totalSalary)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">4대보험 가입</span>
            <p className="mt-1 text-base font-bold text-chart-2">{stats.insuredCount}명</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">미가입 (단기)</span>
            <p className="mt-1 text-base font-bold text-chart-3">{stats.uninsuredCount}명</p>
          </CardContent>
        </Card>
      </div>

      {/* 월별 인건비 추이 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">월별 인건비 추이</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-4">
          {hasData ? (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyLaborCost} margin={{ top: 5, right: 16, left: 16, bottom: 5 }}>
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
                            {payload[0].payload?.인원 !== undefined && (
                              <p className="text-muted-foreground">
                                인원: {payload[0].payload.인원}명
                              </p>
                            )}
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
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              직원 데이터가 없습니다
            </div>
          )}
        </CardContent>
      </Card>

      {/* 직원별 급여 현황 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">직원별 급여 현황</CardTitle>
        </CardHeader>
        <CardContent className="space-y-0 divide-y">
          {hasData ? (
            employeeSalaryData.map((employee) => (
              <div
                key={employee.id}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <span className="text-xs font-medium">
                      {employee.name.slice(0, 1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{employee.name}</p>
                    <p className="text-[11px] text-muted-foreground">{employee.position}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(employee.salary)}</p>
                  <Badge
                    variant={employee.insurance ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {employee.insurance ? "4대보험" : "미가입"}
                  </Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              등록된 직원이 없습니다
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
