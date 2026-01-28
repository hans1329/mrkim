import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  mockDeposits,
  mockAutoTransfers,
  Deposit,
  AutoTransfer,
  formatCurrency,
} from "@/data/mockData";
import {
  Plus,
  Wallet,
  Receipt,
  ShieldAlert,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Trash2,
} from "lucide-react";

const depositIcons = {
  vat: Receipt,
  salary: Wallet,
  emergency: ShieldAlert,
};

export default function Funds() {
  const [deposits, setDeposits] = useState<Deposit[]>(mockDeposits);
  const [autoTransfers, setAutoTransfers] = useState<AutoTransfer[]>(mockAutoTransfers);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);

  const [newDeposit, setNewDeposit] = useState({
    type: "emergency" as "vat" | "salary" | "emergency",
    name: "",
    targetAmount: "",
  });

  const [newTransfer, setNewTransfer] = useState({
    name: "",
    amount: "",
    recipient: "",
    condition: "",
  });

  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);

  const handleAddDeposit = () => {
    if (!newDeposit.name || !newDeposit.targetAmount) return;

    const deposit: Deposit = {
      id: Date.now().toString(),
      type: newDeposit.type,
      name: newDeposit.name,
      amount: 0,
      targetAmount: parseInt(newDeposit.targetAmount),
    };

    setDeposits([...deposits, deposit]);
    setNewDeposit({ type: "emergency", name: "", targetAmount: "" });
    setIsDepositDialogOpen(false);
  };

  const handleAddTransfer = () => {
    if (!newTransfer.name || !newTransfer.amount || !newTransfer.recipient) return;

    const transfer: AutoTransfer = {
      id: Date.now().toString(),
      name: newTransfer.name,
      amount: parseInt(newTransfer.amount),
      recipient: newTransfer.recipient,
      condition: newTransfer.condition || "수동 실행",
      status: "pending",
    };

    setAutoTransfers([...autoTransfers, transfer]);
    setNewTransfer({ name: "", amount: "", recipient: "", condition: "" });
    setIsTransferDialogOpen(false);
  };

  const handleDeleteTransfer = (id: string) => {
    setAutoTransfers(autoTransfers.filter((t) => t.id !== id));
  };

  const statusConfig = {
    pending: { label: "대기 중", icon: AlertCircle, color: "text-warning" },
    scheduled: { label: "예정", icon: Clock, color: "text-primary" },
    completed: { label: "완료", icon: CheckCircle, color: "text-success" },
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">자금 관리</h1>
          <p className="text-muted-foreground">예치금과 자동이체 규칙을 설정하세요</p>
        </div>

        {/* 총 예치금 요약 */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/70">총 예치금</p>
                <p className="text-3xl font-bold">{formatCurrency(totalDeposits)}</p>
              </div>
              <Wallet className="h-12 w-12 opacity-50" />
            </div>
          </CardContent>
        </Card>

        {/* 예치금 현황 */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">예치금 현황</h2>
            <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  예치금 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 예치금 설정</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>유형</Label>
                    <Select
                      value={newDeposit.type}
                      onValueChange={(value: "vat" | "salary" | "emergency") =>
                        setNewDeposit({ ...newDeposit, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vat">부가세</SelectItem>
                        <SelectItem value="salary">급여</SelectItem>
                        <SelectItem value="emergency">비상금</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>이름</Label>
                    <Input
                      placeholder="예: 1분기 부가세"
                      value={newDeposit.name}
                      onChange={(e) => setNewDeposit({ ...newDeposit, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>목표 금액</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newDeposit.targetAmount}
                      onChange={(e) =>
                        setNewDeposit({ ...newDeposit, targetAmount: e.target.value })
                      }
                    />
                  </div>
                  <Button onClick={handleAddDeposit} className="w-full">
                    추가하기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {deposits.map((deposit) => {
              const Icon = depositIcons[deposit.type];
              const progress = deposit.targetAmount
                ? Math.round((deposit.amount / deposit.targetAmount) * 100)
                : 100;

              return (
                <Card key={deposit.id}>
                  <CardContent className="p-4">
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{deposit.name}</p>
                          {deposit.dueDate && (
                            <p className="text-xs text-muted-foreground">
                              {deposit.dueDate} 납부
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {deposit.type === "vat"
                          ? "부가세"
                          : deposit.type === "salary"
                          ? "급여"
                          : "비상금"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">현재</span>
                        <span className="font-semibold">{formatCurrency(deposit.amount)}</span>
                      </div>
                      {deposit.targetAmount && (
                        <>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{progress}% 달성</span>
                            <span>목표: {formatCurrency(deposit.targetAmount)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* 자동이체 규칙 */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">자동이체 규칙</h2>
            <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  규칙 추가
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>새 자동이체 규칙</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>이름</Label>
                    <Input
                      placeholder="예: 거래처 대금 결제"
                      value={newTransfer.name}
                      onChange={(e) => setNewTransfer({ ...newTransfer, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>금액</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newTransfer.amount}
                      onChange={(e) => setNewTransfer({ ...newTransfer, amount: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>수취인</Label>
                    <Input
                      placeholder="예: A상사"
                      value={newTransfer.recipient}
                      onChange={(e) =>
                        setNewTransfer({ ...newTransfer, recipient: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>조건</Label>
                    <Select
                      value={newTransfer.condition}
                      onValueChange={(value) =>
                        setNewTransfer({ ...newTransfer, condition: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="조건 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="매월 말일">매월 말일</SelectItem>
                        <SelectItem value="매월 5일">매월 5일</SelectItem>
                        <SelectItem value="매월 10일">매월 10일</SelectItem>
                        <SelectItem value="납품 완료 시">납품 완료 시</SelectItem>
                        <SelectItem value="수동 실행">수동 실행</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddTransfer} className="w-full">
                    추가하기
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {autoTransfers.map((transfer) => {
                const config = statusConfig[transfer.status];
                const StatusIcon = config.icon;

                return (
                  <div
                    key={transfer.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{transfer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {transfer.recipient} · {transfer.condition}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold">{formatCurrency(transfer.amount)}</p>
                      <div className={`flex items-center gap-1 ${config.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span className="text-sm">{config.label}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTransfer(transfer.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>

        {/* 프로그래머블 머니 설정 */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                프로그래머블 머니 설정
              </CardTitle>
              <CardDescription>
                매출 발생 시 자동으로 세금과 예치금을 분리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">부가세 자동 분리</p>
                  <p className="text-sm text-muted-foreground">
                    매출의 10%를 자동으로 부가세 예치금으로 분리
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">급여 적립 자동화</p>
                  <p className="text-sm text-muted-foreground">
                    매출의 일정 비율을 급여 적립금으로 자동 적립
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1">
                  <p className="font-medium">조건부 이체 알림</p>
                  <p className="text-sm text-muted-foreground">
                    조건 충족 시 알림 후 자동 이체 실행
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
}
