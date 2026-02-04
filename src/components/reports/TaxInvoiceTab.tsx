import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">매출</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              ₩{formatShortAmount(salesTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {syncStatus?.sales_count || 0}건
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              <span className="text-sm text-muted-foreground">매입</span>
            </div>
            <p className="text-xl font-bold text-red-600">
              ₩{formatShortAmount(purchaseTotal)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {syncStatus?.purchase_count || 0}건
            </p>
          </CardContent>
        </Card>
        
        <Card className={cn(
          vatPayable >= 0 ? "bg-amber-500/10 border-amber-500/20" : "bg-blue-500/10 border-blue-500/20"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className={cn(
                "h-4 w-4",
                vatPayable >= 0 ? "text-amber-600" : "text-blue-600"
              )} />
              <span className="text-sm text-muted-foreground">
                {vatPayable >= 0 ? "부가세 납부" : "부가세 환급"}
              </span>
            </div>
            <p className={cn(
              "text-xl font-bold",
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              세금계산서 목록
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastSyncText && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastSyncText}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={syncTaxInvoices}
                disabled={syncing}
                className="h-8 gap-1"
              >
                <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
                {syncing ? "동기화 중..." : "동기화"}
              </Button>
            </div>
          </div>
          
          {/* 필터 */}
          <div className="flex gap-2 mt-3">
            <Badge 
              variant={filter === "all" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter("all")}
            >
              전체 ({invoices.length})
            </Badge>
            <Badge 
              variant={filter === "sales" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter("sales")}
            >
              매출 ({invoices.filter(i => i.invoice_type === "sales").length})
            </Badge>
            <Badge 
              variant={filter === "purchase" ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilter("purchase")}
            >
              매입 ({invoices.filter(i => i.invoice_type === "purchase").length})
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {invoices.length === 0 
                  ? "세금계산서 데이터가 없습니다. 동기화를 진행해주세요."
                  : "해당 조건의 세금계산서가 없습니다."
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">일자</TableHead>
                    <TableHead className="w-[60px]">구분</TableHead>
                    <TableHead>거래처</TableHead>
                    <TableHead className="text-right">공급가</TableHead>
                    <TableHead className="text-right">세액</TableHead>
                    <TableHead className="text-right">합계</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-xs">
                        {format(new Date(invoice.invoice_date), "yy.MM.dd")}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={invoice.invoice_type === "sales" ? "default" : "secondary"}
                          className={cn(
                            "text-[10px]",
                            invoice.invoice_type === "sales" 
                              ? "bg-green-100 text-green-700 hover:bg-green-100" 
                              : "bg-red-100 text-red-700 hover:bg-red-100"
                          )}
                        >
                          {invoice.invoice_type === "sales" ? "매출" : "매입"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate text-sm">
                        {invoice.invoice_type === "sales" 
                          ? invoice.buyer_name || "-"
                          : invoice.supplier_name || "-"
                        }
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatAmount(invoice.supply_amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {formatAmount(invoice.tax_amount)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm tabular-nums">
                        {formatAmount(invoice.total_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
