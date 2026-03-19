import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  CalendarClock,
  ListChecks,
} from "lucide-react";
import { type TaxFilingTask, type TaxAccountantAssignment } from "@/hooks/useTaxAccountant";
import { format, differenceInDays } from "date-fns";

interface FilingTabProps {
  filingTasks: TaxFilingTask[];
  assignment: TaxAccountantAssignment | null;
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

function getChecklistProgress(task: TaxFilingTask): { completed: number; total: number; items: { label: string; done: boolean }[] } {
  const items = [
    { label: "매출 데이터 수집", done: !!((task.prepared_data as Record<string, unknown>)?.sales_ready) },
    { label: "매입 데이터 수집", done: !!((task.prepared_data as Record<string, unknown>)?.purchase_ready) },
    { label: "세금계산서 확인", done: !!((task.prepared_data as Record<string, unknown>)?.invoice_ready) },
    { label: "카드 매출 확인", done: !!((task.prepared_data as Record<string, unknown>)?.card_ready) },
  ];
  return {
    completed: items.filter((i) => i.done).length,
    total: items.length,
    items,
  };
}

export default function FilingTab({ filingTasks, assignment, loading }: FilingTabProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  if (filingTasks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">예정된 신고가 없습니다</h3>
          <p className="text-xs text-muted-foreground">
            부가세, 종소세 등 신고 기한이 다가오면<br />
            김비서가 자동으로 알려드립니다
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {filingTasks.map((task) => {
        const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.upcoming;
        const checklist = getChecklistProgress(task);
        const progressPercent = checklist.total > 0 ? (checklist.completed / checklist.total) * 100 : 0;

        return (
          <Card key={task.id}>
            <CardContent className="p-4">
              {/* 헤더 */}
              <div className="flex items-start justify-between mb-3">
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
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <CalendarClock className="h-3.5 w-3.5" />
                마감: {format(new Date(task.deadline), "yyyy.MM.dd")}
              </div>

              {/* 데이터 준비 체크리스트 */}
              {task.status !== "submitted" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <ListChecks className="h-3.5 w-3.5" />
                      데이터 준비 현황
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {checklist.completed}/{checklist.total}
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-1.5" />
                  <div className="grid grid-cols-2 gap-1.5">
                    {checklist.items.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-1.5 text-[10px]"
                      >
                        {item.done ? (
                          <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                        ) : (
                          <div className="h-3 w-3 rounded-full border border-muted-foreground/30 shrink-0" />
                        )}
                        <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 세무사 검토 노트 */}
              {task.review_notes && (task.review_notes as unknown[]).length > 0 && (
                <div className="mt-3 p-2.5 rounded-lg bg-muted/50 border border-border/50">
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
                <div className="flex items-center gap-1.5 text-xs text-primary mt-2">
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
