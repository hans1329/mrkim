import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface DepositCardProps {
  isLoggedOut?: boolean;
}

export function DepositCard({ isLoggedOut = false }: DepositCardProps) {
  // 로그아웃 상태: 목업 예치금 현황 표시
  if (isLoggedOut) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-primary" />
            예치금 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-primary">₩3,250,000</p>
            <p className="text-xs text-muted-foreground">총 적립금</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">부가세 적립</span>
                <span className="font-medium">₩2,600,000</span>
              </div>
              <Progress value={80} className="h-2" />
              <p className="text-xs text-muted-foreground">목표 대비 80%</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">급여 적립</span>
                <span className="font-medium">₩650,000</span>
              </div>
              <Progress value={52} className="h-2" />
              <p className="text-xs text-muted-foreground">목표 대비 52%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-xs text-success">지난 달 대비 +₩450,000</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 로그인 상태: 준비 중 표시
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">예치금 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-6 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <PiggyBank className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            예치금 기능 준비 중
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            부가세, 급여 등 자동 적립 기능이 곧 추가됩니다
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
