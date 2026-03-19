import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountantData } from "@/hooks/useAccountantData";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { FileText, Calendar, CheckCircle2 } from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import type { AccountantProfile } from "@/hooks/useAccountantAuth";

const filingStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "대기", variant: "outline" },
  data_collecting: { label: "자료수집", variant: "secondary" },
  data_ready: { label: "자료완료", variant: "default" },
  in_review: { label: "검토중", variant: "default" },
  submitted: { label: "신고완료", variant: "secondary" },
  completed: { label: "완료", variant: "outline" },
};

export default function AccountantFilings() {
  const { accountant } = useOutletContext<{ accountant: AccountantProfile }>();
  const { filingTasks, loading, refetch } = useAccountantData(accountant.id);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === "submitted") {
        updateData.submitted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tax_filing_tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;
      toast.success("상태가 업데이트되었습니다.");
      refetch();
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const handleAddNote = async (taskId: string, note: string) => {
    try {
      const task = filingTasks.find(t => t.id === taskId);
      const existingNotes = (task?.review_notes || []) as any[];
      const newNotes = [...existingNotes, { text: note, date: new Date().toISOString(), by: accountant.name }];

      const { error } = await supabase
        .from("tax_filing_tasks")
        .update({ review_notes: newNotes })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("검토 노트가 추가되었습니다.");
      setUpdatingId(null);
      refetch();
    } catch {
      toast.error("노트 추가에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">신고 관리</h1>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">신고 관리</h1>

      {filingTasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>진행 중인 신고가 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filingTasks.map(task => {
            const status = filingStatusLabels[task.status] || filingStatusLabels.pending;
            const daysLeft = differenceInDays(new Date(task.deadline), new Date());
            const isOverdue = isPast(new Date(task.deadline)) && task.status !== "completed" && task.status !== "submitted";
            const notes = (task.review_notes || []) as any[];

            return (
              <Card key={task.id} className={isOverdue ? "border-destructive/50" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{task.filing_type}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.tax_period}
                      </p>
                    </div>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Deadline */}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>마감: {format(new Date(task.deadline), "yyyy.MM.dd", { locale: ko })}</span>
                    {isOverdue ? (
                      <Badge variant="destructive" className="text-[10px]">마감 초과</Badge>
                    ) : daysLeft <= 7 ? (
                      <Badge variant="outline" className="text-[10px] text-amber-600">D-{daysLeft}</Badge>
                    ) : null}
                  </div>

                  {/* Status change */}
                  {task.status !== "completed" && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={task.status}
                        onValueChange={(v) => handleStatusChange(task.id, v)}
                      >
                        <SelectTrigger className="w-36 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">대기</SelectItem>
                          <SelectItem value="data_collecting">자료수집</SelectItem>
                          <SelectItem value="data_ready">자료완료</SelectItem>
                          <SelectItem value="in_review">검토중</SelectItem>
                          <SelectItem value="submitted">신고완료</SelectItem>
                          <SelectItem value="completed">완료</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Review notes */}
                  {notes.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">검토 노트</p>
                      {notes.map((n: any, i: number) => (
                        <div key={i} className="text-xs p-2 rounded bg-muted/50">
                          <span className="text-muted-foreground">
                            {n.date ? format(new Date(n.date), "MM.dd HH:mm") : ""} · {n.by || ""}
                          </span>
                          <p className="mt-0.5">{n.text}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add note */}
                  {updatingId === task.id ? (
                    <NoteForm
                      onSubmit={(note) => handleAddNote(task.id, note)}
                      onCancel={() => setUpdatingId(null)}
                    />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setUpdatingId(task.id)}
                    >
                      검토 노트 추가
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoteForm({ onSubmit, onCancel }: { onSubmit: (note: string) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-2">
      <Textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="검토 노트를 입력하세요..."
        rows={3}
        className="text-sm"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSubmit(text)} disabled={!text.trim()}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> 추가
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>취소</Button>
      </div>
    </div>
  );
}
