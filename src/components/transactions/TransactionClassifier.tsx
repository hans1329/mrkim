import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CATEGORY_COLORS,
} from "@/lib/transactionClassifier";
import { formatCurrency } from "@/data/mockData";
import { CheckCircle2, AlertCircle, Sparkles, RefreshCw, LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransactions, useTransactionStats, useClassifyTransactions, useUpdateTransaction } from "@/hooks/useTransactions";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export function TransactionClassifier() {
  const [classifyingIds, setClassifyingIds] = useState<Set<string>>(new Set());

  const { data: transactions, isLoading } = useTransactions({ type: "expense" });
  const { data: stats, isLoading: isStatsLoading } = useTransactionStats();
  const classifyAll = useClassifyTransactions();
  const updateTransaction = useUpdateTransaction();

  const handleClassifyAll = async () => {
    const unclassifiedIds = transactions
      ?.filter((t) => !t.category)
      .map((t) => t.id);

    if (!unclassifiedIds?.length) {
      toast.info("분류할 거래가 없습니다");
      return;
    }

    setClassifyingIds(new Set(unclassifiedIds));
    
    classifyAll.mutate(unclassifiedIds, {
      onSuccess: (result) => {
        toast.success(`${result.classified}건의 거래가 분류되었습니다`);
        setClassifyingIds(new Set());
      },
      onError: (error) => {
        toast.error(error.message || "분류에 실패했습니다");
        setClassifyingIds(new Set());
      },
    });
  };

  const handleReclassify = async (id: string) => {
    setClassifyingIds((prev) => new Set(prev).add(id));
    
    // 카테고리 초기화 후 재분류
    updateTransaction.mutate(
      { id, updates: { category: undefined, is_manually_classified: false } },
      {
        onSuccess: () => {
          classifyAll.mutate([id], {
            onSuccess: () => {
              toast.success("재분류되었습니다");
              setClassifyingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            },
          });
        },
      }
    );
  };

  const expenseTransactions = transactions || [];
  // 미분류 또는 기타비용이면서 수동 분류가 아닌 항목 카운트
  const unclassifiedCount = expenseTransactions.filter((t) => (!t.category || t.category === "기타비용") && !t.is_manually_classified).length;
  const isEmpty = !isLoading && expenseTransactions.length === 0;

  return (
    <div className="space-y-4">
      {/* 카테고리 통계 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI 자동 분류 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isStatsLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : stats?.categoryStats && stats.categoryStats.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {stats.categoryStats.slice(0, 6).map((stat) => (
                <div
                  key={stat.category}
                  className={cn(
                    "rounded-lg p-3",
                    CATEGORY_COLORS[stat.category] || CATEGORY_COLORS["기타비용"]
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{stat.icon}</span>
                    <span className="text-xs font-medium truncate">{stat.category}</span>
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(stat.amount)}</p>
                  <p className="text-[10px] opacity-70">{stat.count}건</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">분류된 지출 내역이 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 분류 버튼 */}
      {!isEmpty && (
        <div className="flex gap-2">
          <Button
            onClick={handleClassifyAll}
            disabled={classifyAll.isPending || unclassifiedCount === 0}
            className="flex-1 gap-2"
          >
            {classifyAll.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                분류 중...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                미분류 {unclassifiedCount}건 자동 분류
              </>
            )}
          </Button>
        </div>
      )}

      {/* 거래 목록 */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isEmpty ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <LinkIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 font-semibold">지출 내역이 없습니다</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              카드를 연동하면 지출 내역이 자동으로 수집되고 분류됩니다
            </p>
            <Button asChild>
              <Link to="/onboarding">데이터 연동하기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {expenseTransactions.map((tx) => {
            const isClassifying = classifyingIds.has(tx.id);
            
            return (
              <Card key={tx.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">{tx.transaction_date}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-destructive">
                        -{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                  
                  {isClassifying ? (
                    <div className="mt-2 pt-2 border-t flex items-center justify-center gap-2 py-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">분류 중...</span>
                    </div>
                  ) : tx.category ? (
                    <div className="mt-2 pt-2 border-t flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "gap-1",
                          CATEGORY_COLORS[tx.category] || CATEGORY_COLORS["기타비용"]
                        )}
                      >
                        <span>{tx.category_icon}</span>
                        {tx.category}
                        {tx.sub_category && (
                          <span className="opacity-70">/ {tx.sub_category}</span>
                        )}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs">
                          {tx.classification_confidence === "high" ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                              <span className="text-green-600">높음</span>
                            </>
                          ) : tx.classification_confidence === "medium" ? (
                            <>
                              <AlertCircle className="h-3 w-3 text-yellow-500" />
                              <span className="text-yellow-600">중간</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="h-3 w-3 text-orange-500" />
                              <span className="text-orange-600">확인 필요</span>
                            </>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => handleReclassify(tx.id)}
                        >
                          재분류
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 pt-2 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">미분류</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => {
                          setClassifyingIds((prev) => new Set(prev).add(tx.id));
                          classifyAll.mutate([tx.id], {
                            onSuccess: () => {
                              setClassifyingIds((prev) => {
                                const next = new Set(prev);
                                next.delete(tx.id);
                                return next;
                              });
                            },
                          });
                        }}
                      >
                        <Sparkles className="h-3 w-3" />
                        분류하기
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
