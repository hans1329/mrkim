import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/data/mockData";
import { Plus, Search, TrendingUp, TrendingDown, Receipt, Sparkles, LinkIcon, RefreshCw, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionClassifier } from "@/components/transactions/TransactionClassifier";
import { useTransactions, useTransactionStats, useAddTransaction, type TransactionInsert } from "@/hooks/useTransactions";
import { useCardSync } from "@/hooks/useCardSync";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function Transactions() {
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: "income" as "income" | "expense",
    description: "",
    amount: "",
    source_type: "card" as "card" | "bank",
    source_name: "",
  });

  const { data: transactions, isLoading, refetch } = useTransactions({
    type: filter === "all" ? undefined : filter,
    searchTerm: searchTerm || undefined,
  });

  const { data: stats, isLoading: isStatsLoading } = useTransactionStats();
  const { profile } = useProfile();
  const addTransaction = useAddTransaction();
  const cardSync = useCardSync();

  // 카드 동기화 (임시: 신한카드 고정, 추후 연동된 카드 목록에서 선택)
  const handleCardSync = () => {
    // TODO: 실제로는 저장된 connectedId와 카드사 정보를 사용
    // 현재는 프로필의 card_connected 상태만 확인
    if (!profile?.card_connected) {
      toast.error("먼저 카드를 연동해주세요");
      return;
    }

    // connectedId가 로컬스토리지에 저장되어 있다고 가정
    const connectedId = localStorage.getItem("codef_connected_id");
    const cardCompanyId = localStorage.getItem("codef_card_company") || "shinhan";
    const cardCompanyName = localStorage.getItem("codef_card_company_name") || "신한카드";

    if (!connectedId) {
      toast.error("카드 연동 정보를 찾을 수 없습니다. 다시 연동해주세요.");
      return;
    }

    cardSync.mutate(
      { connectedId, cardCompanyId, cardCompanyName },
      {
        onSuccess: (result) => {
          if (result.synced > 0) {
            toast.success(`${result.synced}건의 새 거래를 가져왔습니다`);
          } else if (result.skipped > 0) {
            toast.info("새로운 거래가 없습니다");
          } else {
            toast.info("가져올 거래가 없습니다");
          }
          refetch();
        },
        onError: (error) => {
          toast.error(error.message || "동기화에 실패했습니다");
        },
      }
    );
  };

  const handleAddTransaction = () => {
    if (!newTransaction.description || !newTransaction.amount) {
      toast.error("거래 내용과 금액을 입력해주세요");
      return;
    }

    const input: TransactionInsert = {
      transaction_date: new Date().toISOString().split("T")[0],
      description: newTransaction.description,
      amount: parseInt(newTransaction.amount),
      type: newTransaction.type,
      source_type: newTransaction.source_type,
      source_name: newTransaction.source_name || undefined,
    };

    addTransaction.mutate(input, {
      onSuccess: () => {
        toast.success("거래가 추가되었습니다");
        setNewTransaction({
          type: "income",
          description: "",
          amount: "",
          source_type: "card",
          source_name: "",
        });
        setIsDialogOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "거래 추가에 실패했습니다");
      },
    });
  };

  const isEmpty = !isLoading && (!transactions || transactions.length === 0);
  const isCardConnected = profile?.card_connected;

  return (
    <MainLayout title="매출/매입" subtitle="거래 내역을 관리하세요" showBackButton>
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">거래 목록</TabsTrigger>
          <TabsTrigger value="classify" className="gap-1">
            <Sparkles className="h-3 w-3" />
            AI 자동분류
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          {/* 카드 동기화 배너 */}
          {isCardConnected && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <CreditCard className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">카드 거래 동기화</p>
                    <p className="text-xs text-muted-foreground">최근 3개월 거래 내역을 가져옵니다</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleCardSync}
                  disabled={cardSync.isPending}
                  className="gap-1"
                >
                  {cardSync.isPending ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      동기화 중...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3" />
                      동기화
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-sm text-muted-foreground">매출</p>
                {isStatsLoading ? (
                  <Skeleton className="mx-auto mt-1 h-6 w-20" />
                ) : (
                  <p className="mt-1 text-lg font-bold text-green-600">{formatCurrency(stats?.totalIncome || 0)}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-sm text-muted-foreground">지출</p>
                {isStatsLoading ? (
                  <Skeleton className="mx-auto mt-1 h-6 w-20" />
                ) : (
                  <p className="mt-1 text-lg font-bold text-red-600">{formatCurrency(stats?.totalExpense || 0)}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-sm text-muted-foreground">순이익</p>
                {isStatsLoading ? (
                  <Skeleton className="mx-auto mt-1 h-6 w-20" />
                ) : (
                  <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(stats?.netProfit || 0)}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 필터 및 검색 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="검색..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(value: "all" | "income" | "expense") => setFilter(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="income">매출</SelectItem>
                <SelectItem value="expense">지출</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 거래 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>거래 유형</Label>
                    <Select
                      value={newTransaction.type}
                      onValueChange={(value: "income" | "expense") =>
                        setNewTransaction({ ...newTransaction, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">매출</SelectItem>
                        <SelectItem value="expense">매입/지출</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>거래처/내용</Label>
                    <Input
                      placeholder="예: 스타벅스 강남점"
                      value={newTransaction.description}
                      onChange={(e) =>
                        setNewTransaction({ ...newTransaction, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>금액</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newTransaction.amount}
                      onChange={(e) =>
                        setNewTransaction({ ...newTransaction, amount: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>결제 수단</Label>
                    <Select
                      value={newTransaction.source_type}
                      onValueChange={(value: "card" | "bank") =>
                        setNewTransaction({ ...newTransaction, source_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="card">카드</SelectItem>
                        <SelectItem value="bank">계좌이체</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>카드/은행명 (선택)</Label>
                    <Input
                      placeholder="예: 신한카드"
                      value={newTransaction.source_name}
                      onChange={(e) =>
                        setNewTransaction({ ...newTransaction, source_name: e.target.value })
                      }
                    />
                  </div>
                  <Button 
                    onClick={handleAddTransaction} 
                    className="w-full"
                    disabled={addTransaction.isPending}
                  >
                    {addTransaction.isPending ? "추가 중..." : "추가하기"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* 거래 목록 */}
          {isLoading ? (
            <Card>
              <CardContent className="divide-y p-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-5 w-12" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : isEmpty ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <LinkIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 font-semibold">거래 내역이 없습니다</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  카드/계좌를 연동하면 거래 내역이 자동으로 수집됩니다
                </p>
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link to="/onboarding">데이터 연동하기</Link>
                  </Button>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-1 h-4 w-4" />
                    수동 추가
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {transactions?.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        transaction.type === "income" ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        {transaction.category_icon ? (
                          <span className="text-lg">{transaction.category_icon}</span>
                        ) : transaction.type === "income" ? (
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.category || "미분류"} · {transaction.transaction_date}
                          {transaction.source_name && ` · ${transaction.source_name}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-semibold",
                        transaction.type === "income" ? "text-green-600" : "text-red-600"
                      )}>
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {transaction.source_type === "card" ? "카드" : "계좌"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="classify">
          <TransactionClassifier />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
