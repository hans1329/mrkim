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
import { useConnectionDrawer } from "@/contexts/ConnectionDrawerContext";

interface HometaxSummaryCardProps {
  isLoggedOut?: boolean;
}

export function HometaxSummaryCard({ isLoggedOut = false }: HometaxSummaryCardProps) {
  const navigate = useNavigate();
  const { openDrawer } = useConnectionDrawer();
  const { profile, loading: profileLoading } = useProfile();
  const { 
    syncStatus, 
    loading, 
    syncing, 
    syncTaxInvoices,
    salesTotal,
    purchaseTotal,
    vatPayable,
    hasConnectedId,
  } = useTaxInvoices();

  const handleSync = () => {
    if (!hasConnectedId) {
      openDrawer("hometax");
      return;
    }
    syncTaxInvoices();
  };

  // 로그아웃 상태: 목업 데이터 표시
  if (isLoggedOut) {
    return (
      <Card className="cursor-pointer" onClick={() => navigate("/reports?tab=tax")}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              홈택스 현황
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigate("/reports?tab=tax"); }}>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5 pt-0">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5 bg-muted/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                </div>
                <span className="text-[11px] text-muted-foreground">매출</span>
              </div>
              <p className="text-base font-bold text-foreground">₩2.5억</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">42건</p>
            </div>
            <div className="rounded-lg p-2.5 bg-muted/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-3 w-3 text-red-600" />
                </div>
                <span className="text-[11px] text-muted-foreground">매입</span>
              </div>
              <p className="text-base font-bold text-foreground">₩1.2억</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">28건</p>
            </div>
          </div>
          <div className="rounded-lg p-2.5 bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Receipt className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">부가세 예상 납부액</p>
                  <p className="text-lg font-bold text-foreground">₩1,300만</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

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
    <Card className="cursor-pointer" onClick={() => navigate("/reports?tab=tax")}>
      <CardHeader className="pb-2 relative">
        <div className="flex items-center pr-10">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            홈택스 현황
          </CardTitle>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 absolute top-2 right-2 text-muted-foreground/60 hover:text-muted-foreground/80"
          onClick={(e) => { e.stopPropagation(); handleSync(); }}
          disabled={syncing}
        >
          <RefreshCw className={cn("h-4 w-4 text-current", syncing && "animate-spin")} />
        </Button>
        {lastSyncText && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="h-3 w-3" />
            {lastSyncText} 업데이트
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        {!hasData ? (
          <div className="text-center py-5">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-2.5">
              <Receipt className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              세금계산서 데이터가 없습니다
            </p>
            <Button 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); handleSync(); }}
              disabled={syncing}
              className="gap-1.5 h-9 text-xs rounded-full w-full"
            >
              {hasConnectedId ? (
                <>
                  <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
                  지금 동기화하기
                </>
              ) : (
                "간편인증으로 연동하기"
              )}
            </Button>
          </div>
        ) : (
          <>
            {/* 매출/매입 요약 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-2.5 bg-muted/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">매출</span>
                </div>
                <p className="text-base font-bold text-foreground">
                  ₩{formatAmount(salesTotal)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {syncStatus?.sales_count || 0}건
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-muted/50">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  </div>
                  <span className="text-[11px] text-muted-foreground">매입</span>
                </div>
                <p className="text-base font-bold text-foreground">
                  ₩{formatAmount(purchaseTotal)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {syncStatus?.purchase_count || 0}건
                </p>
              </div>
            </div>

            {/* 부가세 예상 */}
            <div className="rounded-lg p-2.5 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center",
                    vatPayable >= 0 ? "bg-amber-100" : "bg-blue-100"
                  )}>
                    <Receipt className={cn(
                      "h-3.5 w-3.5",
                      vatPayable >= 0 ? "text-amber-600" : "text-blue-600"
                    )} />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">
                      부가세 예상 {vatPayable >= 0 ? "납부액" : "환급액"}
                    </p>
                    <p className="text-lg font-bold text-foreground">
                      ₩{formatAmount(Math.abs(vatPayable))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
