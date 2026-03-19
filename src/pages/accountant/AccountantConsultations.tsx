import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAccountantData } from "@/hooks/useAccountantData";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { MessageSquare, Send, Bot } from "lucide-react";
import type { AccountantProfile } from "@/hooks/useAccountantAuth";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "대기", variant: "destructive" },
  in_progress: { label: "처리중", variant: "default" },
  responded: { label: "답변완료", variant: "secondary" },
  closed: { label: "종료", variant: "outline" },
};

export default function AccountantConsultations() {
  const { accountant } = useOutletContext<{ accountant: AccountantProfile }>();
  const { consultations, loading, refetch } = useAccountantData(accountant.id);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRespond = async (consultationId: string) => {
    if (!response.trim()) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("tax_consultations")
        .update({
          accountant_response: response.trim(),
          status: "responded",
          responded_at: new Date().toISOString(),
        })
        .eq("id", consultationId);

      if (error) throw error;
      toast.success("답변이 전송되었습니다.");
      setRespondingId(null);
      setResponse("");
      refetch();
    } catch {
      toast.error("답변 전송에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">상담 관리</h1>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">상담 관리</h1>

      {consultations.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>아직 상담 요청이 없습니다.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {consultations.map(c => {
            const status = statusLabels[c.status] || statusLabels.pending;
            return (
              <Card key={c.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{c.subject}</CardTitle>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(c.created_at).toLocaleDateString("ko-KR")} · {c.consultation_type === "ad_hoc" ? "비정기" : "정기"}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* User question */}
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">고객 질문</p>
                    <p className="text-sm">{c.user_question}</p>
                  </div>

                  {/* AI preliminary answer */}
                  {c.ai_preliminary_answer && (
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                        <Bot className="h-3 w-3" /> AI 사전 답변
                      </p>
                      <p className="text-sm">{c.ai_preliminary_answer}</p>
                    </div>
                  )}

                  {/* Accountant response */}
                  {c.accountant_response && (
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                      <p className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">세무사 답변</p>
                      <p className="text-sm">{c.accountant_response}</p>
                    </div>
                  )}

                  {/* Respond form */}
                  {c.status === "pending" && (
                    respondingId === c.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={response}
                          onChange={e => setResponse(e.target.value)}
                          placeholder="답변을 입력하세요..."
                          rows={4}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRespond(c.id)}
                            disabled={submitting || !response.trim()}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            {submitting ? "전송 중..." : "답변 전송"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setRespondingId(null); setResponse(""); }}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRespondingId(c.id)}
                      >
                        답변하기
                      </Button>
                    )
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
