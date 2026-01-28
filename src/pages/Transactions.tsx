import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { mockTransactions, Transaction, formatCurrency } from "@/data/mockData";
import { Plus, Search, TrendingUp, TrendingDown, Receipt, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: "income" as "income" | "expense",
    category: "",
    description: "",
    amount: "",
    paymentMethod: "card" as "card" | "cash" | "transfer",
  });

  const filteredTransactions = transactions.filter((t) => {
    const matchesFilter = filter === "all" || t.type === filter;
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const handleAddTransaction = () => {
    if (!newTransaction.category || !newTransaction.description || !newTransaction.amount) return;

    const amount = parseInt(newTransaction.amount);
    const vatAmount = newTransaction.type === "income" ? Math.round(amount / 11) : undefined;

    const transaction: Transaction = {
      id: Date.now().toString(),
      type: newTransaction.type,
      category: newTransaction.category,
      description: newTransaction.description,
      amount,
      paymentMethod: newTransaction.paymentMethod,
      date: new Date().toISOString().split("T")[0],
      vatAmount,
    };

    setTransactions([transaction, ...transactions]);
    setNewTransaction({
      type: "income",
      category: "",
      description: "",
      amount: "",
      paymentMethod: "card",
    });
    setIsDialogOpen(false);
  };

  return (
    <MainLayout title="매출/매입" subtitle="거래 내역을 관리하세요">
      <div className="space-y-4">
        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="mx-auto h-5 w-5 text-success" />
              <p className="mt-1 text-xs text-muted-foreground">매출</p>
              <p className="text-sm font-bold">{formatCurrency(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingDown className="mx-auto h-5 w-5 text-destructive" />
              <p className="mt-1 text-xs text-muted-foreground">지출</p>
              <p className="text-sm font-bold">{formatCurrency(totalExpense)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Receipt className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-xs text-muted-foreground">순이익</p>
              <p className="text-sm font-bold">{formatCurrency(totalIncome - totalExpense)}</p>
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
                  <Label>카테고리</Label>
                  <Input
                    placeholder="예: 식자재, 관리비"
                    value={newTransaction.category}
                    onChange={(e) =>
                      setNewTransaction({ ...newTransaction, category: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>설명</Label>
                  <Input
                    placeholder="거래 내용을 입력하세요"
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
                  <Label>결제 방법</Label>
                  <Select
                    value={newTransaction.paymentMethod}
                    onValueChange={(value: "card" | "cash" | "transfer") =>
                      setNewTransaction({ ...newTransaction, paymentMethod: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card">카드</SelectItem>
                      <SelectItem value="cash">현금</SelectItem>
                      <SelectItem value="transfer">계좌이체</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddTransaction} className="w-full">
                  추가하기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* 거래 목록 */}
        <Card>
          <CardContent className="divide-y p-0">
            {filteredTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    transaction.type === "income" ? "bg-success/10" : "bg-destructive/10"
                  )}>
                    {transaction.type === "income" ? (
                      <TrendingUp className="h-5 w-5 text-success" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.category} · {transaction.date}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-semibold",
                    transaction.type === "income" ? "text-success" : "text-destructive"
                  )}>
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {transaction.paymentMethod === "card"
                      ? "카드"
                      : transaction.paymentMethod === "cash"
                      ? "현금"
                      : "이체"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
