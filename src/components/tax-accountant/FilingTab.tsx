import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
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

// 데모용 목업 태스크 (DB에 신고 태스크가 없을 때 표시)
const DEMO_FILING_TASK: TaxFilingTask = {
  id: "demo-vat-2025-2",
  user_id: "",
  accountant_id: null,
  filing_type: "부가가치세 확정신고",
  tax_period: "2025년 2기 (7월~12월)",
  deadline: "2026-01-16",
  status: "preparing",
  prepared_data: {
    invoice_ready: true,
    card_ready: true,
    purchase_ready: true,
    fixed_asset_ready: false,
    expense_ready: true,
    bank_ready: true,
  },
  review_notes: [],
  filing_method: "accountant",
  notified_at: null,
  submitted_at: null,
  created_at: new Date().toISOString(),
};

export default function FilingTab({ filingTasks, assignment, businessType, loading }: FilingTabProps) {
  const isCorporate = businessType?.includes("법인") || false;
  const basicItems = isCorporate ? CORPORATE_BASIC_ITEMS : INDIVIDUAL_BASIC_ITEMS;
  const industryReqs = getMatchingIndustryRequirements(businessType || null);
  const deadlineInfo = getDeadlineInfo(isCorporate);
  const effectiveTasks = filingTasks.length > 0 ? filingTasks : [DEMO_FILING_TASK];

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

  return (
    <div className="space-y-4">
      {/* 마감일 안내 배너 */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">
            {isCorporate ? <Building2 className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
            <span className="text-xs font-semibold text-primary">
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
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">김비서가 대신 처리해드려요</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
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

      {/* 신고 태스크별 카드 */}
      {effectiveTasks.map((task) => {
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
            <CardContent className="p-4 space-y-3">
              {/* 헤더 */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-semibold">{task.filing_type}</h4>
                  <p className="text-xs text-muted-foreground">{task.tax_period}</p>
                </div>
                <div className="flex items-center gap-2">
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

              {/* 세무사 검토 노트 */}
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
    </div>
  );
}
