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
import { Textarea } from "@/components/ui/textarea";
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
  Building2,
  HeartPulse,
  Home,
  CreditCard,
  Zap,
  Package,
  Megaphone,
  Wrench,
  Percent,
  CalendarDays,
  Info,
} from "lucide-react";
import { InvestmentCard } from "@/components/funds/InvestmentCard";
import { LoanCard } from "@/components/funds/LoanCard";
import { FundsConnectionPrompt } from "@/components/funds/FundsConnectionPrompt";
import { useConnection } from "@/contexts/ConnectionContext";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeposits,
  useAutoTransfers,
  type Deposit,
  type AutoTransfer,
  type DepositType,
  type TransferType,
  type ScheduleType,
  type NewAutoTransfer,
  SCHEDULE_TYPE_LABELS,
  BANK_LIST,
} from "@/hooks/useFunds";
import { cn } from "@/lib/utils";

const depositIcons: Record<DepositType, React.ComponentType<{ className?: string }>> = {
  vat: Receipt,
  salary: Wallet,
  emergency: ShieldAlert,
  corporate_tax: Building2,
  insurance: HeartPulse,
  rent: Home,
  loan: CreditCard,
  utility: Zap,
  inventory: Package,
  marketing: Megaphone,
  maintenance: Wrench,
};

const depositTypeLabels: Record<DepositType, string> = {
  vat: "부가세",
  salary: "급여",
  emergency: "비상금",
  corporate_tax: "법인세/소득세",
  insurance: "4대보험",
  rent: "임대료/월세",
  loan: "대출 상환",
  utility: "공과금",
  inventory: "재고/원자재",
  marketing: "마케팅/광고",
  maintenance: "시설 유지보수",
};

const statusConfig = {
  pending: { label: "대기", icon: AlertCircle, color: "text-warning" },
  scheduled: { label: "예정", icon: Clock, color: "text-primary" },
  completed: { label: "완료", icon: CheckCircle, color: "text-success" },
};

const emptyTransfer: NewAutoTransfer = {
  name: "",
  transfer_type: "fixed",
  amount: undefined,
  amount_percentage: undefined,
  recipient: "",
  target_account_number: "",
  target_bank_name: "",
  schedule_type: "manual",
  schedule_day: undefined,
  description: "",
};

function DepositDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: { type: DepositType; name: string; target_amount?: number }) => Promise<void>;
  isPending: boolean;
}) {
  const [form, setForm] = useState({ type: "emergency" as DepositType, name: "", targetAmount: "" });

  const handleOpen = (v: boolean) => {
    if (v) setForm({ type: "emergency", name: "", targetAmount: "" });
    onOpenChange(v);
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    try {
      await onSubmit({
        type: form.type,
        name: form.name,
        target_amount: form.targetAmount ? parseInt(form.targetAmount) : undefined,
      });
      handleOpen(false);
    } catch {
      // 에러는 useFunds onError에서 처리
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
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
              value={form.type}
              onValueChange={(value: DepositType) => setForm({ ...form, type: value })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(depositTypeLabels) as DepositType[]).map((type) => (
                  <SelectItem key={type} value={type}>{depositTypeLabels[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>이름</Label>
            <Input
              placeholder="예: 1분기 부가세"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>목표 금액</Label>
            <Input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={form.targetAmount ? parseInt(form.targetAmount).toLocaleString() : ""}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d]/g, "");
                setForm({ ...form, targetAmount: value });
              }}
            />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={isPending}>
            {isPending ? "추가 중..." : "추가하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AutoTransferDialog({
  onSubmit,
  isPending,
}: {
  onSubmit: (data: NewAutoTransfer) => Promise<void>;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NewAutoTransfer>(emptyTransfer);

  const handleOpen = (v: boolean) => {
    if (v) setForm(emptyTransfer);
    setOpen(v);
  };

  const handleSubmit = async () => {
    console.log("[AutoTransferDialog] handleSubmit called, form:", JSON.stringify(form));
    if (!form.name || !form.recipient) {
      console.log("[AutoTransferDialog] validation failed: name or recipient missing");
      return;
    }
    if (form.transfer_type === "fixed" && !form.amount) {
      console.log("[AutoTransferDialog] validation failed: amount missing for fixed type");
      return;
    }
    if (form.transfer_type === "percentage" && (form.amount_percentage == null || isNaN(form.amount_percentage) || form.amount_percentage <= 0)) {
      console.log("[AutoTransferDialog] validation failed: amount_percentage missing or invalid");
      return;
    }
    console.log("[AutoTransferDialog] validation passed, calling onSubmit...");
    try {
      await onSubmit(form);
      setOpen(false);
    } catch (e) {
      console.log("[AutoTransferDialog] onSubmit error:", e);
    }
  };

  const needsScheduleDay = form.schedule_type === "weekly" || form.schedule_type === "monthly";

  return (
    <Dialog open={open} onOpenChange={handleOpen} modal={true}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 자동이체 규칙</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
          <span>규칙을 미리 설정해두면 하이픈 계좌 연동 후 즉시 자동 실행됩니다.</span>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>규칙 이름</Label>
            <Input
              placeholder="예: 부가세 적립, 거래처 대금"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>이체 방식</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, transfer_type: "fixed" }))}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors",
                  form.transfer_type === "fixed"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <Wallet className="h-4 w-4" />
                <span className="font-medium">고정 금액</span>
                <span className="text-xs opacity-70">매번 같은 금액</span>
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, transfer_type: "percentage", amount_percentage: prev.amount_percentage ?? 10 }))}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-sm transition-colors",
                  form.transfer_type === "percentage"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <Percent className="h-4 w-4" />
                <span className="font-medium">비율 이체</span>
                <span className="text-xs opacity-70">매출의 %</span>
              </button>
            </div>
          </div>

          {form.transfer_type === "fixed" ? (
            <div className="space-y-1.5">
              <Label>이체 금액</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={form.amount ? form.amount.toLocaleString() : ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "");
                  setForm((prev) => ({ ...prev, amount: value ? parseInt(value) : undefined }));
                }}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>이체 비율 (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="10"
                  min="0"
                  max="100"
                  value={form.amount_percentage ?? ""}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const parsed = parseFloat(raw);
                    setForm((prev) => ({ ...prev, amount_percentage: isNaN(parsed) ? undefined : parsed }));
                  }}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">예: 10 → 매출의 10%를 자동 적립</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>수취인 / 목적</Label>
            <Input
              placeholder="예: 세금 통장, A상사, 임대인 홍길동"
              value={form.recipient}
              onChange={(e) => setForm((prev) => ({ ...prev, recipient: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>입금 은행 <span className="text-muted-foreground font-normal">(선택)</span></Label>
            <Select
              value={form.target_bank_name || ""}
              onValueChange={(v) => setForm((prev) => ({ ...prev, target_bank_name: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="은행 선택" />
              </SelectTrigger>
              <SelectContent>
                {BANK_LIST.map((bank) => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>입금 계좌번호 <span className="text-muted-foreground font-normal">(선택)</span></Label>
            <Input
              placeholder="예: 110-123-456789"
              value={form.target_account_number || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, target_account_number: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              실행 조건
            </Label>
            <Select
              value={form.schedule_type}
              onValueChange={(v: ScheduleType) => setForm((prev) => ({ ...prev, schedule_type: v, schedule_day: undefined }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SCHEDULE_TYPE_LABELS) as [ScheduleType, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsScheduleDay && (
            <div className="space-y-1.5">
              <Label>
                {form.schedule_type === "monthly" ? "매월 몇 일?" : "매주 무슨 요일?"}
              </Label>
              {form.schedule_type === "monthly" ? (
                <Select
                  value={form.schedule_day?.toString() || ""}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, schedule_day: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="실행일 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={d.toString()}>{d}일</SelectItem>
                    ))}
                    <SelectItem value="0">말일</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Select
                  value={form.schedule_day?.toString() || ""}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, schedule_day: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="요일 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {["월", "화", "수", "목", "금", "토", "일"].map((day, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>{day}요일</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>메모 <span className="text-muted-foreground font-normal">(선택)</span></Label>
            <Textarea
              placeholder="이체 목적이나 참고 사항을 적어두세요"
              rows={2}
              value={form.description || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={isPending}
          >
            {isPending ? "추가 중..." : "규칙 저장하기"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TransferItem({ transfer, onDelete }: { transfer: AutoTransfer; onDelete: () => void }) {
  const config = statusConfig[transfer.status];
  const StatusIcon = config.icon;

  const amountLabel = transfer.transfer_type === "percentage"
    ? `매출의 ${transfer.amount_percentage}%`
    : formatCurrency(transfer.amount);

  const scheduleLabel = transfer.schedule_type === "monthly" && transfer.schedule_day
    ? `매월 ${transfer.schedule_day === 0 ? "말일" : `${transfer.schedule_day}일`}`
    : transfer.schedule_type === "weekly" && transfer.schedule_day
    ? `매주 ${["월", "화", "수", "목", "금", "토", "일"][transfer.schedule_day - 1]}요일`
    : SCHEDULE_TYPE_LABELS[transfer.schedule_type] || transfer.condition;

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{transfer.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {transfer.recipient} · {scheduleLabel}
          </p>
          {transfer.target_bank_name && (
            <p className="text-xs text-muted-foreground/70 truncate">
              {transfer.target_bank_name} {transfer.target_account_number}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-right">
          <p className="text-sm font-semibold">{amountLabel}</p>
          <div className={`flex items-center justify-end gap-1 ${config.color}`}>
            <StatusIcon className="h-3 w-3" />
            <span className="text-xs">{config.label}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

function DepositSection({
  dimmed = false,
  deposits,
  isDepositDialogOpen,
  setIsDepositDialogOpen,
  addDeposit,
}: {
  dimmed?: boolean;
  deposits: Deposit[];
  isDepositDialogOpen: boolean;
  setIsDepositDialogOpen: (v: boolean) => void;
  addDeposit: ReturnType<typeof useDeposits>["addDeposit"];
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">예치금 현황</h2>
        <DepositDialog
          open={isDepositDialogOpen}
          onOpenChange={setIsDepositDialogOpen}
          onSubmit={async (data) => {
            await addDeposit.mutateAsync(data);
            setIsDepositDialogOpen(false);
          }}
          isPending={addDeposit.isPending}
        />
      </div>

      {deposits.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">아직 설정된 예치금이 없어요</p>
            <p className="text-xs mt-1">{dimmed ? "계좌 연동 전에 미리 규칙을 설정해두세요" : "예치금을 추가하여 자금을 관리해보세요"}</p>
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
              <Card key={deposit.id} className={cn(dimmed && "opacity-70")}>
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
                        {dimmed && <p className="text-xs text-muted-foreground">연동 후 활성화</p>}
                      </div>
                    </div>
                    {dimmed ? (
                      <Badge variant="outline" className="text-muted-foreground">대기 중</Badge>
                    ) : (
                      <p className="font-semibold">{formatCurrency(deposit.amount)}</p>
                    )}
                  </div>
                  {!dimmed && deposit.target_amount && (
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
    </>
  );
}

function TransferSection({
  dimmed = false,
  autoTransfers,
  addTransfer,
  deleteTransfer,
}: {
  dimmed?: boolean;
  autoTransfers: AutoTransfer[];
  addTransfer: ReturnType<typeof useAutoTransfers>["addTransfer"];
  deleteTransfer: ReturnType<typeof useAutoTransfers>["deleteTransfer"];
}) {
  return (
    <>
      <div className="flex items-center justify-between pt-2">
        <div>
          <h2 className="font-semibold">자동이체 규칙</h2>
          {!dimmed && (
            <p className="text-xs text-muted-foreground mt-0.5">
              하이픈 연동 후 자동 실행됩니다
            </p>
          )}
        </div>
        <AutoTransferDialog
          onSubmit={async (data) => {
            await addTransfer.mutateAsync(data);
          }}
          isPending={addTransfer.isPending}
        />
      </div>

      {autoTransfers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">아직 설정된 자동이체 규칙이 없어요</p>
            <p className="text-xs mt-1">
              {dimmed
                ? "계좌 연동 전에 미리 규칙을 설정해두세요"
                : "고정금액 또는 매출 비율로 자동이체를 설정해보세요"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className={cn("divide-y p-0", dimmed && "opacity-70")}>
            {autoTransfers.map((transfer) => (
              <TransferItem
                key={transfer.id}
                transfer={transfer}
                onDelete={() => deleteTransfer.mutate(transfer.id)}
              />
            ))}
          </CardContent>
          {dimmed && (
            <div className="px-4 pb-3">
              <Badge variant="outline" className="text-muted-foreground text-xs">
                계좌 연동 후 실행됩니다
              </Badge>
            </div>
          )}
        </Card>
      )}
    </>
  );
}

export default function Funds() {
  const navigate = useNavigate();
  const { accountConnected, profileLoading } = useConnection();

  const { deposits, isLoading: depositsLoading, totalDeposits, addDeposit, deleteDeposit } = useDeposits();
  const { autoTransfers, isLoading: transfersLoading, addTransfer, deleteTransfer } = useAutoTransfers();

  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);

  const isLoading = profileLoading || depositsLoading || transfersLoading;

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

  if (!accountConnected) {
    return (
      <MainLayout title="자금 관리" subtitle="예치금과 자동이체를 관리하세요" showBackButton>
        <div className="space-y-4">
          <FundsConnectionPrompt />
          <DepositSection
            dimmed
            deposits={deposits}
            isDepositDialogOpen={isDepositDialogOpen}
            setIsDepositDialogOpen={setIsDepositDialogOpen}
            addDeposit={addDeposit}
          />
          <TransferSection
            dimmed
            autoTransfers={autoTransfers}
            addTransfer={addTransfer}
            deleteTransfer={deleteTransfer}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="자금 관리" subtitle="예치금과 자동이체를 관리하세요" showBackButton>
      <div className="space-y-4">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm opacity-80">총 예치금</p>
              <p className="text-2xl font-bold">{formatCurrency(totalDeposits)}</p>
            </div>
            <Wallet className="h-10 w-10 opacity-50" />
          </CardContent>
        </Card>

        <DepositSection
          deposits={deposits}
          isDepositDialogOpen={isDepositDialogOpen}
          setIsDepositDialogOpen={setIsDepositDialogOpen}
          addDeposit={addDeposit}
        />
        <TransferSection
          autoTransfers={autoTransfers}
          addTransfer={addTransfer}
          deleteTransfer={deleteTransfer}
        />

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

        <InvestmentCard />
        <LoanCard />

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
