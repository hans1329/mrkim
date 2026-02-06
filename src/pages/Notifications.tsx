import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNotifications, Notification } from "@/hooks/useNotifications";
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

function NotificationSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2 mt-2">
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-7 w-14" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Notifications() {
  const {
    notifications,
    isLoading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

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

  if (isLoading) {
    return (
      <MainLayout
        title="알림"
        subtitle="로딩 중..."
        showBackButton
      >
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          {[1, 2, 3].map((i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout
      title="알림"
      subtitle={unreadCount > 0 ? `${unreadCount}개의 새 알림` : "모두 확인함"}
      showBackButton
    >
      <div className="space-y-4">
        {unreadCount > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            모두 읽음 처리
          </Button>
        )}

        {notifications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">알림이 없습니다</p>
              <p className="text-sm text-muted-foreground">
                새 알림이 오면 여기에 표시됩니다
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const config = alertConfig[notification.type] || alertConfig.info;
              const Icon = config.icon;

              return (
                <Card
                  key={notification.id}
                  className={cn(!notification.read && "ring-1 ring-primary/20")}
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
                            <p className="font-medium text-sm">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <Badge className="h-5 px-1.5 text-xs">NEW</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <div className="mt-2 flex gap-2">
                          {!notification.read && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => markAsRead.mutate(notification.id)}
                              disabled={markAsRead.isPending}
                            >
                              읽음
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              deleteNotification.mutate(notification.id)
                            }
                            disabled={deleteNotification.isPending}
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
