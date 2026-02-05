import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, mockTransactions } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [hasRealData, setHasRealData] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const cardSync = useCardSync();

  // 목업 데이터를 Transaction 형식으로 변환
  const getMockTransactions = (): Transaction[] => {
    return mockTransactions.slice(0, 5).map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      source_type: tx.paymentMethod === "card" ? "card" : "transfer",
      transaction_date: tx.date,
    }));
  };

  const fetchTransactions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 로그아웃 상태: 목업 데이터 사용
      if (!user) {
        setIsLoggedIn(false);
        setTransactions(getMockTransactions());
        setHasRealData(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, type, category, source_type, transaction_date")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      
      // 로그인 상태지만 데이터 없음: 목업 데이터 사용
      if (!data || data.length === 0) {
        setTransactions(getMockTransactions());
        setHasRealData(false);
      } else {
        setTransactions(data as Transaction[]);
        setHasRealData(true);
      }
    } catch (error) {
      console.error("거래 내역 조회 실패:", error);
      // 에러 시에도 목업 데이터 표시
      setTransactions(getMockTransactions());
      setHasRealData(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSync = async () => {
    if (!isLoggedIn) {
      toast.info("로그인 후 이용 가능합니다");
      return;
    }
    
    const connectedId = localStorage.getItem("codef_connected_id");
    const cardCompanyId = localStorage.getItem("codef_card_company");
    const cardCompanyName = localStorage.getItem("codef_card_company_name");

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
        // startDate/endDate 생략 시 hook에서 자동으로 마지막 동기화 시점 이후 데이터 조회
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

  // 로그아웃 상태에서만 Sample 워터마크 표시
  const showSampleWatermark = isLoggedIn === false;

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">최근 거래 내역</CardTitle>
        {isLoggedIn && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </Button>
        )}
      </CardHeader>
      <CardContent className="relative">
        {showSampleWatermark && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="px-3 py-1 border-2 border-dashed border-muted-foreground/30 rounded-lg -rotate-12">
              <span className="text-muted-foreground/40 font-bold text-sm tracking-widest">
                Sample
              </span>
            </div>
          </div>
        )}
        <div className="space-y-3">
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
        </div>
      </CardContent>
    </Card>
  );
}
