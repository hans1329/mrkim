import { useState } from "react";
import { useConnectorStatus, useConnectorInstances } from "@/hooks/useConnectors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  PlusCircle,
  Unlink,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useConnection } from "@/contexts/ConnectionContext";
import { useConnectionDrawer } from "@/contexts/ConnectionDrawerContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_TO_STEP: Record<string, string> = {
  hometax: "hometax",
  bank: "account",
  card: "card",
};

// connector_id → ConnectionDrawer type 매핑
const CONNECTOR_TO_DRAWER_TYPE: Record<string, "hometax" | "card" | "account" | "coupangeats" | "baemin"> = {
  codef_hometax_tax_invoice: "hometax",
  codef_hometax_cash_receipt: "hometax",
  codef_bank_account: "account",
  codef_card_sales: "card",
  codef_card_usage: "card",
  hyphen_baemin: "baemin",
  hyphen_coupangeats: "coupangeats",
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
  const { hometaxConnected, cardConnected, accountConnected, profile, connectorInstances } = useConnection();
  const navigate = useNavigate();
  const { openDrawer } = useConnectionDrawer();

  // profiles fallback: connector_instances가 없을 때 카테고리별 연동 상태
  const profileFallback: Record<string, boolean> = {
    hometax: hometaxConnected,
    card: cardConnected,
    bank: accountConnected,
  };

  // profiles fallback: 연동 시점
  const profileConnectedAt: Record<string, string | null> = {
    hometax: profile?.hometax_connected_at || null,
    card: profile?.card_connected_at || null,
    bank: profile?.account_connected_at || null,
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

          // 같은 카테고리의 모든 연결된 인스턴스 수
          const connectedInstanceCount = connectorInstances.filter(
            (inst) => inst.connector_id === connector.id && inst.status === "connected"
          ).length;

          return (
            <div
              key={connector.id}
              className="p-3 rounded-lg bg-muted/50 space-y-2"
            >
              {/* 1행: 아이콘 + 이름 + 상태 배지 */}
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{connector.name}</p>
                  {connectedInstanceCount > 1 && (
                    <p className="text-[10px] text-muted-foreground">{connectedInstanceCount}개 연동됨</p>
                  )}
                </div>
                {isConnected ? (
                  <Badge variant={statusInfo!.variant} className="text-[10px] gap-0.5 shrink-0 px-1.5 py-0.5">
                    {StatusIcon && <StatusIcon className="h-2.5 w-2.5" />}
                    {statusInfo!.label}
                  </Badge>
                ) : statusInfo ? (
                  <Badge variant={statusInfo.variant} className="text-[10px] gap-0.5 shrink-0 px-1.5 py-0.5">
                    {StatusIcon && <StatusIcon className="h-2.5 w-2.5" />}
                    {statusInfo.label}
                  </Badge>
                ) : null}
              </div>
              {/* 2행: 동기화 시간 + 액션 버튼 */}
              <div className="flex items-center justify-between pl-[42px]">
                <p className="text-[10px] text-muted-foreground">
                  {instance?.last_sync_at
                    ? formatDistanceToNow(new Date(instance.last_sync_at), { addSuffix: true, locale: ko }) + " 동기화"
                    : isFallbackConnected && profileConnectedAt[connector.category]
                      ? formatDistanceToNow(new Date(profileConnectedAt[connector.category]!), { addSuffix: true, locale: ko }) + " 연동"
                      : isConnected ? "연동 완료" : "미연동"}
                </p>
                <div className="flex items-center gap-0.5">
                  {(isConnected || instance) && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground"
                        onClick={() => {
                          const drawerType = CONNECTOR_TO_DRAWER_TYPE[connector.id];
                          if (drawerType) openDrawer(drawerType);
                        }}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      {(connector.category === "card" || connector.category === "bank") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-1.5 gap-0.5 text-[10px] text-muted-foreground hover:text-primary"
                          onClick={() => {
                            const drawerType = CONNECTOR_TO_DRAWER_TYPE[connector.id];
                            if (drawerType) openDrawer(drawerType);
                          }}
                        >
                          <PlusCircle className="h-3 w-3" />
                          추가
                        </Button>
                      )}
                    </>
                  )}
                  {!isConnected && !instance && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        const drawerType = CONNECTOR_TO_DRAWER_TYPE[connector.id];
                        if (drawerType) openDrawer(drawerType);
                      }}
                    >
                      연동하기
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
