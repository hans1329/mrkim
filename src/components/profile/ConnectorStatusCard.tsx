import { useConnectorStatus } from "@/hooks/useConnectors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Receipt,
  Landmark,
  CreditCard,
  BarChart3,
  FileCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Link2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const CATEGORY_TO_STEP: Record<string, string> = {
  hometax: "hometax",
  bank: "account",
  card: "card",
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  hometax: FileText,
  bank: Landmark,
  card: CreditCard,
  delivery: BarChart3,
  pg: Receipt,
  shopping: BarChart3,
  giro: FileCheck,
  credit_finance: CreditCard,
};

const STATUS_CONFIG = {
  connected: { label: "연결됨", variant: "default" as const, icon: CheckCircle2, color: "text-green-600" },
  pending: { label: "대기중", variant: "secondary" as const, icon: Clock, color: "text-amber-600" },
  failed: { label: "실패", variant: "destructive" as const, icon: XCircle, color: "text-destructive" },
  expired: { label: "만료", variant: "outline" as const, icon: AlertCircle, color: "text-amber-600" },
  disconnected: { label: "해제됨", variant: "outline" as const, icon: XCircle, color: "text-muted-foreground" },
};

export function ConnectorStatusCard() {
  const { data: connectors, isLoading } = useConnectorStatus();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">데이터 연동 현황</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </CardContent>
      </Card>
    );
  }

  const connectedCount = connectors?.filter((c) => c.instance?.status === "connected").length || 0;
  const totalCount = connectors?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">데이터 연동 현황</CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {connectedCount}/{totalCount} 연동
          </Badge>
        </div>
        <CardDescription className="text-xs">
          코드에프를 통한 금융 데이터 연동 상태를 확인합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {connectors?.map((connector) => {
          const Icon = CATEGORY_ICONS[connector.category] || FileText;
          const instance = connector.instance;
          const statusInfo = instance
            ? STATUS_CONFIG[instance.status]
            : null;
          const StatusIcon = statusInfo?.icon;

          return (
            <div
              key={connector.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{connector.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {connector.description}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {instance ? (
                  <div className="space-y-1">
                    <Badge variant={statusInfo!.variant} className="text-xs gap-1">
                      {StatusIcon && <StatusIcon className="h-3 w-3" />}
                      {statusInfo!.label}
                    </Badge>
                    {instance.last_sync_at && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(instance.last_sync_at), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </p>
                    )}
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs text-muted-foreground cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => {
                      const step = CATEGORY_TO_STEP[connector.category];
                      if (step) navigate(`/onboarding?step=${step}`);
                    }}
                  >
                    미연동 →
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
