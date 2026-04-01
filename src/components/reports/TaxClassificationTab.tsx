import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  useClassifiableTransactions,
  useClassificationStats,
  useAutoAIClassification,
  useUpdateTaxClassification,
  useTaxAccountCodes,
  type ClassifiedTransaction,
} from "@/hooks/useTaxClassification";
import { formatCurrency } from "@/data/mockData";
import { toast } from "sonner";
import { Bot, Check, Edit3, Loader2, Sparkles, AlertTriangle, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | "ai_suggested" | "manual";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  unclassified: { label: "미분류", color: "bg-muted text-muted-foreground", icon: <AlertTriangle className="h-3 w-3" /> },
  ai_suggested: { label: "자동 분류", color: "bg-chart-4/10 text-chart-4", icon: <Bot className="h-3 w-3" /> },
  confirmed: { label: "확인 완료", color: "bg-chart-2/10 text-chart-2", icon: <Check className="h-3 w-3" /> },
  manual: { label: "수동 분류", color: "bg-primary/10 text-primary", icon: <Edit3 className="h-3 w-3" /> },
};

export function TaxClassificationTab() {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [editingTx, setEditingTx] = useState<ClassifiedTransaction | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ processed: number; remaining: number } | null>(null);

  const { data: stats, isLoading: statsLoading } = useClassificationStats();
  const { data: transactions, isLoading: txLoading } = useClassifiableTransactions(filterStatus);
  const { data: accountCodes } = useTaxAccountCodes();
  const autoAI = useAutoAIClassification();
  const updateTax = useUpdateTaxClassification();

  const handleRunAI = async () => {
    setBatchProgress({ processed: 0, remaining: stats?.unclassified || 0 });
    try {
      const result = await autoAI.mutateAsync((info) => {
        setBatchProgress(info);
      });
      toast.success(`총 ${result.totalProcessed}건의 거래를 AI가 분류했습니다`);
    } catch (e: any) {
      toast.error(e.message || "AI 분류 실패");
    } finally {
      setBatchProgress(null);
    }
  };

  if (statsLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-12" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  const classifiedCount = (stats?.confirmed || 0) + (stats?.manual || 0) + (stats?.ai_suggested || 0);
  const progressPercent = stats && stats.total > 0
    ? Math.round((classifiedCount / stats.total) * 100)
    : 0;

  const isRunning = autoAI.isPending;

  return (
    <div className="space-y-4">
      {/* 분류 현황 요약 */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">미분류</span>
            <p className="mt-1 text-lg font-bold text-destructive">{stats?.unclassified || 0}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">자동 분류 대상</span>
            <p className="mt-1 text-lg font-bold text-chart-4">{stats?.ai_suggested || 0}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">수동 분류</span>
            <p className="mt-1 text-lg font-bold text-chart-2">{stats?.manual || 0}건</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <span className="text-xs text-muted-foreground">부가세 공제 예상</span>
            <p className="mt-1 text-lg font-bold text-primary">{formatCurrency(stats?.vatAmount || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 분류 진행률 + 자동분류 버튼 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">분류 완료율</span>
            <span className="text-sm font-bold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          
          {isRunning && batchProgress ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>
                {batchProgress.processed}건 완료 · 남은 {batchProgress.remaining}건 처리 중...
              </span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              총 {stats?.total || 0}건 중 {classifiedCount}건 분류 완료
            </p>
          )}

          <Button
            onClick={handleRunAI}
            disabled={isRunning || (stats?.unclassified || 0) === 0}
            className="w-full"
            size="sm"
          >
            {isRunning ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            {isRunning
              ? "김비서 자동분류 진행 중..."
              : `김비서 자동분류 (${stats?.unclassified || 0}건)`}
          </Button>
        </CardContent>
      </Card>

      {/* 필터 */}
      <div className="flex items-center gap-2">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="ai_suggested">AI 분류</SelectItem>
            <SelectItem value="manual">수동 분류</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {transactions?.length || 0}건
        </span>
      </div>

      {/* 거래 목록 */}
      {txLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {transactions?.map((tx) => (
            <TransactionClassificationCard
              key={tx.id}
              tx={tx}
              onEdit={() => setEditingTx(tx)}
            />
          ))}
          {!transactions?.length && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground text-sm">
                <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                해당 상태의 거래가 없습니다
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 수정 다이얼로그 */}
      {editingTx && (
        <EditClassificationDialog
          tx={editingTx}
          accountCodes={accountCodes || []}
          onClose={() => setEditingTx(null)}
          onSave={async (updates) => {
            try {
              await updateTax.mutateAsync({
                transactionId: editingTx.id,
                updates: { ...updates, tax_classification_status: "manual" },
              });
              toast.success("분류가 수정되었습니다");
              setEditingTx(null);
            } catch {
              toast.error("수정 실패");
            }
          }}
          isSaving={updateTax.isPending}
        />
      )}
    </div>
  );
}

/** 거래 분류 카드 */
function TransactionClassificationCard({
  tx,
  onEdit,
}: {
  tx: ClassifiedTransaction;
  onEdit: () => void;
}) {
  const statusInfo = STATUS_LABELS[tx.tax_classification_status] || STATUS_LABELS.unclassified;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-5 gap-0.5", statusInfo.color)}>
                {statusInfo.icon}
                {statusInfo.label}
              </Badge>
              {tx.ai_confidence_score && (
                <span className="text-[10px] text-muted-foreground">
                  {Math.round(tx.ai_confidence_score * 100)}%
                </span>
              )}
            </div>
            <p className="text-sm font-medium truncate">{tx.description}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground">{tx.transaction_date}</span>
              <span className="text-sm font-semibold text-destructive">-{formatCurrency(tx.amount)}</span>
            </div>
            {tx.tax_account_name && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                  {tx.tax_account_code} {tx.tax_account_name}
                </Badge>
                {tx.vat_deductible && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-chart-2/30 text-chart-2">
                    부가세공제
                  </Badge>
                )}
                {tx.is_fixed_asset && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-chart-4/30 text-chart-4">
                    고정자산
                  </Badge>
                )}
              </div>
            )}
            {tx.tax_notes && (
              <p className="text-[11px] text-muted-foreground mt-1 italic">{tx.tax_notes}</p>
            )}
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Edit3 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** 분류 수정 다이얼로그 */
function EditClassificationDialog({
  tx,
  accountCodes,
  onClose,
  onSave,
  isSaving,
}: {
  tx: ClassifiedTransaction;
  accountCodes: any[];
  onClose: () => void;
  onSave: (updates: any) => void;
  isSaving: boolean;
}) {
  const [code, setCode] = useState(tx.tax_account_code || "");
  const [vatDeductible, setVatDeductible] = useState(tx.vat_deductible ?? true);
  const [isFixedAsset, setIsFixedAsset] = useState(tx.is_fixed_asset);
  const [useRatio, setUseRatio] = useState(tx.business_use_ratio ?? 100);
  const [notes, setNotes] = useState(tx.tax_notes || "");

  const selectedCode = accountCodes.find((c) => c.id === code);

  const handleSave = () => {
    if (!code) {
      toast.error("계정과목을 선택하세요");
      return;
    }
    onSave({
      tax_account_code: code,
      tax_account_name: selectedCode?.name || code,
      vat_deductible: vatDeductible,
      is_fixed_asset: isFixedAsset,
      business_use_ratio: useRatio,
      tax_notes: notes || undefined,
    });
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    const ac = accountCodes.find((c) => c.id === newCode);
    if (ac) {
      setVatDeductible(ac.vat_deductible_default);
      setIsFixedAsset(ac.is_asset);
    }
  };

  const groupedCodes = accountCodes.reduce<Record<string, any[]>>((acc, c) => {
    (acc[c.category] = acc[c.category] || []).push(c);
    return acc;
  }, {});

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">세무 분류 수정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-sm font-medium">{tx.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tx.transaction_date} · -{formatCurrency(tx.amount)}
            </p>
          </div>

          <div>
            <Label className="text-xs">계정과목</Label>
            <Select value={code} onValueChange={handleCodeChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="계정과목 선택" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {Object.entries(groupedCodes).map(([category, codes]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                      {category}
                    </div>
                    {codes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="text-xs text-muted-foreground mr-1">{c.id}</span>
                        {c.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            {selectedCode?.description && (
              <p className="text-[11px] text-muted-foreground mt-1">{selectedCode.description}</p>
            )}
            {selectedCode?.tax_limit_description && (
              <p className="text-[11px] text-chart-4 mt-0.5">⚠ {selectedCode.tax_limit_description}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">부가세 매입세액 공제</Label>
              <p className="text-[11px] text-muted-foreground">
                공제 시 약 {formatCurrency(Math.round(tx.amount / 11))} 환급
              </p>
            </div>
            <Switch checked={vatDeductible} onCheckedChange={setVatDeductible} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs">고정자산 여부</Label>
              <p className="text-[11px] text-muted-foreground">100만원 이상 비품/장비</p>
            </div>
            <Switch checked={isFixedAsset} onCheckedChange={setIsFixedAsset} />
          </div>

          <div>
            <Label className="text-xs">사업 사용 비율 (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={useRatio}
              onChange={(e) => setUseRatio(Number(e.target.value))}
              className="mt-1"
            />
            {useRatio < 100 && (
              <p className="text-[11px] text-muted-foreground mt-1">
                비용 인정액: {formatCurrency(Math.round(tx.amount * useRatio / 100))}
              </p>
            )}
          </div>

          <div>
            <Label className="text-xs">세무 메모</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="세무 관련 메모..."
              className="mt-1 h-16 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}