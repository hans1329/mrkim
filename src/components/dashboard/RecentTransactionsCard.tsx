import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Receipt, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCardSync } from "@/hooks/useCardSync";
import { toast } from "sonner";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string | null;
  source_type: string;
  transaction_date: string;
}

export function RecentTransactionsCard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const cardSync = useCardSync();

  const fetchTransactions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, type, category, source_type, transaction_date")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setTransactions((data || []) as Transaction[]);
    } catch (error) {
      console.error("거래 내역 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSync = async () => {
    const connectedId = localStorage.getItem("codef_connected_id");
    const cardCompanyId = localStorage.getItem("codef_card_company");
    const cardCompanyName = localStorage.getItem("codef_card_company_name");

    if (!connectedId || !cardCompanyId) {
      toast.error("연동된 카드 정보가 없습니다. 카드를 먼저 연결해주세요.");
      return;
    }

    setIsSyncing(true);
    try {
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const startDate = threeMonthsAgo.toISOString().split("T")[0].replace(/-/g, "");
      const endDate = today.toISOString().split("T")[0].replace(/-/g, "");

      const result = await cardSync.mutateAsync({
        connectedId,
        cardCompanyId,
        cardCompanyName: cardCompanyName || cardCompanyId,
        startDate,
        endDate,
      });

      if (result.synced > 0) {
        toast.success(`${result.synced}건의 새 거래 내역을 동기화했습니다`);
      } else {
        toast.info("새로운 거래 내역이 없습니다");
      }

      // 데이터 새로고침
      await fetchTransactions();
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

  // 데이터가 없는 경우
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">최근 거래 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              아직 거래 내역이 없어요
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              카드나 계좌를 연동하면 자동으로 표시됩니다
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">최근 거래 내역</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center justify-between py-2 border-b border-border last:border-0"
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  transaction.type === "income"
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-rose-100 dark:bg-rose-900/30"
                )}
              >
                {transaction.type === "income" ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium truncate max-w-[150px]">
                  {transaction.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transaction.category || "미분류"} · {transaction.source_type === "card" ? "카드" : "이체"}
                </p>
              </div>
            </div>
            <p
              className={cn(
                "text-sm font-semibold",
                transaction.type === "income"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {transaction.type === "income" ? "+" : "-"}
              {formatCurrency(transaction.amount)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
