import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import IrregularFilingSection from "./IrregularFilingSection";
import { toast } from "sonner";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  CalendarClock,
  ListChecks,
  ChevronDown,
  ChevronUp,
  Info,
  Building2,
  User,
  UserCheck,
  Zap,
  Upload,
  ShieldCheck,
  Send,
  Eye,
  Mail,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type TaxFilingTask, type TaxAccountantAssignment } from "@/hooks/useTaxAccountant";
import { format, differenceInDays } from "date-fns";
import {
  INDIVIDUAL_BASIC_ITEMS,
  CORPORATE_BASIC_ITEMS,
  getMatchingIndustryRequirements,
  getDeadlineInfo,
  AUTO_SOURCE_LABELS,
  type ChecklistItem,
} from "@/data/filingRequirements";

interface FilingTabProps {
  filingTasks: TaxFilingTask[];
  assignment: TaxAccountantAssignment | null;
  businessType?: string | null;
  loading?: boolean;
  onCreateTask?: (filingType: string, taxPeriod: string, deadline: string) => Promise<unknown>;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  upcoming: { label: "예정", variant: "secondary", icon: CalendarClock },
  preparing: { label: "준비 중", variant: "outline", icon: ListChecks },
  review: { label: "검토 중", variant: "default", icon: Clock },
  submitted: { label: "신고 완료", variant: "default", icon: CheckCircle2 },
};

function DeadlineBadge({ deadline }: { deadline: string }) {
  const daysLeft = differenceInDays(new Date(deadline), new Date());
  if (daysLeft < 0) {
    return (
      <span className="text-[10px] text-destructive font-medium flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        기한 초과
      </span>
    );
  }
  if (daysLeft <= 7) {
    return (
      <span className="text-[10px] text-destructive font-medium flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        D-{daysLeft}
      </span>
    );
  }
  if (daysLeft <= 30) {
    return (
      <span className="text-[10px] text-warning font-medium flex items-center gap-1">
        <Clock className="h-3 w-3" />
        D-{daysLeft}
      </span>
    );
  }
  return (
    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
      <Clock className="h-3 w-3" />
      D-{daysLeft}
    </span>
  );
}

