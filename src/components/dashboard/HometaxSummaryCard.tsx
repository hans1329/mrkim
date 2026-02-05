import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Building2, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Receipt,
  ArrowRight,
  Clock
} from "lucide-react";
import { useTaxInvoices } from "@/hooks/useTaxInvoices";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

export function HometaxSummaryCard() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { 
    syncStatus, 
    loading, 
    syncing, 
    syncTaxInvoices,
    salesTotal,
    purchaseTotal,
    vatPayable,
  } = useTaxInvoices();

  const isConnected = profile?.hometax_connected;

  // 로딩 상태
  if (loading || profileLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-[72px] rounded-lg" />
            <Skeleton className="h-[72px] rounded-lg" />
          </div>
          <Skeleton className="h-16 rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // 미연결 상태
  if (!isConnected) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            홈택스 연동
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Building2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              홈택스를 연동하면 세금계산서 현황을<br />
              자동으로 확인할 수 있어요
            </p>
            <Button 
              size="sm" 
              onClick={() => navigate("/onboarding")}
              className="gap-1.5"
            >
              연동하기
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 동기화 필요 상태 (데이터 없음)
  const hasData = syncStatus && (syncStatus.sales_count > 0 || syncStatus.purchase_count > 0);

  const formatAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억`;
    }
    if (amount >= 10000) {
      return `${Math.floor(amount / 10000).toLocaleString()}만`;
    }
    return amount.toLocaleString();
  };

  const lastSyncText = syncStatus?.last_sync_at 
    ? formatDistanceToNow(new Date(syncStatus.last_sync_at), { addSuffix: true, locale: ko })
    : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            홈택스 현황
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={syncTaxInvoices}
            disabled={syncing}
          >
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
          </Button>
        </div>
        {lastSyncText && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            {lastSyncText} 업데이트
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasData ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              세금계산서 데이터가 없습니다
            </p>
            <Button 
              size="sm" 
              onClick={syncTaxInvoices}
              disabled={syncing}
              className="gap-1.5"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
              지금 동기화하기
            </Button>
          </div>
        ) : (
          <>
            {/* 매출/매입 요약 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg p-3 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">매출</span>
                </div>
                <p className="text-lg font-bold text-green-600">
                  ₩{formatAmount(salesTotal)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {syncStatus?.sales_count || 0}건
                </p>
              </div>
              <div className="rounded-lg p-3 bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center">
                    <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  <span className="text-xs text-muted-foreground">매입</span>
                </div>
                <p className="text-lg font-bold text-red-600">
                  ₩{formatAmount(purchaseTotal)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {syncStatus?.purchase_count || 0}건
                </p>
              </div>
            </div>

            {/* 부가세 예상 */}
            <div className="rounded-lg p-3 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center",
                    vatPayable >= 0 ? "bg-amber-100" : "bg-blue-100"
                  )}>
                    <Receipt className={cn(
                      "h-4 w-4",
                      vatPayable >= 0 ? "text-amber-600" : "text-blue-600"
                    )} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      부가세 예상 {vatPayable >= 0 ? "납부액" : "환급액"}
                    </p>
                    <p className={cn(
                      "text-xl font-bold",
                      vatPayable >= 0 ? "text-amber-600" : "text-blue-600"
                    )}>
                      ₩{formatAmount(Math.abs(vatPayable))}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/reports?tab=tax")}
                  className="text-xs h-8"
                >
                  상세보기
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
