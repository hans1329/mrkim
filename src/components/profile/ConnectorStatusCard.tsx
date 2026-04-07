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
  Unlink,
  Loader2,
  Trash2,
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
  const queryClient = useQueryClient();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<{ id: string; name: string } | null>(null);
  const [confirmResync, setConfirmResync] = useState<{ id: string; name: string } | null>(null);
  const [confirmPurge, setConfirmPurge] = useState<{ id: string; name: string; category: string } | null>(null);
  const [purging, setPurging] = useState<string | null>(null);

  // 카테고리별 데이터 삭제 매핑
  const purgeByCategory = async (userId: string, category: string) => {
    switch (category) {
      case "hometax":
        await Promise.all([
          supabase.from("tax_invoices").delete().eq("user_id", userId),
          supabase.from("hometax_sync_status").delete().eq("user_id", userId),
        ]);
        await supabase.from("profiles").update({ hometax_connected: false, hometax_connected_at: null }).eq("user_id", userId);
        break;
      case "card":
        await supabase.from("transactions").delete().eq("user_id", userId).eq("source_type", "card");
        await supabase.from("profiles").update({ card_connected: false, card_connected_at: null }).eq("user_id", userId);
        break;
      case "bank":
        await supabase.from("transactions").delete().eq("user_id", userId).eq("source_type", "bank");
        await supabase.from("connected_accounts").delete().eq("user_id", userId);
        await supabase.from("profiles").update({ account_connected: false, account_connected_at: null }).eq("user_id", userId);
        break;
      case "delivery":
        await Promise.all([
          supabase.from("delivery_orders").delete().eq("user_id", userId),
          supabase.from("delivery_stores").delete().eq("user_id", userId),
          supabase.from("delivery_menus").delete().eq("user_id", userId),
          supabase.from("delivery_settlements").delete().eq("user_id", userId),
          supabase.from("delivery_statistics").delete().eq("user_id", userId),
          supabase.from("delivery_reviews").delete().eq("user_id", userId),
          supabase.from("delivery_ads").delete().eq("user_id", userId),
          supabase.from("delivery_pg_sales").delete().eq("user_id", userId),
          supabase.from("delivery_nearby_sales").delete().eq("user_id", userId),
          supabase.from("transactions").delete().eq("user_id", userId).eq("source_type", "delivery"),
        ]);
        break;
    }
  };

  const handlePurgeConnector = async (connectorId: string, category: string) => {
    setPurging(connectorId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      // 연동 해제
      await supabase
        .from("connector_instances")
        .update({ status: "disconnected" as any, last_sync_at: null })
        .eq("connector_id", connectorId)
        .eq("user_id", user.id);

      // 카테고리별 데이터 삭제
      await purgeByCategory(user.id, category);

      queryClient.invalidateQueries({ queryKey: ["connector_instances"] });
      queryClient.invalidateQueries({ queryKey: ["connector-status"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });

      toast.success("데이터가 삭제되고 연동이 해제되었습니다");
    } catch (error) {
      console.error("Purge error:", error);
      toast.error("데이터 삭제 중 오류가 발생했습니다");
    } finally {
      setPurging(null);
      setConfirmPurge(null);
    }
  };

  const handleResync = async (connectorId: string) => {
    setSyncing(connectorId);
    try {
      const { data, error } = await supabase.functions.invoke("sync-orchestrator", {
        body: { connectorId, forceFullSync: true },
      });
      if (error) throw error;

      if (data?.success) {
        const results = data.results || [];
        const successResults = results.filter((r: any) => r.success);
        const failedResults = results.filter((r: any) => !r.success);
        const totalSaved = successResults.reduce((sum: number, r: any) => sum + (r.recordsSaved || 0), 0);

        if (failedResults.length > 0 && successResults.length === 0) {
          toast.error(`데이터 수집 실패: ${failedResults[0]?.error || "알 수 없는 오류"}`);
        } else if (totalSaved > 0) {
          toast.success(`${totalSaved}건의 데이터를 수집했습니다`);
        } else {
          toast.info("새로운 데이터가 없습니다");
        }
      } else {
        toast.error(data?.error || "데이터 재수집에 실패했습니다");
      }

      queryClient.invalidateQueries({ queryKey: ["connector_instances"] });
      queryClient.invalidateQueries({ queryKey: ["connector-status"] });
    } catch (err) {
      console.error("Resync error:", err);
      toast.error("데이터 재수집에 실패했습니다");
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (connectorId: string) => {
    setDisconnecting(connectorId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // connector_instances에서 해당 connector의 인스턴스들을 disconnected로 변경
      const { error } = await supabase
        .from("connector_instances")
        .update({ status: "disconnected" as any })
        .eq("connector_id", connectorId)
        .eq("user_id", user.id);
      
      if (error) throw error;

      // profiles 플래그도 업데이트
      const category = connectors?.find(c => c.id === connectorId)?.category;
      if (category === "hometax") {
        await supabase.from("profiles").update({ hometax_connected: false, hometax_connected_at: null }).eq("user_id", user.id);
      } else if (category === "card") {
        await supabase.from("profiles").update({ card_connected: false, card_connected_at: null }).eq("user_id", user.id);
      } else if (category === "bank") {
        await supabase.from("profiles").update({ account_connected: false, account_connected_at: null }).eq("user_id", user.id);
      }

      queryClient.invalidateQueries({ queryKey: ["connector_instances"] });
      queryClient.invalidateQueries({ queryKey: ["connector-status"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("연동이 해제되었습니다");
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("연동 해제에 실패했습니다");
    } finally {
      setDisconnecting(null);
      setConfirmDisconnect(null);
    }
  };

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

  // 사용하지 않는 커넥터 필터링 (여신금융협회, 인터넷지로 등)
  const HIDDEN_CONNECTORS = ["codef_card_sales", "codef_giro"];
  const filteredConnectors = connectors?.filter(c => !HIDDEN_CONNECTORS.includes(c.id));

  const connectedCount = filteredConnectors?.filter((c) => {
    if (c.instance?.status === "connected") return true;
    if (!c.instance && profileFallback[c.category]) return true;
    return false;
  }).length || 0;
  const totalCount = filteredConnectors?.length || 0;

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
        {filteredConnectors?.map((connector) => {
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
                </div>
                {isConnected ? (
                  <Badge variant={statusInfo!.variant} className="text-[10px] gap-0.5 shrink-0 px-1.5 py-0.5">
                    {StatusIcon && <StatusIcon className="h-2.5 w-2.5" />}
                    {connectedInstanceCount > 1 ? `${connectedInstanceCount}개 연동됨` : statusInfo!.label}
                  </Badge>
                ) : statusInfo ? (
                  <Badge variant={statusInfo.variant} className="text-[10px] gap-0.5 shrink-0 px-1.5 py-0.5">
                    {StatusIcon && <StatusIcon className="h-2.5 w-2.5" />}
                    {statusInfo.label}
                  </Badge>
                ) : null}
              </div>
              {/* 2행: 액션 버튼 */}
              <div className="flex items-center justify-center">
                {isConnected && (
                  <div className="space-y-1 w-full">
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 flex-1 gap-1 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => {
                          const drawerType = CONNECTOR_TO_DRAWER_TYPE[connector.id];
                          if (drawerType) openDrawer(drawerType);
                        }}
                      >
                        <Settings className="h-3 w-3" />
                        연동 관리
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 flex-1 gap-1 text-xs text-muted-foreground hover:text-primary"
                        disabled={syncing === connector.id}
                        onClick={() => setConfirmResync({ id: connector.id, name: connector.name })}
                      >
                        {syncing === connector.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        재수집
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 flex-1 gap-1 text-xs text-muted-foreground hover:text-destructive"
                        disabled={disconnecting === connector.id}
                        onClick={() => setConfirmDisconnect({ id: connector.id, name: connector.name })}
                      >
                        {disconnecting === connector.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Unlink className="h-3 w-3" />
                        )}
                        연동 끊기
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 flex-1 gap-1 text-xs text-muted-foreground hover:text-destructive"
                        disabled={purging === connector.id}
                        onClick={() => setConfirmPurge({ id: connector.id, name: connector.name, category: connector.category })}
                      >
                        {purging === connector.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        데이터 삭제
                      </Button>
                    </div>
                  </div>
                )}
                {!isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-full text-xs"
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
          );
        })}

      </CardContent>

      {/* 연동 해제 확인 다이얼로그 */}
      <AlertDialog open={!!confirmDisconnect} onOpenChange={(open) => !open && setConfirmDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>연동을 해제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDisconnect?.name} 연동을 해제하면 더 이상 데이터가 동기화되지 않습니다.
              기존 데이터는 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDisconnect && handleDisconnect(confirmDisconnect.id)}
            >
              해제하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 재수집 확인 다이얼로그 */}
      <AlertDialog open={!!confirmResync} onOpenChange={(open) => !open && setConfirmResync(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>데이터를 재수집하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmResync?.name}의 전체 데이터를 처음부터 다시 수집합니다.
              기존 데이터와 중복되는 항목은 자동으로 병합됩니다.
              수집에 시간이 다소 걸릴 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmResync) {
                  handleResync(confirmResync.id);
                  setConfirmResync(null);
                }
              }}
            >
              재수집 시작
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 데이터 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!confirmPurge} onOpenChange={(open) => !open && setConfirmPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ {confirmPurge?.name} 데이터를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">이 작업은 되돌릴 수 없습니다.</span>
              <span className="block text-destructive font-medium">
                {confirmPurge?.name}에서 수집된 모든 데이터가 삭제되며, 연동도 함께 해제됩니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!purging}
              onClick={() => confirmPurge && handlePurgeConnector(confirmPurge.id, confirmPurge.category)}
            >
              {purging ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  삭제 중...
                </>
              ) : (
                "삭제하기"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
