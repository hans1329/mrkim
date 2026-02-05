import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

// 직원 관리 기능은 아직 실데이터 연동 전 - 빈 상태 표시
export function EmployeeSummaryCard() {
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
    </Card>
  );
}
