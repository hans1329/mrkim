import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";

// 알림 기능은 아직 실데이터 연동 전 - 빈 상태 표시
export function AlertCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">최근 알림</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="py-6 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            새로운 알림이 없어요
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            중요한 알림이 생기면 여기에 표시됩니다
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
