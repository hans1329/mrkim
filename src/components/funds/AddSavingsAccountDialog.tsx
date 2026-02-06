import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, PiggyBank, Landmark, Shield } from "lucide-react";
import { useSavingsAccounts, SavingsAccountType, NewSavingsAccount } from "@/hooks/useSavingsAccounts";

interface AddSavingsAccountDialogProps {
  trigger?: React.ReactNode;
}

const accountTypeOptions: { value: SavingsAccountType; label: string; icon: typeof PiggyBank; description: string }[] = [
  { value: "parking", label: "파킹통장", icon: PiggyBank, description: "언제든 입출금 가능한 고금리 통장" },
  { value: "savings", label: "적금", icon: Landmark, description: "매월 일정 금액을 저축하는 상품" },
  { value: "deposit", label: "예금", icon: Shield, description: "목돈을 일정 기간 예치하는 상품" },
];

const bankOptions = [
  "토스뱅크",
  "케이뱅크",
  "카카오뱅크",
  "국민은행",
  "신한은행",
  "하나은행",
  "우리은행",
  "농협은행",
  "기업은행",
  "SC제일은행",
  "기타",
];

export function AddSavingsAccountDialog({ trigger }: AddSavingsAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const { addAccount } = useSavingsAccounts();
  
  const [formData, setFormData] = useState<NewSavingsAccount>({
    name: "",
    type: "parking",
    bank_name: "",
    amount: 0,
    interest_rate: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) return;
    
    addAccount.mutate(formData, {
      onSuccess: () => {
        setOpen(false);
        setFormData({
          name: "",
          type: "parking",
          bank_name: "",
          amount: 0,
          interest_rate: 0,
        });
      },
    });
  };

  const selectedType = accountTypeOptions.find((opt) => opt.value === formData.type);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1">
            <Plus className="h-4 w-4" />
            저축 계좌 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-success" />
            저축 계좌 추가
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* 계좌 유형 선택 */}
          <div className="space-y-2">
            <Label>계좌 유형</Label>
            <div className="grid grid-cols-3 gap-2">
              {accountTypeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: option.value })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                      isSelected
                        ? "border-success bg-success/10"
                        : "border-muted hover:border-muted-foreground/30"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? "text-success" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${isSelected ? "text-success" : ""}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedType && (
              <p className="text-xs text-muted-foreground">{selectedType.description}</p>
            )}
          </div>

          {/* 계좌명 */}
          <div className="space-y-2">
            <Label htmlFor="name">계좌명</Label>
            <Input
              id="name"
              placeholder="예: 토스뱅크 파킹통장"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* 은행 선택 */}
          <div className="space-y-2">
            <Label htmlFor="bank">은행</Label>
            <Select
              value={formData.bank_name}
              onValueChange={(value) => setFormData({ ...formData, bank_name: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="은행을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {bankOptions.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 금액 & 이자율 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="amount">현재 잔액</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  원
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">연 이자율</Label>
              <div className="relative">
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.interest_rate || ""}
                  onChange={(e) => setFormData({ ...formData, interest_rate: Number(e.target.value) })}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* 예상 월 이자 미리보기 */}
          {formData.amount > 0 && formData.interest_rate > 0 && (
            <div className="rounded-lg bg-success/10 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">예상 월 이자</span>
                <span className="text-sm font-semibold text-success">
                  +{Math.round((formData.amount * (formData.interest_rate / 100)) / 12).toLocaleString()}원
                </span>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-success hover:bg-success/90"
              disabled={!formData.name.trim() || addAccount.isPending}
            >
              {addAccount.isPending ? "추가 중..." : "추가하기"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
