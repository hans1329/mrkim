import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEmployees, useEmployeeStats } from "@/hooks/useEmployees";
import { Skeleton } from "@/components/ui/skeleton";

interface EmployeeSummaryCardProps {
  isLoggedOut?: boolean;
}

export function EmployeeSummaryCard({ isLoggedOut = false }: EmployeeSummaryCardProps) {
  const navigate = useNavigate();
  const { data: employees, isLoading } = useEmployees({ status: "재직" });
  const { data: stats, isLoading: statsLoading } = useEmployeeStats();

  // 로그아웃 상태: 목업 직원 현황 표시
  if (isLoggedOut) {
    return (
      <Card className="cursor-pointer" onClick={() => navigate("/employees")}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            직원 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">전체 직원</span>
              </div>
              <p className="text-lg font-bold">5명</p>
            </div>
            <div className="rounded-lg p-3 bg-muted/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center">
                  <UserCheck className="h-3.5 w-3.5 text-success" />
                </div>
                <span className="text-xs text-muted-foreground">출근</span>
              </div>
              <p className="text-lg font-bold">4명</p>
            </div>
          </div>
          <div className="rounded-lg p-3 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">이번 달 급여 예정</span>
              </div>
              <span className="text-sm font-bold">₩12,500,000</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const loading = isLoading || statsLoading;
  const activeCount = stats?.activeCount ?? 0;
  const totalSalary = stats?.totalSalary ?? 0;
  const insuredCount = stats?.insuredCount ?? 0;

  // 로그인 상태: 직원이 없으면 빈 상태
  if (!loading && activeCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">직원 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              등록된 직원이 없어요
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              직원 관리 메뉴에서 직원을 추가하세요
            </p>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button size="sm" variant="outline" className="rounded-full w-full" onClick={() => navigate("/employees")}>
            직원 추가하기
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 10000) {
      return `₩${(amount / 10000).toFixed(0)}만`;
    }
    return `₩${amount.toLocaleString()}`;
  };

  // 로그인 + 직원 있음: 실데이터 표시
  return (
    <Card className="cursor-pointer" onClick={() => navigate("/employees")}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          직원 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-3 bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground">재직 직원</span>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-lg font-bold">{activeCount}명</p>
            )}
          </div>
          <div className="rounded-lg p-3 bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-success/20 flex items-center justify-center">
                <UserCheck className="h-3.5 w-3.5 text-success" />
              </div>
              <span className="text-xs text-muted-foreground">4대보험</span>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-lg font-bold">{insuredCount}명</p>
            )}
          </div>
        </div>
        <div className="rounded-lg p-3 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">이번 달 급여 예정</span>
            </div>
            {loading ? (
              <Skeleton className="h-5 w-24" />
            ) : (
              <span className="text-sm font-bold">{formatCurrency(totalSalary)}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
