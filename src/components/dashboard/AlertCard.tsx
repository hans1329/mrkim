import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertCircle, TrendingUp, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertCardProps {
  isLoggedOut?: boolean;
}

export function AlertCard({ isLoggedOut = false }: AlertCardProps) {
  // 로그아웃 상태: 목업 알림 표시
  if (isLoggedOut) {
    const mockAlerts = [
      {
        id: "1",
        type: "warning",
        title: "부가세 신고 마감 D-7",
        time: "2시간 전",
        icon: CalendarClock,
      },
      {
        id: "2", 
        type: "success",
        title: "이번 주 매출 15% 증가",
        time: "오늘",
        icon: TrendingUp,
      },
      {
        id: "3",
        type: "info",
        title: "미분류 거래 12건 확인 필요",
        time: "어제",
        icon: AlertCircle,
      },
    ];

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            최근 알림
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                "flex items-start gap-3 p-2 rounded-lg",
                alert.type === "warning" && "bg-warning/10",
                alert.type === "success" && "bg-success/10",
                alert.type === "info" && "bg-muted"
              )}
            >
              <alert.icon className={cn(
                "h-4 w-4 mt-0.5",
                alert.type === "warning" && "text-warning",
                alert.type === "success" && "text-success",
                alert.type === "info" && "text-muted-foreground"
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.time}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // 로그인 상태: 빈 상태 표시
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
