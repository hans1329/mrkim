import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockEmployees, formatCurrency } from "@/data/mockData";
import { Users, Calendar, Wallet } from "lucide-react";

export function EmployeeSummaryCard() {
  const activeEmployees = mockEmployees.filter((e) => e.status === "재직");
  const totalSalary = activeEmployees.reduce((sum, e) => sum + e.salary, 0);
  const insuredCount = activeEmployees.filter((e) => e.insuranceStatus === "가입").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">직원 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
            <Users className="h-5 w-5 text-primary mb-1" />
            <p className="text-base font-bold">{activeEmployees.length}명</p>
            <p className="text-xs text-muted-foreground">재직 인원</p>
          </div>
          <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
            <Wallet className="h-5 w-5 text-primary mb-1" />
            <p className="text-base font-bold">{(totalSalary / 10000).toFixed(0)}만</p>
            <p className="text-xs text-muted-foreground">이번달 급여</p>
          </div>
          <div className="flex flex-col items-center p-3 rounded-xl bg-muted/50">
            <Calendar className="h-5 w-5 text-primary mb-1" />
            <p className="text-base font-bold">{insuredCount}명</p>
            <p className="text-xs text-muted-foreground">4대보험</p>
          </div>
        </div>

        <div className="space-y-2">
          {activeEmployees.slice(0, 3).map((employee) => (
            <div
              key={employee.id}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                  {employee.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium">{employee.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {employee.position} · {employee.department}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(employee.salary)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
