import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockAlerts, Alert } from "@/data/mockData";
import { AlertTriangle, Info, CheckCircle, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const alertConfig = {
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-warning/10",
    iconColor: "text-warning",
    borderColor: "border-warning/30",
  },
  info: {
    icon: Info,
    bgColor: "bg-primary/10",
    iconColor: "text-primary",
    borderColor: "border-primary/30",
  },
  success: {
    icon: CheckCircle,
    bgColor: "bg-success/10",
    iconColor: "text-success",
    borderColor: "border-success/30",
  },
};

export default function Notifications() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAsRead = (id: string) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const markAllAsRead = () => {
    setAlerts(alerts.map((a) => ({ ...a, read: true })));
  };

  const deleteAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return date.toLocaleDateString("ko-KR");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">알림</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount}개의 읽지 않은 알림이 있습니다` : "모든 알림을 확인했습니다"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              모두 읽음 처리
            </Button>
          )}
        </div>

        {/* 알림 목록 */}
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-lg font-medium">알림이 없습니다</p>
                <p className="text-muted-foreground">새로운 알림이 오면 여기에 표시됩니다</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;

              return (
                <Card
                  key={alert.id}
                  className={cn(
                    "transition-all",
                    !alert.read && "ring-1 ring-primary/20"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          config.bgColor
                        )}
                      >
                        <Icon className={cn("h-5 w-5", config.iconColor)} />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{alert.title}</p>
                            {!alert.read && (
                              <Badge className="h-5 px-1.5 text-xs">새 알림</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(alert.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <div className="mt-3 flex gap-2">
                          {!alert.read && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => markAsRead(alert.id)}
                            >
                              <Check className="mr-1 h-3 w-3" />
                              읽음
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAlert(alert.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            삭제
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}
