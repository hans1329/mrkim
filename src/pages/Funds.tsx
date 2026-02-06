import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatCurrency } from "@/data/mockData";
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
  Sparkles,
} from "lucide-react";
import { InvestmentCard } from "@/components/funds/InvestmentCard";
import { LoanCard } from "@/components/funds/LoanCard";
import { FundsConnectionPrompt } from "@/components/funds/FundsConnectionPrompt";
import { useConnection } from "@/contexts/ConnectionContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeposits, useAutoTransfers, type Deposit, type AutoTransfer } from "@/hooks/useFunds";

const depositIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  vat: Receipt,
  salary: Wallet,
  emergency: ShieldAlert,
};

const statusConfig = {
  pending: { label: "대기", icon: AlertCircle, color: "text-warning" },
  scheduled: { label: "예정", icon: Clock, color: "text-primary" },
  completed: { label: "완료", icon: CheckCircle, color: "text-success" },
};

export default function Funds() {
  const navigate = useNavigate();
  const { accountConnected, profileLoading } = useConnection();
  
  // 실DB 훅 사용
  const { deposits, isLoading: depositsLoading, totalDeposits, addDeposit, deleteDeposit } = useDeposits();
  const { autoTransfers, isLoading: transfersLoading, addTransfer, deleteTransfer } = useAutoTransfers();
  
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

  const handleAddDeposit = async () => {
    if (!newDeposit.name) return;

    await addDeposit.mutateAsync({
      type: newDeposit.type,
      name: newDeposit.name,
      target_amount: newDeposit.targetAmount ? parseInt(newDeposit.targetAmount) : undefined,
    });
    
    setNewDeposit({ type: "emergency", name: "", targetAmount: "" });
    setIsDepositDialogOpen(false);
  };

  const handleAddTransfer = async () => {
    if (!newTransfer.name || !newTransfer.amount || !newTransfer.recipient) return;

    await addTransfer.mutateAsync({
      name: newTransfer.name,
      amount: parseInt(newTransfer.amount),
      recipient: newTransfer.recipient,
      condition: newTransfer.condition || "수동 실행",
    });
    
    setNewTransfer({ name: "", amount: "", recipient: "", condition: "" });
    setIsTransferDialogOpen(false);
  };

  const handleDeleteTransfer = (id: string) => {
    deleteTransfer.mutate(id);
  };

  const isLoading = profileLoading || depositsLoading || transfersLoading;

  // 로딩 중 스켈레톤
  if (isLoading) {
    return (
      <MainLayout title="자금 관리" subtitle="예치금과 자동이체를 관리하세요" showBackButton>
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  // 예치금 다이얼로그 컴포넌트
  const DepositDialog = () => (
    <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          추가
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
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={newDeposit.targetAmount ? parseInt(newDeposit.targetAmount).toLocaleString() : ""}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, "");
                setNewDeposit({ ...newDeposit, targetAmount: value });
              }}
            />
          </div>
          <Button 
            onClick={handleAddDeposit} 
            className="w-full"
            disabled={addDeposit.isPending}
          >
            {addDeposit.isPending ? "추가 중..." : "추가하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // 자동이체 다이얼로그 컴포넌트
  const TransferDialog = () => (
    <Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          추가
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
              placeholder="예: 거래처 대금"
              value={newTransfer.name}
              onChange={(e) => setNewTransfer({ ...newTransfer, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>금액</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={newTransfer.amount ? parseInt(newTransfer.amount).toLocaleString() : ""}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, "");
                setNewTransfer({ ...newTransfer, amount: value });
              }}
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
                <SelectItem value="납품 완료 시">납품 완료 시</SelectItem>
                <SelectItem value="수동 실행">수동 실행</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={handleAddTransfer} 
            className="w-full"
            disabled={addTransfer.isPending}
          >
            {addTransfer.isPending ? "추가 중..." : "추가하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // 계좌 미연동 시 연동 유도 카드 + 규칙 미리 설정 가능
  if (!accountConnected) {
    return (
      <MainLayout title="자금 관리" subtitle="예치금과 자동이체를 관리하세요" showBackButton>
        <div className="space-y-4">
          <FundsConnectionPrompt />

          {/* 예치금 현황 */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">예치금 현황</h2>
            <DepositDialog />
          </div>

          {deposits.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-sm">아직 설정된 예치금이 없어요</p>
                <p className="text-xs mt-1">계좌 연동 전에 미리 규칙을 설정해두세요</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {deposits.map((deposit) => {
                const Icon = depositIcons[deposit.type] || ShieldAlert;
                return (
                  <Card key={deposit.id} className="opacity-70">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{deposit.name}</p>
                            <p className="text-xs text-muted-foreground">연동 후 활성화</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-muted-foreground">
                          대기 중
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 자동이체 규칙 */}
          <div className="flex items-center justify-between pt-2">
            <h2 className="font-semibold">자동이체 규칙</h2>
            <TransferDialog />
          </div>

          {autoTransfers.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-sm">아직 설정된 자동이체 규칙이 없어요</p>
                <p className="text-xs mt-1">계좌 연동 전에 미리 규칙을 설정해두세요</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="divide-y p-0">
                {autoTransfers.map((transfer) => (
                  <div key={transfer.id} className="flex items-center justify-between p-4 opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transfer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {transfer.recipient} · {transfer.condition}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(transfer.amount)}</p>
                        <Badge variant="outline" className="text-muted-foreground">
                          연동 대기
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteTransfer(transfer.id)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
    );
  }

  // 계좌 연동 완료 시 전체 기능 표시
  return (
    <MainLayout title="자금 관리" subtitle="예치금과 자동이체를 관리하세요" showBackButton>
      <div className="space-y-4">
        {/* 총 예치금 */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm opacity-80">총 예치금</p>
              <p className="text-2xl font-bold">{formatCurrency(totalDeposits)}</p>
            </div>
            <Wallet className="h-10 w-10 opacity-50" />
          </CardContent>
        </Card>

        {/* 예치금 현황 */}
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">예치금 현황</h2>
          <DepositDialog />
        </div>

        {deposits.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <p className="text-sm">아직 설정된 예치금이 없어요</p>
              <p className="text-xs mt-1">예치금을 추가하여 자금을 관리해보세요</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {deposits.map((deposit) => {
              const Icon = depositIcons[deposit.type] || ShieldAlert;
              const progress = deposit.target_amount
                ? Math.round((deposit.amount / deposit.target_amount) * 100)
                : 100;

              return (
                <Card key={deposit.id}>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{deposit.name}</p>
                          {deposit.due_date && (
                            <p className="text-xs text-muted-foreground">{deposit.due_date}</p>
                          )}
                        </div>
                      </div>
                      <p className="font-semibold">{formatCurrency(deposit.amount)}</p>
                    </div>
                    {deposit.target_amount && (
                      <div className="space-y-1">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-right">
                          {progress}% · 목표 {formatCurrency(deposit.target_amount)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 자동이체 규칙 */}
        <div className="flex items-center justify-between pt-2">
          <h2 className="font-semibold">자동이체 규칙</h2>
          <TransferDialog />
        </div>

        {autoTransfers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              <p className="text-sm">아직 설정된 자동이체 규칙이 없어요</p>
              <p className="text-xs mt-1">자동이체 규칙을 추가해보세요</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {autoTransfers.map((transfer) => {
                const config = statusConfig[transfer.status];
                const StatusIcon = config.icon;

                return (
                  <div key={transfer.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{transfer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {transfer.recipient} · {transfer.condition}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(transfer.amount)}</p>
                        <div className={`flex items-center justify-end gap-1 ${config.color}`}>
                          <StatusIcon className="h-3 w-3" />
                          <span className="text-xs">{config.label}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
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
        )}

        {/* 자동 자금 관리 설정 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="h-4 w-4" />
              자동 자금 관리
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              규칙만 정하면 돈이 알아서 움직여요
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">세금 자동으로 모으기</p>
                <p className="text-xs text-muted-foreground">매출의 10%를 세금 통장에 모아둬요</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">월급 미리 준비하기</p>
                <p className="text-xs text-muted-foreground">월급날 전에 알아서 준비해둬요</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* 예치금 운용 현황 */}
        <InvestmentCard />

        {/* 단기 대출 */}
        <LoanCard />

        {/* 금융 서비스 더보기 */}
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => navigate("/financial-services")}
        >
          <Sparkles className="h-4 w-4" />
          김비서 금융 서비스 더보기
        </Button>
      </div>
    </MainLayout>
  );
}
