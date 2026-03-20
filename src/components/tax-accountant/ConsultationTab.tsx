import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import EmailPreviewDialog from "./EmailPreviewDialog";
import { toast } from "sonner";
import {
  MessageSquare,
  Clock,
  Mail,
  Send,
  Plus,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Wand2,
  Loader2,
} from "lucide-react";
import { type TaxConsultation, type TaxAccountantAssignment } from "@/hooks/useTaxAccountant";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface ConsultationTabProps {
  consultations: TaxConsultation[];
  assignment: TaxAccountantAssignment | null;
  onCreated: () => void;
  loading?: boolean;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "대기 중", variant: "secondary" },
    sent: { label: "전달됨", variant: "default" },
    responded: { label: "답변 완료", variant: "outline" },
  };
  const c = config[status] || config.pending;
  return <Badge variant={c.variant} className="text-[10px]">{c.label}</Badge>;
}

export default function ConsultationTab({
  consultations,
  assignment,
  onCreated,
  loading,
}: ConsultationTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // AI 작성 도우미 상태
  const [briefInput, setBriefInput] = useState("");
  const [drafting, setDrafting] = useState(false);

  const handleAIDraft = async () => {
    if (!briefInput.trim()) return;
    setDrafting(true);
    try {
      const { data, error } = await supabase.functions.invoke("draft-consultation", {
        body: { briefDescription: briefInput.trim() },
      });
      if (error) throw error;
      if (data?.subject) setSubject(data.subject);
      if (data?.question) setQuestion(data.question);
      toast.success("AI가 상담서를 작성했습니다. 내용을 확인 후 수정해주세요.");
    } catch (e) {
      toast.error("AI 작성에 실패했습니다. 직접 작성해주세요.");
      console.error("AI draft error:", e);
    } finally {
      setDrafting(false);
    }
  };

  const handleSubmit = async () => {
    if (!subject.trim() || !question.trim()) {
      toast.error("제목과 질문을 입력해 주세요");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { error } = await supabase.from("tax_consultations").insert({
        user_id: user.id,
        accountant_id: assignment?.accountant_id || null,
        subject: subject.trim(),
        user_question: question.trim(),
        consultation_type: "ad_hoc",
        status: "pending",
      });

      if (error) throw error;
      toast.success("상담 요청이 등록되었습니다");
      setSubject("");
      setQuestion("");
      setShowForm(false);
      onCreated();
    } catch (e) {
      toast.error((e as Error).message || "상담 등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendEmail = async (consultationId: string) => {
    setSendingId(consultationId);
    try {
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
          body: JSON.stringify({ consultationId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`${data.accountantName} 세무사에게 전달되었습니다`);
      onCreated();
    } catch (e) {
      toast.error((e as Error).message || "전달에 실패했습니다");
    } finally {
      setSendingId(null);
    }
  };

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
    <div className="space-y-3">
      {/* 새 상담 요청 버튼 / 폼 */}
      {!showForm ? (
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          새 상담 요청
        </Button>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h4 className="text-sm font-semibold">새 상담 요청</h4>

            {/* AI 작성 도우미 */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 space-y-2">
              <p className="text-xs font-medium flex items-center gap-1.5 text-primary">
                <Wand2 className="h-3.5 w-3.5" />
                AI 작성 도우미
              </p>
              <p className="text-[11px] text-muted-foreground">
                고민을 간단히 적으면 AI가 세무사에게 보낼 상담서를 작성해 드립니다
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="예: 부가세 신고 때 매입세액 공제 가능한지"
                  value={briefInput}
                  onChange={(e) => setBriefInput(e.target.value)}
                  className="text-xs flex-1"
                  disabled={drafting}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && briefInput.trim() && !drafting) {
                      handleAIDraft();
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={drafting || !briefInput.trim()}
                  onClick={handleAIDraft}
                  className="shrink-0"
                >
                  {drafting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            <Input
              placeholder="상담 제목 (예: 부가세 신고 관련 문의)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="text-sm"
            />
            <Textarea
              placeholder="세무사에게 질문할 내용을 작성해 주세요..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={5}
              className="text-sm"
            />
            {!assignment && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                담당 세무사 배정 후 이메일로 전달할 수 있습니다
              </p>
            )}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowForm(false); setSubject(""); setQuestion(""); setBriefInput(""); }}
              >
                취소
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting || !subject.trim() || !question.trim()}
              >
                {submitting ? "등록 중..." : "상담 등록"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 상담 목록 */}
      {consultations.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-semibold mb-1">상담 내역이 없습니다</h3>
            <p className="text-xs text-muted-foreground">
              김비서에게 세무 질문을 하거나<br />
              위 버튼으로 직접 상담을 요청할 수 있습니다
            </p>
          </CardContent>
        </Card>
      ) : (
        consultations.map((c) => {
          const isExpanded = expandedId === c.id;
          return (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div
                  className="flex items-start justify-between mb-2 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                >
                  <h4 className="text-sm font-medium flex-1 mr-2">{c.subject}</h4>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={c.status} />
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                <p className={`text-xs text-muted-foreground mb-2 ${isExpanded ? "" : "line-clamp-2"}`}>
                  {c.user_question}
                </p>

                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ko })}
                  {c.email_sent_at && (
                    <>
                      <span>•</span>
                      <Mail className="h-3 w-3" />
                      이메일 전달됨
                    </>
                  )}
                </div>

                {/* AI 사전 답변 */}
                {isExpanded && c.ai_preliminary_answer && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <p className="text-xs font-medium mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      AI 사전 분석
                    </p>
                    <p className="text-xs text-muted-foreground">{c.ai_preliminary_answer}</p>
                  </div>
                )}

                {/* 세무사에게 이메일 전달 버튼 */}
                {c.status === "pending" && assignment && (
                  <div className="mt-3 space-y-1.5">
                    {assignment.accountant?.email && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        발송 대상: {assignment.accountant.email}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <EmailPreviewDialog consultationId={c.id} onSent={onCreated} />
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        disabled={sendingId === c.id}
                        onClick={() => handleSendEmail(c.id)}
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {sendingId === c.id ? "전달 중..." : "세무사에게 이메일 전달"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* 세무사 답변 */}
                {isExpanded && c.accountant_response && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <p className="text-xs font-medium mb-1">세무사 답변</p>
                    <p className="text-xs text-muted-foreground">{c.accountant_response}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
