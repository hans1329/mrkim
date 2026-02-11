import { useConnectorStatus } from "@/hooks/useConnectors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useConnection } from "@/contexts/ConnectionContext";

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
  const { hometaxConnected, cardConnected, accountConnected } = useConnection();
  const navigate = useNavigate();

  // profiles fallback: connector_instances가 없을 때 카테고리별 연동 상태
  const profileFallback: Record<string, boolean> = {
    hometax: hometaxConnected,
    card: cardConnected,
    bank: accountConnected,
  };

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

  const connectedCount = connectors?.filter((c) => {
    if (c.instance?.status === "connected") return true;
    // fallback: profiles 플래그 확인
    if (!c.instance && profileFallback[c.category]) return true;
    return false;
  }).length || 0;
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
          const isFallbackConnected = !instance && profileFallback[connector.category];
          const statusInfo = instance
            ? STATUS_CONFIG[instance.status]
            : isFallbackConnected
              ? STATUS_CONFIG.connected
              : null;
          const StatusIcon = statusInfo?.icon;
          const isConnected = instance?.status === "connected" || isFallbackConnected;

          return (
            <div
              key={connector.id}
              className="flex items-center gap-2.5 p-3 rounded-lg bg-muted/50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{connector.name}</p>
                  {isConnected ? (
                    <Badge variant={statusInfo!.variant} className="text-[10px] gap-0.5 shrink-0 px-1.5 py-0">
                      {StatusIcon && <StatusIcon className="h-2.5 w-2.5" />}
                      {statusInfo!.label}
                    </Badge>
                  ) : statusInfo ? (
                    <Badge variant={statusInfo.variant} className="text-[10px] gap-0.5 shrink-0 px-1.5 py-0">
                      {StatusIcon && <StatusIcon className="h-2.5 w-2.5" />}
                      {statusInfo.label}
                    </Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {instance?.last_sync_at && (
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(instance.last_sync_at), {
                        addSuffix: true,
                        locale: ko,
                      })}
                    </p>
                  )}
                </div>
              </div>
              <div className="shrink-0">
                {isConnected || instance ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => {
                      const step = CATEGORY_TO_STEP[connector.category];
                      if (step) navigate(`/onboarding?step=${step}`);
                    }}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    재연동
                  </Button>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs text-muted-foreground cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                    onClick={() => {
                      const step = CATEGORY_TO_STEP[connector.category];
                      if (step) navigate(`/onboarding?step=${step}`);
                    }}
                  >
                    연동 →
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
