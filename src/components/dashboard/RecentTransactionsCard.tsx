import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, mockTransactions } from "@/data/mockData";
import { TrendingUp, TrendingDown, RefreshCw, Calendar, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCardSync } from "@/hooks/useCardSync";
import { useRecentTransactions } from "@/hooks/useDashboardStats";
import { useCardConnectionInfo } from "@/hooks/useCardConnectionInfo";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// 목업 데이터를 Transaction 형식으로 변환
const getMockTransactions = () =>
  mockTransactions.slice(0, 5).map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: tx.amount,
    type: tx.type as "income" | "expense",
    category: tx.category,
    source_type: tx.paymentMethod === "card" ? "card" : "transfer",
    transaction_date: tx.date,
  }));

export function RecentTransactionsCard() {
  const navigate = useNavigate();
  const { data: result, isLoading: loading } = useRecentTransactions();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const cardSync = useCardSync();
  const cardInfo = useCardConnectionInfo();

  const isLoggedIn = result !== null && result !== undefined;
  const transactions = result?.hasRealData ? result.data : getMockTransactions();
  const showSampleWatermark = !isLoggedIn || !result?.hasRealData;

  const handleSync = async () => {
    if (!isLoggedIn) {
      toast.info("로그인 후 이용 가능합니다");
      return;
    }
    
    const connectedId = cardInfo.connectedId;
    const cardCompanyId = cardInfo.cardCompanyId;
    const cardCompanyName = cardInfo.cardCompanyName;

    if (!connectedId || !cardCompanyId) {
      toast.error("연동된 카드 정보가 없습니다. 카드를 먼저 연결해주세요.");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await cardSync.mutateAsync({
        connectedId,
        cardCompanyId,
        cardCompanyName: cardCompanyName || cardCompanyId,
      });

      if (result.synced > 0) {
        toast.success(`${result.synced}건의 새 거래 내역을 동기화했습니다`);
      } else {
        toast.info("새로운 거래 내역이 없습니다");
      }

      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-transactions"] });
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("동기화 중 오류가 발생했습니다");
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 거래 내역</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer" onClick={() => navigate("/transactions")}>
      <CardHeader className="pb-3 relative">
        <div className="pr-10">
          <CardTitle className="text-base">최근 거래 내역</CardTitle>
          {result?.hasRealData && transactions.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              최근 {transactions.length}건 · {transactions[transactions.length - 1]?.transaction_date?.replace(/-/g, ".")} ~
            </p>
          )}
        </div>
        {isLoggedIn && (
          <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-2 right-2 text-muted-foreground/60 hover:text-muted-foreground/80" onClick={(e) => { e.stopPropagation(); handleSync(); }} disabled={isSyncing}>
            <RefreshCw className={cn("h-4 w-4 text-current", isSyncing && "animate-spin")} />
          </Button>
        )}
      </CardHeader>
      <CardContent className="relative">
        {showSampleWatermark && !isLoggedIn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="px-3 py-1 border-2 border-dashed border-muted-foreground/30 rounded-lg -rotate-12">
              <span className="text-muted-foreground/40 font-bold text-sm tracking-widest">Sample</span>
            </div>
          </div>
        )}
        <div className="space-y-3">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  transaction.type === "income" ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30"
                )}>
                  {transaction.type === "income" ? (
                    <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium truncate max-w-[150px]">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.category || "미분류"} · {transaction.source_type === "card" ? "카드" : "이체"}
                  </p>
                </div>
              </div>
              <p className={cn(
                "text-sm font-semibold",
                transaction.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                {transaction.type === "income" ? "+" : "-"}{formatCurrency(transaction.amount)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
