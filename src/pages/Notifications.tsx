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
  },
  info: {
    icon: Info,
    bgColor: "bg-primary/10",
    iconColor: "text-primary",
  },
  success: {
    icon: CheckCircle,
    bgColor: "bg-success/10",
    iconColor: "text-success",
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
    <MainLayout 
      title="알림" 
      subtitle={unreadCount > 0 ? `${unreadCount}개의 새 알림` : "모두 확인함"}
    >
      <div className="space-y-4">
        {unreadCount > 0 && (
          <Button variant="outline" className="w-full" onClick={markAllAsRead}>
            <Check className="mr-2 h-4 w-4" />
            모두 읽음 처리
          </Button>
        )}

        {alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">알림이 없습니다</p>
              <p className="text-sm text-muted-foreground">새 알림이 오면 여기에 표시됩니다</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const config = alertConfig[alert.type];
              const Icon = config.icon;

              return (
                <Card
                  key={alert.id}
                  className={cn(!alert.read && "ring-1 ring-primary/20")}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                          config.bgColor
                        )}
                      >
                        <Icon className={cn("h-5 w-5", config.iconColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{alert.title}</p>
                            {!alert.read && (
                              <Badge className="h-5 px-1.5 text-xs">NEW</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(alert.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
                        <div className="mt-2 flex gap-2">
                          {!alert.read && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => markAsRead(alert.id)}
                            >
                              읽음
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
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
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
