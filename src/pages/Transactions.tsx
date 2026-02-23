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
import { Plus, Search, TrendingUp, TrendingDown, Sparkles, LinkIcon, RefreshCw, ExternalLink, PlusCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConnectionDrawer } from "@/contexts/ConnectionDrawerContext";
import { cn } from "@/lib/utils";
import { TransactionClassifier } from "@/components/transactions/TransactionClassifier";
import { useTransactions, useTransactionStats, useAddTransaction, type TransactionInsert } from "@/hooks/useTransactions";
import { useCardSync } from "@/hooks/useCardSync";
import { useBankSync } from "@/hooks/useBankSync";
import { useConnection } from "@/contexts/ConnectionContext";
import { useCardConnectionInfo, useBankConnectionInfo } from "@/hooks/useCardConnectionInfo";
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
  const { profile, cardConnected, accountConnected } = useConnection();
  const addTransaction = useAddTransaction();
  const cardSync = useCardSync();
  const bankSync = useBankSync();

  const navigate = useNavigate();
  const { openDrawer } = useConnectionDrawer();
  const cardInfo = useCardConnectionInfo();
  const bankInfo = useBankConnectionInfo();

  const handleCardSync = () => {
    // 카드 동기화 = 재연동 (인증 재입력 필요)
    navigate("/onboarding?reconnect=true&type=card");
  };

  const handleBankSync = () => {
    // 계좌 동기화 = 재연동 (인증 재입력 필요)
    navigate("/onboarding?reconnect=true&type=account");
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
  const isCardConnected = cardConnected;
  const isAccountConnected = accountConnected;

  return (
    <MainLayout title="매출/매입" subtitle="거래 내역을 관리하세요" showBackButton>
      <Tabs defaultValue="list" className="space-y-3">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="list" className="text-sm">거래 목록</TabsTrigger>
          <TabsTrigger value="classify" className="gap-1 text-sm">
            <Sparkles className="h-3 w-3" />
            AI 분류
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-3 mt-0">
          {/* 미연동 상태: 온보딩 유도 배너 */}
          {!isCardConnected && !isAccountConnected && (
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center">
              <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 mb-3">
                <LinkIcon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1">카드/계좌를 연동해보세요</h3>
              <p className="text-xs text-muted-foreground mb-3">
                연동하면 거래 내역이 자동으로 수집되고 AI가 분류해드려요
              </p>
              <Button size="sm" className="gap-1" onClick={() => openDrawer("card")}>
                <Sparkles className="h-3.5 w-3.5" />
                연동하러 가기
              </Button>
            </div>
          )}

          {/* 동기화 배너 - 카드/계좌 한 행 */}
          {(isCardConnected || isAccountConnected) && (
            <div className="grid grid-cols-2 gap-2">
              {/* 카드: 연동됨 → 동기화+추가, 미연동 → 연동하기 */}
              <div className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2",
                isCardConnected ? "bg-primary/5 border border-primary/20" : "bg-muted/50 border border-dashed border-muted-foreground/20"
              )}>
                <p className="text-xs font-medium">💳 카드{cardInfo.cardCompanyName ? ` · ${cardInfo.cardCompanyName}` : ""}</p>
                {isCardConnected ? (
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleCardSync}
                      className="h-6 px-1.5 gap-0.5 text-xs text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <RefreshCw className="h-3 w-3" />
                      재연동
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDrawer("card")}
                      className="h-6 px-1.5 gap-0.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <PlusCircle className="h-3 w-3" />
                      추가
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openDrawer("card")}
                    className="h-6 px-2 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10"
                  >
                    <LinkIcon className="h-3 w-3" />
                    연동
                  </Button>
                )}
              </div>
              {/* 계좌: 연동됨 → 동기화+추가, 미연동 → 연동하기 */}
              <div className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2",
                isAccountConnected ? "bg-muted/50 border border-border" : "bg-muted/50 border border-dashed border-muted-foreground/20"
              )}>
                <p className="text-xs font-medium">🏦 계좌{bankInfo.bankName ? ` · ${bankInfo.bankName}` : ""}</p>
                {isAccountConnected ? (
                  <div className="flex items-center gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleBankSync}
                      className="h-6 px-1.5 gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                    >
                      <RefreshCw className="h-3 w-3" />
                      재연동
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openDrawer("account")}
                      className="h-6 px-1.5 gap-0.5 text-xs text-muted-foreground hover:text-muted-foreground hover:bg-muted"
                    >
                      <PlusCircle className="h-3 w-3" />
                      추가
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openDrawer("account")}
                    className="h-6 px-2 gap-1 text-xs text-success hover:text-success hover:bg-success/10"
                  >
                    <LinkIcon className="h-3 w-3" />
                    연동
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 데이터 기간 표시 */}
          {stats?.dateFrom && stats?.dateTo && (
            <p className="text-xs text-muted-foreground">
              📅 {stats.dateFrom.replace(/-/g, '.')} ~ {stats.dateTo.replace(/-/g, '.')}
            </p>
          )}

          {/* 요약 카드 */}
          <div className="space-y-2">
            {/* 매출/지출 - 2열 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-card border p-3">
                <p className="text-xs text-muted-foreground mb-1">매출</p>
                {isStatsLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-lg font-bold text-green-600">{formatCurrency(stats?.totalIncome || 0)}</p>
                )}
              </div>
              <div className="rounded-lg bg-card border p-3">
                <p className="text-xs text-muted-foreground mb-1">지출</p>
                {isStatsLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : (
                  <p className="text-lg font-bold text-red-600">{formatCurrency(stats?.totalExpense || 0)}</p>
                )}
              </div>
            </div>
            {/* 순이익 - 별도 행 */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">순이익</p>
              {isStatsLoading ? (
                <Skeleton className="h-5 w-28" />
              ) : (
                <p className="text-base font-bold text-primary">{formatCurrency(stats?.netProfit || 0)}</p>
              )}
            </div>
          </div>

          {/* 필터 및 검색 - 더 컴팩트하게 */}
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="검색..."
                className="pl-8 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={(value: "all" | "income" | "expense") => setFilter(value)}>
              <SelectTrigger className="w-20 h-9 text-sm">
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
                <Button size="icon" className="h-9 w-9 shrink-0">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] rounded-xl">
                <DialogHeader>
                  <DialogTitle>새 거래 추가</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-1.5">
                    <Label className="text-sm">거래 유형</Label>
                    <Select
                      value={newTransaction.type}
                      onValueChange={(value: "income" | "expense") =>
                        setNewTransaction({ ...newTransaction, type: value })
                      }
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">매출</SelectItem>
                        <SelectItem value="expense">매입/지출</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">거래처/내용</Label>
                    <Input
                      placeholder="예: 스타벅스 강남점"
                      className="h-10"
                      value={newTransaction.description}
                      onChange={(e) =>
                        setNewTransaction({ ...newTransaction, description: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">금액</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      className="h-10"
                      value={newTransaction.amount}
                      onChange={(e) =>
                        setNewTransaction({ ...newTransaction, amount: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-sm">결제 수단</Label>
                      <Select
                        value={newTransaction.source_type}
                        onValueChange={(value: "card" | "bank") =>
                          setNewTransaction({ ...newTransaction, source_type: value })
                        }
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="card">카드</SelectItem>
                          <SelectItem value="bank">계좌이체</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm">카드/은행명</Label>
                      <Input
                        placeholder="예: 신한카드"
                        className="h-10"
                        value={newTransaction.source_name}
                        onChange={(e) =>
                          setNewTransaction({ ...newTransaction, source_name: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleAddTransaction} 
                    className="w-full h-11 mt-2"
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
            <Card className="overflow-hidden">
              <CardContent className="divide-y p-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                      <div className="min-w-0">
                        <Skeleton className="h-4 w-28 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Skeleton className="h-4 w-16 mb-1 ml-auto" />
                      <Skeleton className="h-4 w-10 ml-auto" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : isEmpty ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                  <LinkIcon className="h-7 w-7 text-muted-foreground" />
                </div>
                <h3 className="mb-1 font-semibold text-base">거래 내역이 없습니다</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  카드/계좌를 연동하면 자동 수집됩니다
                </p>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link to="/onboarding">연동하기</Link>
                  </Button>
                  <Button size="sm" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    수동 추가
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="divide-y p-0">
                {transactions?.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between px-3 py-3 active:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full shrink-0",
                        transaction.type === "income" ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        {transaction.category_icon ? (
                          <span className="text-base">{transaction.category_icon}</span>
                        ) : transaction.type === "income" ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{transaction.description}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {transaction.category || "미분류"} · {transaction.transaction_date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className={cn(
                        "font-semibold text-sm",
                        transaction.type === "income" ? "text-green-600" : "text-red-600"
                      )}>
                        {transaction.type === "income" ? "+" : "-"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                        {transaction.source_type === "card" ? "카드" : "계좌"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="classify" className="mt-0">
          <TransactionClassifier />
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