function ChecklistItemRow({ item, done }: { item: ChecklistItem; done: boolean }) {
  const [showDetail, setShowDetail] = useState(false);
  const isAuto = !!item.autoSource;
  const sourceLabel = item.autoSource ? AUTO_SOURCE_LABELS[item.autoSource] : null;

  return (
    <div className={`border rounded-lg p-3 ${isAuto ? "border-primary/20 bg-primary/[0.02]" : "border-border/50"}`}>
      <div
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => setShowDetail(!showDetail)}
      >
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        ) : isAuto ? (
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        ) : (
          <Upload className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-xs ${done ? "text-foreground" : isAuto ? "text-foreground" : "text-muted-foreground"}`}>
              {item.label}
            </span>
            {isAuto && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">
                <Zap className="h-2.5 w-2.5 mr-0.5" />
                자동 {item.autoCoverage}%
              </Badge>
            )}
            {!isAuto && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 text-muted-foreground">
                직접 준비
              </Badge>
            )}
          </div>
          {/* 자동 수집 요약 (접히지 않고 항상 표시) */}
          {isAuto && item.autoDescription && (
            <p className="text-[10px] text-primary/70 mt-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 shrink-0" />
              {item.autoDescription}
            </p>
          )}
        </div>
        {showDetail ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </div>

      {showDetail && (
        <div className="mt-2 ml-6 space-y-1.5">
          {isAuto && sourceLabel && (
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] font-medium ${sourceLabel.color}`}>
                📡 {sourceLabel.label}
              </span>
              {item.autoCoverage && (
                <div className="flex items-center gap-1 flex-1">
                  <Progress value={item.autoCoverage} className="h-1 flex-1 max-w-[80px]" />
                  <span className="text-[10px] text-muted-foreground">{item.autoCoverage}%</span>
                </div>
              )}
            </div>
          )}
          {item.manualSupplement && (
            <div className="p-2 rounded bg-muted/50 border border-border/30">
              <p className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1">
                <Upload className="h-3 w-3 shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground">사장님이 보강할 사항: </span>
                  {item.manualSupplement}
                </span>
              </p>
            </div>
          )}
          {!isAuto && (
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              {item.detail}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FilingSendSection({ taskId, assignment, basicItems, task }: {
  taskId: string;
  assignment: TaxAccountantAssignment;
  basicItems: ChecklistItem[];
  task: TaxFilingTask;
}) {
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [accountantInfo, setAccountantInfo] = useState({ name: "", email: "" });

  const buildChecklist = () => {
    const pd = (task.prepared_data || {}) as Record<string, unknown>;
    return basicItems.map((item) => ({
      label: item.label,
      ready: !!pd[item.dataKey],
      autoSource: item.autoSource,
      coverage: item.autoCoverage || null,
    }));
  };

  const callEdgeFunction = async (preview: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-tax-consultation`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          filingTaskId: taskId,
          preview,
          checklist: buildChecklist(),
        }),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  };

  const handlePreview = async () => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewHtml("");
    try {
      const data = await callEdgeFunction(true);
      setPreviewHtml(data.html);
      setAccountantInfo({ name: data.accountantName || "", email: data.accountantEmail || "" });
    } catch (e) {
      toast.error((e as Error).message || "미리보기 로드에 실패했습니다");
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const data = await callEdgeFunction(false);
      toast.success(`${data.accountantName} 세무사에게 신고 자료가 전달되었습니다`);
      setPreviewOpen(false);
    } catch (e) {
      toast.error((e as Error).message || "전달에 실패했습니다");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <Send className="h-3.5 w-3.5 text-primary" />
          세무사에게 자료 전달
        </p>
        {assignment.accountant?.email && (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Mail className="h-3 w-3" />
            발송 대상: {assignment.accountant.name} ({assignment.accountant.email})
          </p>
        )}
        <p className="text-[10px] text-muted-foreground">
          김비서가 자동 수집한 데이터와 준비 현황을 세무사에게 이메일로 전달합니다
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground w-full sm:w-auto"
            onClick={handlePreview}
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            미리보기
          </Button>
          <Button
            size="sm"
            className="w-full sm:flex-1 text-xs"
            onClick={handleSend}
            disabled={sending}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {sending ? "전달 중..." : "세무사에게 자료 전달"}
          </Button>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 w-[calc(100vw-1rem)] sm:w-auto">
          <DialogHeader className="p-3 sm:p-4 pb-2 shrink-0">
            <DialogTitle className="text-sm sm:text-base">신고 자료 이메일 미리보기</DialogTitle>
            {accountantInfo.email && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                수신: {accountantInfo.name} ({accountantInfo.email})
              </p>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-auto border-y border-border bg-white">
            {previewLoading ? (
              <div className="p-4 sm:p-6 space-y-4">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-40 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
              </div>
            ) : (
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full min-h-[400px] sm:min-h-[500px] border-0"
                title="신고 자료 이메일 미리보기"
                sandbox="allow-same-origin"
              />
            )}
          </div>
          <div className="p-3 sm:p-4 pt-2 sm:pt-3 shrink-0 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(false)} className="text-xs">
              닫기
            </Button>
            <Button size="sm" onClick={handleSend} disabled={sending || previewLoading} className="text-xs">
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sending ? "전달 중..." : "이메일 발송"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function getChecklistProgress(task: TaxFilingTask, items: ChecklistItem[]): { completed: number; total: number; itemStates: { item: ChecklistItem; done: boolean }[] } {
  const pd = (task.prepared_data || {}) as Record<string, unknown>;
  const itemStates = items.map((item) => ({
    item,
    done: !!pd[item.dataKey],
  }));
  return {
    completed: itemStates.filter((i) => i.done).length,
    total: itemStates.length,
    itemStates,
  };
}

const FILING_TYPE_OPTIONS = [
  { label: "부가가치세 예정신고", periods: (y: number) => [`${y}년 1기 (1월~3월)`, `${y}년 2기 (7월~9월)`] },
  { label: "부가가치세 확정신고", periods: (y: number) => [`${y}년 1기 (1월~6월)`, `${y}년 2기 (7월~12월)`] },
  { label: "종합소득세 신고", periods: (y: number) => [`${y - 1}년 귀속`] },
  { label: "원천세 신고", periods: (y: number) => Array.from({ length: 12 }, (_, i) => `${y}년 ${String(i + 1).padStart(2, "0")}월분`) },
  { label: "지방소득세 신고", periods: (y: number) => [`${y - 1}년 귀속`] },
];

function CreateFilingTaskCard({ onCreateTask }: { onCreateTask: (ft: string, tp: string, dl: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filingType, setFilingType] = useState("");
  const [taxPeriod, setTaxPeriod] = useState("");
  const [deadline, setDeadline] = useState("");

  const currentYear = new Date().getFullYear();
  const selectedType = FILING_TYPE_OPTIONS.find(o => o.label === filingType);
  const periods = selectedType ? selectedType.periods(currentYear) : [];

  const handleCreate = async () => {
    if (!filingType || !taxPeriod || !deadline) {
      toast.error("모든 항목을 입력해주세요");
      return;
    }
    setCreating(true);
    const result = await onCreateTask(filingType, taxPeriod, deadline);
    setCreating(false);
    if (result) {
      setOpen(false);
      setFilingType("");
      setTaxPeriod("");
      setDeadline("");
    }
  };

  if (!open) {
    return (
      <Card className="border-dashed border-primary/30 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setOpen(true)}>
        <CardContent className="py-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <h3 className="text-sm font-semibold mb-1">예정된 신고가 없습니다</h3>
          <p className="text-xs text-muted-foreground mb-3">
            신고 마감이 다가오면 자동으로 생성됩니다
          </p>
          <Button variant="outline" size="sm" className="text-xs">
            <FileText className="h-3.5 w-3.5 mr-1" />
            직접 신고 추가
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h4 className="text-sm font-semibold">신고 태스크 추가</h4>
        <div className="space-y-2">
          <label className="text-xs font-medium">신고 유형</label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
            value={filingType}
            onChange={(e) => { setFilingType(e.target.value); setTaxPeriod(""); }}
          >
            <option value="">선택하세요</option>
            {FILING_TYPE_OPTIONS.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
          </select>
        </div>
        {filingType && (
          <div className="space-y-2">
            <label className="text-xs font-medium">과세기간</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
              value={taxPeriod}
              onChange={(e) => setTaxPeriod(e.target.value)}
            >
              <option value="">선택하세요</option>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs font-medium">마감일</label>
          <input
            type="date"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setOpen(false)}>취소</Button>
          <Button size="sm" className="text-xs flex-1" onClick={handleCreate} disabled={creating}>
            {creating ? "생성 중..." : "추가"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function FilingTab({ filingTasks, assignment, businessType, loading, onCreateTask }: FilingTabProps) {
  const isCorporate = businessType?.includes("법인") || false;
  const basicItems = isCorporate ? CORPORATE_BASIC_ITEMS : INDIVIDUAL_BASIC_ITEMS;
  const industryReqs = getMatchingIndustryRequirements(businessType || null);
  const deadlineInfo = getDeadlineInfo(isCorporate);

  // 자동/수동 구분 통계
  const autoItems = basicItems.filter((i) => i.autoSource);
  const manualItems = basicItems.filter((i) => !i.autoSource);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">담당 세무사를 먼저 배정해주세요</h3>
          <p className="text-xs text-muted-foreground">
            신고 관리를 이용하려면 먼저 매칭 탭에서<br />담당 세무사를 선택해야 합니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 마감일 안내 배너 */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex items-center gap-2 mb-1">
            {isCorporate ? <Building2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary" /> : <User className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary" />}
            <span className="text-[11px] sm:text-xs font-semibold text-primary">
              {isCorporate ? "법인사업자" : "개인사업자"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {deadlineInfo.label}: <span className="font-medium text-foreground">{deadlineInfo.date}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            신고 및 납부 기한: 2026년 1월 26일
          </p>
        </CardContent>
      </Card>

      {/* 김비서 자동 처리 요약 배너 */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-primary" />
            <span className="text-[11px] sm:text-xs font-semibold">김비서가 대신 처리해드려요</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
            기본 {basicItems.length}개 항목 중 <span className="font-semibold text-primary">{autoItems.length}개</span>는 연동 데이터에서 자동 수집됩니다.
            {manualItems.length > 0 && (
              <> 사장님은 <span className="font-semibold text-foreground">{manualItems.length}개</span>만 직접 준비하시면 됩니다.</>
            )}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-primary" />
              <span className="text-[10px] text-primary font-medium">자동 {autoItems.length}개</span>
            </div>
            <div className="flex items-center gap-1">
              <Upload className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">직접 준비 {manualItems.length}개</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 신고 태스크가 없으면 생성 카드 표시 */}
      {filingTasks.length === 0 && onCreateTask && (
        <CreateFilingTaskCard onCreateTask={onCreateTask} />
      )}
      {filingTasks.length === 0 && !onCreateTask && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">예정된 신고가 없습니다</p>
          </CardContent>
        </Card>
      )}

      {/* 신고 태스크별 카드 */}
      {filingTasks.map((task) => {
        const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.upcoming;
        const allItems = [...basicItems];
        industryReqs.forEach((req) => allItems.push(...req.items));
        const checklist = getChecklistProgress(task, allItems);
        const progressPercent = checklist.total > 0 ? (checklist.completed / checklist.total) * 100 : 0;

        // 자동/수동 분리
        const autoChecklist = basicItems.filter((i) => i.autoSource);
        const manualChecklist = basicItems.filter((i) => !i.autoSource);

        return (
          <Card key={task.id}>
            <CardContent className="p-3 sm:p-4 space-y-2.5 sm:space-y-3">
              {/* 헤더 */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-[13px] sm:text-sm font-semibold truncate">{task.filing_type}</h4>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">{task.tax_period}</p>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <DeadlineBadge deadline={task.deadline} />
                  <Badge variant={statusConfig.variant} className="text-[10px]">
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>

              {/* 마감일 */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                마감: {format(new Date(task.deadline), "yyyy.MM.dd")}
              </div>

              {/* 전체 진행률 */}
              {task.status !== "submitted" && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <ListChecks className="h-3.5 w-3.5" />
                      준비 서류 현황
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {checklist.completed}/{checklist.total}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-1.5" />

                  {/* ⚡ 자동 수집 항목 */}
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-semibold text-primary flex items-center gap-1 mt-1">
                      <Zap className="h-3.5 w-3.5" />
                      김비서 자동 수집 ({autoChecklist.length}개)
                    </h5>
                    {autoChecklist.map((item) => {
                      const pd = (task.prepared_data || {}) as Record<string, unknown>;
                      return <ChecklistItemRow key={item.id} item={item} done={!!pd[item.dataKey]} />;
                    })}
                  </div>

                  {/* 📎 직접 준비 항목 */}
                  {manualChecklist.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="text-[11px] font-semibold text-foreground flex items-center gap-1 mt-2">
                        <Upload className="h-3.5 w-3.5" />
                        사장님이 준비할 서류 ({manualChecklist.length}개)
                      </h5>
                      {manualChecklist.map((item) => {
                        const pd = (task.prepared_data || {}) as Record<string, unknown>;
                        return <ChecklistItemRow key={item.id} item={item} done={!!pd[item.dataKey]} />;
                      })}
                    </div>
                  )}

                  {/* 업종별 추가 요청자료 */}
                  {industryReqs.length > 0 && (
                    <div className="space-y-2 mt-2">
                      <h5 className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                        <Info className="h-3.5 w-3.5 text-primary" />
                        업종별 추가 요청자료
                      </h5>
                      {industryReqs.map((req) => {
                        const reqChecklist = getChecklistProgress(task, req.items);
                        return (
                          <div key={req.title} className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-medium">{req.title}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">
                                {reqChecklist.completed}/{reqChecklist.total}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                              {req.description}
                            </p>
                            {reqChecklist.itemStates.map(({ item, done }) => (
                              <ChecklistItemRow key={item.id} item={item} done={done} />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

                  {/* 세무사에게 자료 전달 */}
                  {assignment && task.status !== "submitted" && (
                    <FilingSendSection
                      taskId={task.id}
                      assignment={assignment}
                      basicItems={basicItems}
                      task={task}
                    />
                  )}
                  {!assignment && task.status !== "submitted" && (
                    <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border">
                      <p className="text-[10px] text-muted-foreground text-center">
                        매칭 탭에서 담당 세무사를 배정하면<br />준비된 자료를 이메일로 전달할 수 있습니다
                      </p>
                    </div>
                  )}
              {task.review_notes && (task.review_notes as unknown[]).length > 0 && (
                <div className="p-2.5 rounded-lg bg-muted/50 border border-border/50">
                  <p className="text-[10px] font-medium mb-1">세무사 검토 메모</p>
                  {(task.review_notes as { note: string; date: string }[]).map((note, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">
                      • {note.note || String(note)}
                    </p>
                  ))}
                </div>
              )}

              {/* 신고 완료 표시 */}
              {task.status === "submitted" && task.submitted_at && (
                <div className="flex items-center gap-1.5 text-xs text-primary">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {format(new Date(task.submitted_at), "yyyy.MM.dd")} 신고 완료
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* 구분선 */}
      <div className="border-t border-border/50 pt-3 sm:pt-4" />

      {/* 비정기 신고 섹션 */}
      <IrregularFilingSection assignment={assignment} />
    </div>
  );
}
