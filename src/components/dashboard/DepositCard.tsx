import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank } from "lucide-react";

// 예치금 기능은 아직 실데이터 연동 전 - 빈 상태 표시
export function DepositCard() {
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
