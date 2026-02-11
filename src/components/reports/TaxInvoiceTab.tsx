import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IncomeTaxEstimateSection } from "./IncomeTaxEstimateSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Receipt,
  Building2,
  Clock
} from "lucide-react";
import { useTaxInvoices } from "@/hooks/useTaxInvoices";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useState } from "react";

type FilterType = "all" | "sales" | "purchase";

export function TaxInvoiceTab() {
  const { profile, loading: profileLoading } = useProfile();
  const { 
    invoices,
    syncStatus, 
    loading, 
    syncing, 
    syncTaxInvoices,
    salesTotal,
    purchaseTotal,
    vatPayable,
  } = useTaxInvoices();
  
  const [filter, setFilter] = useState<FilterType>("all");

  const isConnected = profile?.hometax_connected;

  const formatAmount = (amount: number) => {
    return amount.toLocaleString();
  };

  const formatShortAmount = (amount: number) => {
    if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(1)}억`;
    }
    if (amount >= 10000) {
      return `${Math.floor(amount / 10000).toLocaleString()}만`;
    }
    return amount.toLocaleString();
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filter === "all") return true;
    return inv.invoice_type === filter;
  });

  const lastSyncText = syncStatus?.last_sync_at 
    ? formatDistanceToNow(new Date(syncStatus.last_sync_at), { addSuffix: true, locale: ko })
    : null;

  // 로딩 상태
  if (loading || profileLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  // 미연결 상태
  if (!isConnected) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">홈택스 연동이 필요합니다</h3>
            <p className="text-sm text-muted-foreground mb-4">
              홈택스를 연동하면 세금계산서 현황을<br />
              자동으로 확인할 수 있어요
            </p>
            <Button onClick={() => window.location.href = "/onboarding"}>
              홈택스 연동하기
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-muted/50 border-border/50">
          <CardContent className="p-4">
            <span className="text-sm text-muted-foreground">매출</span>
            <p className="text-xl font-bold text-green-600 mt-1">
              ₩{formatShortAmount(salesTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {syncStatus?.sales_count || 0}건
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/50 border-border/50">
          <CardContent className="p-4">
            <span className="text-sm text-muted-foreground">매입</span>
            <p className="text-xl font-bold text-red-600 mt-1">
              ₩{formatShortAmount(purchaseTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {syncStatus?.purchase_count || 0}건
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-muted/50 border-border/50">
          <CardContent className="p-4">
            <span className="text-sm text-muted-foreground">
              {vatPayable >= 0 ? "부가세" : "환급"}
            </span>
            <p className={cn(
              "text-xl font-bold mt-1",
              vatPayable >= 0 ? "text-amber-600" : "text-blue-600"
            )}>
              ₩{formatShortAmount(Math.abs(vatPayable))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">예상금액</p>
          </CardContent>
        </Card>
      </div>

      {/* 세금계산서 목록 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              세금계산서 목록
            </CardTitle>
            <button
              onClick={syncTaxInvoices}
              disabled={syncing}
              className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* 필터 */}
          <div className="flex gap-2 mb-4 pb-3 border-b">
            {[
              { key: "all" as FilterType, label: "전체", count: invoices.length },
              { key: "sales" as FilterType, label: "매출", count: invoices.filter(i => i.invoice_type === "sales").length },
              { key: "purchase" as FilterType, label: "매입", count: invoices.filter(i => i.invoice_type === "purchase").length },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  filter === item.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {item.label} <span className="text-muted-foreground/50 font-normal">{item.count}</span>
              </button>
            ))}
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {invoices.length === 0 
                  ? "세금계산서 데이터가 없습니다"
                  : "해당 조건의 세금계산서가 없습니다"
                }
              </p>
              {invoices.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  상단의 동기화 버튼을 눌러주세요
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredInvoices.map((invoice) => (
                <div 
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center shrink-0",
                      invoice.invoice_type === "sales" 
                        ? "bg-green-100 text-green-600" 
                        : "bg-red-100 text-red-600"
                    )}>
                      {invoice.invoice_type === "sales" 
                        ? <TrendingUp className="h-4 w-4" />
                        : <TrendingDown className="h-4 w-4" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {invoice.invoice_type === "sales" 
                          ? invoice.buyer_name || "거래처 미상"
                          : invoice.supplier_name || "거래처 미상"
                        }
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{format(new Date(invoice.invoice_date), "yy.MM.dd")}</span>
                        <span className="text-muted-foreground/50">•</span>
                        <span className={cn(
                          invoice.invoice_type === "sales" ? "text-green-600" : "text-red-600"
                        )}>
                          {invoice.invoice_type === "sales" ? "매출" : "매입"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={cn(
                      "text-sm font-semibold tabular-nums",
                      invoice.invoice_type === "sales" ? "text-green-600" : "text-red-600"
                    )}>
                      {invoice.invoice_type === "sales" ? "+" : "-"}₩{formatAmount(invoice.total_amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      세액 ₩{formatAmount(invoice.tax_amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

        {/* 종합소득세 예상 섹션 */}
        <IncomeTaxEstimateSection 
          salesTotal={salesTotal} 
          purchaseTotal={purchaseTotal} 
        />
    </div>
  );
}
