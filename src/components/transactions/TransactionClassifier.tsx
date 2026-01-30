import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  classifyTransaction, 
  getCategoryStats, 
  CATEGORY_COLORS,
  type ClassificationResult 
} from "@/lib/transactionClassifier";
import { mockTransactions, formatCurrency } from "@/data/mockData";
import { CheckCircle2, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function TransactionClassifier() {
  const [classifications, setClassifications] = useState<Map<string, ClassificationResult>>(
    new Map()
  );
  const [isClassifying, setIsClassifying] = useState(false);

  const expenseTransactions = mockTransactions.filter((t) => t.type === "expense");

  const handleClassifyAll = async () => {
    setIsClassifying(true);
    
    // 시뮬레이션: 하나씩 분류하는 효과
    for (const tx of expenseTransactions) {
      await new Promise((r) => setTimeout(r, 300));
      setClassifications((prev) => {
        const next = new Map(prev);
        next.set(tx.id, classifyTransaction(tx.description));
        return next;
      });
    }
    
    setIsClassifying(false);
  };

  const handleReset = () => {
    setClassifications(new Map());
  };

  const categoryStats = getCategoryStats(
    expenseTransactions.map((t) => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
    }))
  );

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
          <div className="grid grid-cols-2 gap-2">
            {categoryStats.map((stat) => (
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
        </CardContent>
      </Card>

      {/* 분류 버튼 */}
      <div className="flex gap-2">
        <Button
          onClick={handleClassifyAll}
          disabled={isClassifying}
          className="flex-1 gap-2"
        >
          {isClassifying ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              분류 중...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              전체 자동 분류
            </>
          )}
        </Button>
        {classifications.size > 0 && (
          <Button variant="outline" onClick={handleReset}>
            초기화
          </Button>
        )}
      </div>

      {/* 거래 목록 */}
      <div className="space-y-2">
        {expenseTransactions.map((tx) => {
          const classification = classifications.get(tx.id);
          
          return (
            <Card key={tx.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-destructive">
                      -{formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
                
                {classification && (
                  <div className="mt-2 pt-2 border-t flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "gap-1",
                        CATEGORY_COLORS[classification.category]
                      )}
                    >
                      <span>{classification.icon}</span>
                      {classification.category}
                      {classification.subCategory && (
                        <span className="opacity-70">/ {classification.subCategory}</span>
                      )}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs">
                      {classification.confidence === "high" ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-green-600">높음</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-3 w-3 text-yellow-500" />
                          <span className="text-yellow-600">확인 필요</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
