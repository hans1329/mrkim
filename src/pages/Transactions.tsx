import { useState, useMemo } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/data/mockData";
import { Plus, Search, TrendingUp, TrendingDown, Sparkles, LinkIcon, RefreshCw, PlusCircle, CalendarIcon } from "lucide-react";
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
import { format, subMonths } from "date-fns";
import { ko } from "date-fns/locale";

export default function Transactions() {
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "card" | "bank">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: "income" as "income" | "expense",
    description: "",
    amount: "",
    source_type: "card" as "card" | "bank",
    source_name: "",
    transaction_date: new Date(),
  });

  // 기간 설정
  const [periodPreset, setPeriodPreset] = useState<"1m" | "3m" | "6m" | "all" | "custom">("3m");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [calendarTarget, setCalendarTarget] = useState<"start" | "end">("start");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const dateRange = useMemo(() => {
    if (periodPreset === "all") return { startDate: undefined, endDate: undefined };
    if (periodPreset === "custom") {
      return {
        startDate: customStartDate ? format(customStartDate, "yyyy-MM-dd") : undefined,
        endDate: customEndDate ? format(customEndDate, "yyyy-MM-dd") : undefined,
      };
    }
    const months = periodPreset === "1m" ? 1 : periodPreset === "3m" ? 3 : 6;
    const start = subMonths(new Date(), months);
    return { startDate: format(start, "yyyy-MM-dd"), endDate: format(new Date(), "yyyy-MM-dd") };
  }, [periodPreset, customStartDate, customEndDate]);

  const { data: transactions, isLoading, refetch } = useTransactions({
    type: filter === "all" ? undefined : filter,
    sourceType: sourceFilter === "all" ? undefined : sourceFilter,
    searchTerm: searchTerm || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { data: stats, isLoading: isStatsLoading } = useTransactionStats({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });
  const { profile, cardConnected, accountConnected } = useConnection();
  const addTransaction = useAddTransaction();
  const cardSync = useCardSync();
  const bankSync = useBankSync();

  const navigate = useNavigate();
  const { openDrawer } = useConnectionDrawer();
  const cardInfo = useCardConnectionInfo();
  const bankInfo = useBankConnectionInfo();

  const handleCardSync = () => {
    openDrawer("card");
  };

  const handleBankSync = () => {
    openDrawer("account");
  };

  const handleAddTransaction = () => {
    if (!newTransaction.description || !newTransaction.amount) {
      toast.error("거래 내용과 금액을 입력해주세요");
      return;
    }

    const input: TransactionInsert = {
      transaction_date: format(newTransaction.transaction_date, "yyyy-MM-dd"),
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
          transaction_date: new Date(),
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
      <Tabs defaultValue="list" className="space-y-2.5">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="list" className="text-sm">거래 목록</TabsTrigger>
          <TabsTrigger value="classify" className="gap-1 text-sm">
            <Sparkles className="h-3 w-3" />
            AI 분류
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-2.5 mt-0">
          {/* 미연동 상태: 온보딩 유도 배너 */}
          {!isCardConnected && !isAccountConnected && (
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 text-center">
              <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-primary/10 mb-2">
                <LinkIcon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-1">카드/계좌를 연동해보세요</h3>
              <p className="text-xs text-muted-foreground mb-2.5">
                연동하면 거래 내역이 자동으로 수집됩니다
              </p>
              <Button size="sm" className="gap-1 h-8" onClick={() => openDrawer("card")}>
                <Sparkles className="h-3.5 w-3.5" />
                연동하러 가기
              </Button>
            </div>
          )}

          {/* 동기화 배너 - 모바일: 세로 스택, 넓은 화면: 2열 */}
          {(isCardConnected || isAccountConnected) && (
            <div className="flex flex-col sm:grid sm:grid-cols-2 gap-1.5">
              {/* 카드 */}
              <div className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2",
                isCardConnected ? "bg-primary/5 border border-primary/20" : "bg-muted/50 border border-dashed border-muted-foreground/20"
              )}>
                <p className="text-xs font-medium truncate">💳 카드{cardInfo.cardCompanyName ? ` · ${cardInfo.cardCompanyName}` : ""}</p>
                {isCardConnected ? (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button size="sm" variant="ghost" onClick={handleCardSync}
                      className="h-6 px-1.5 gap-0.5 text-xs text-primary hover:text-primary hover:bg-primary/10">
                      <RefreshCw className="h-3 w-3" />
                      재연동
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openDrawer("card")}
                      className="h-6 px-1.5 gap-0.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/10">
                      <PlusCircle className="h-3 w-3" />
                      추가
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => openDrawer("card")}
                    className="h-6 px-2 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10 shrink-0">
                    <LinkIcon className="h-3 w-3" />
                    연동
                  </Button>
                )}
              </div>
              {/* 계좌 */}
              <div className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2",
                isAccountConnected ? "bg-muted/50 border border-border" : "bg-muted/50 border border-dashed border-muted-foreground/20"
              )}>
                <p className="text-xs font-medium truncate">🏦 계좌{bankInfo.bankName ? ` · ${bankInfo.bankName}` : ""}</p>
                {isAccountConnected ? (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button size="sm" variant="ghost" onClick={handleBankSync}
                      className="h-6 px-1.5 gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted">
                      <RefreshCw className="h-3 w-3" />
                      재연동
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openDrawer("account")}
                      className="h-6 px-1.5 gap-0.5 text-xs text-muted-foreground hover:text-muted-foreground hover:bg-muted">
                      <PlusCircle className="h-3 w-3" />
                      추가
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => openDrawer("account")}
                    className="h-6 px-2 gap-1 text-xs text-success hover:text-success hover:bg-success/10 shrink-0">
                    <LinkIcon className="h-3 w-3" />
                    연동
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 기간 설정 - 스크롤 가능한 영역 */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
            {(["1m", "3m", "6m", "all"] as const).map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant={periodPreset === preset ? "default" : "outline"}
                className="h-7 px-2.5 text-xs rounded-full shrink-0"
                onClick={() => setPeriodPreset(preset)}
              >
                {preset === "1m" ? "1개월" : preset === "3m" ? "3개월" : preset === "6m" ? "6개월" : "전체"}
              </Button>
            ))}
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant={periodPreset === "custom" ? "default" : "outline"}
                  className="h-7 px-2.5 text-xs rounded-full gap-1 shrink-0"
                  onClick={() => {
                    if (periodPreset !== "custom") {
                      setPeriodPreset("custom");
                      setCalendarTarget("start");
                    }
                  }}
                >
                  <CalendarIcon className="h-3 w-3" />
                  {periodPreset === "custom" && customStartDate && customEndDate
                    ? `${format(customStartDate, "M.d")}~${format(customEndDate, "M.d")}`
                    : "직접설정"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3" align="start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Button size="sm" variant={calendarTarget === "start" ? "default" : "outline"}
                      className="h-6 px-2 text-xs" onClick={() => setCalendarTarget("start")}>
                      시작일 {customStartDate ? format(customStartDate, "M.d") : "-"}
                    </Button>
                    <span className="text-muted-foreground">~</span>
                    <Button size="sm" variant={calendarTarget === "end" ? "default" : "outline"}
                      className="h-6 px-2 text-xs" onClick={() => setCalendarTarget("end")}>
                      종료일 {customEndDate ? format(customEndDate, "M.d") : "-"}
                    </Button>
                  </div>
                  <Calendar
                    mode="single"
                    selected={calendarTarget === "start" ? customStartDate : customEndDate}
                    onSelect={(date) => {
                      if (calendarTarget === "start") {
                        setCustomStartDate(date);
                        setCalendarTarget("end");
                      } else {
                        setCustomEndDate(date);
                        if (customStartDate) setIsCalendarOpen(false);
                      }
                    }}
                    locale={ko}
                    disabled={(date) => date > new Date()}
                    className="p-3 pointer-events-auto"
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* 데이터 기간 표시 (인라인) */}
            {stats?.dateFrom && stats?.dateTo && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 ml-auto">
                {stats.dateFrom.replace(/-/g, '.')} ~ {stats.dateTo.replace(/-/g, '.')}
              </span>
            )}
          </div>

          {/* 요약 카드 - 모바일 최적화: 3열 한 줄로 */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg bg-card border p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">매출</p>
              {isStatsLoading ? (
                <Skeleton className="h-5 w-full" />
              ) : (
                <p className="text-sm font-bold text-green-600 truncate">{formatCurrency(stats?.totalIncome || 0)}</p>
              )}
            </div>
            <div className="rounded-lg bg-card border p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">지출</p>
              {isStatsLoading ? (
                <Skeleton className="h-5 w-full" />
              ) : (
                <p className="text-sm font-bold text-red-600 truncate">{formatCurrency(stats?.totalExpense || 0)}</p>
              )}
            </div>
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
              <p className="text-[10px] text-muted-foreground mb-0.5">순이익</p>
              {isStatsLoading ? (
                <Skeleton className="h-5 w-full" />
              ) : (
                <p className="text-sm font-bold text-primary truncate">{formatCurrency(stats?.netProfit || 0)}</p>
              )}
            </div>
          </div>

          {/* 필터 및 검색 - 2행 구조로 모바일 최적화 */}
          <div className="space-y-1.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="거래처 검색..."
                className="pl-8 h-8 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              <Select value={filter} onValueChange={(value: "all" | "income" | "expense") => setFilter(value)}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 유형</SelectItem>
                  <SelectItem value="income">매출</SelectItem>
                  <SelectItem value="expense">지출</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(value: "all" | "card" | "bank") => setSourceFilter(value)}>
                <SelectTrigger className="flex-1 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체 소스</SelectItem>
                  <SelectItem value="card">카드</SelectItem>
                  <SelectItem value="bank">은행</SelectItem>
                </SelectContent>
              </Select>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" className="h-8 w-8 shrink-0">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl">
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
                      <Label className="text-sm">거래 날짜</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-10 justify-start text-left font-normal",
                              !newTransaction.transaction_date && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(newTransaction.transaction_date, "yyyy년 M월 d일", { locale: ko })}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newTransaction.transaction_date}
                            onSelect={(date) => {
                              if (date) setNewTransaction({ ...newTransaction, transaction_date: date });
                            }}
                            locale={ko}
                            disabled={(date) => date > new Date()}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
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
          </div>

          {/* 거래 목록 */}
          {isLoading ? (
            <Card className="overflow-hidden">
              <CardContent className="divide-y p-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                      <div className="min-w-0">
                        <Skeleton className="h-3.5 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Skeleton className="h-3.5 w-14 mb-1 ml-auto" />
                      <Skeleton className="h-3 w-8 ml-auto" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : isEmpty ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-2.5 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <LinkIcon className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mb-1 font-semibold text-sm">거래 내역이 없습니다</h3>
                <p className="mb-3 text-xs text-muted-foreground">
                  카드/계좌를 연동하면 자동 수집됩니다
                </p>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                    <Link to="/onboarding">연동하기</Link>
                  </Button>
                  <Button size="sm" className="h-8 text-xs" onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-1 h-3 w-3" />
                    수동 추가
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="divide-y p-0">
                {transactions?.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between px-3 py-2.5 active:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                        (transaction.type === "income" || transaction.type === "transfer_in") ? "bg-green-500/10" : "bg-red-500/10"
                      )}>
                        {transaction.category_icon ? (
                          <span className="text-sm">{transaction.category_icon}</span>
                        ) : (transaction.type === "income" || transaction.type === "transfer_in") ? (
                          <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[13px] leading-tight truncate">{transaction.description}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[10px] text-muted-foreground truncate">{transaction.category || "미분류"}</span>
                          <span className="text-[10px] text-muted-foreground/50">·</span>
                          <span className="text-[10px] text-muted-foreground shrink-0">{transaction.transaction_date?.slice(5)}</span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 shrink-0 ml-0.5">
                            {transaction.source_type === "card" ? "카드" : "계좌"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <p className={cn(
                      "font-semibold text-[13px] shrink-0 ml-2 tabular-nums",
                      (transaction.type === "income" || transaction.type === "transfer_in") ? "text-green-600" : "text-red-600"
                    )}>
                      {(transaction.type === "income" || transaction.type === "transfer_in") ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </p>
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
