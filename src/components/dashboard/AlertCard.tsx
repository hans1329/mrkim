import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, formatCurrency } from "@/data/mockData";
import { AlertTriangle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertCardProps {
  alerts: Alert[];
}

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

export function AlertCard({ alerts }: AlertCardProps) {
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">최근 알림</CardTitle>
          {unreadCount > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-xs font-medium text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.slice(0, 5).map((alert) => {
          const config = alertConfig[alert.type];
          const Icon = config.icon;

          return (
            <div
              key={alert.id}
              className={cn(
                "flex gap-3 rounded-lg border p-3",
                config.bgColor,
                config.borderColor,
                !alert.read && "ring-1 ring-inset ring-primary/20"
              )}
            >
              <div className={cn("mt-0.5", config.iconColor)}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className={cn("font-medium", !alert.read && "text-foreground")}>
                  {alert.title}
                </p>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
