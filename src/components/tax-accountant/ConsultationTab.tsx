import { useCallback, useRef, useState } from "react";
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
  UserCheck,
  Wand2,
  Loader2,
  Paperclip,
  Download,
  FileText,
} from "lucide-react";
import { type TaxConsultation, type TaxAccountantAssignment } from "@/hooks/useTaxAccountant";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface BusinessContext {
  businessName: string | null;
  businessType: string | null;
  businessRegistrationNumber: string | null;
}

interface ConsultationTabProps {
  consultations: TaxConsultation[];
  assignment: TaxAccountantAssignment | null;
  onCreated: () => void;
  loading?: boolean;
  secretaryName?: string;
  businessContext?: BusinessContext;
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
  secretaryName = "김비서",
  businessContext,
}: ConsultationTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [previewLinks, setPreviewLinks] = useState<{ label: string; url: string; description: string }[]>([]);
  const [previewReady, setPreviewReady] = useState(false);

  // AI 작성 도우미 상태
  const [drafting, setDrafting] = useState(false);
  const draftInFlightRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const previewInFlightRef = useRef(false);
  const lastDraftInputRef = useRef<string | null>(null);

  // 한국어 조사 처리: 받침 유무에 따라 이/가, 은/는 등 선택
  const hasLastConsonant = (name: string) => {
    const lastChar = name.charCodeAt(name.length - 1);
    if (lastChar < 0xAC00 || lastChar > 0xD7A3) return false;
    return (lastChar - 0xAC00) % 28 !== 0;
  };
  const topicParticle = hasLastConsonant(secretaryName) ? "이" : "가";

  const resetForm = () => {
    setShowForm(false);
    setSubject("");
    setQuestion("");
    setPreviewLinks([]);
    setPreviewReady(false);
    lastDraftInputRef.current = null;
  };

  const getDownloadLinks = (c: TaxConsultation): { label: string; url: string; description: string }[] => {
    const dp = c.data_package as Record<string, unknown> | null;
    if (!dp?.downloadLinks || !Array.isArray(dp.downloadLinks)) return [];
    return dp.downloadLinks as { label: string; url: string; description: string }[];
  };

  const getSuggestedConcerns = (): string[] => {
    const month = new Date().getMonth() + 1;
    const base = [
      "매출이 늘었는데 절세 방법이 궁금해요",
      "직원 급여 신고 방법을 알고 싶어요",
      "경비 처리 가능한 항목이 뭔지 궁금해요",
    ];
    if (month >= 1 && month <= 1) base.unshift("부가세 확정신고 준비가 필요해요");
    if (month >= 5 && month <= 5) base.unshift("종합소득세 신고를 준비하고 싶어요");
    if (month >= 7 && month <= 7) base.unshift("부가세 확정신고 준비가 필요해요");
    if (month >= 3 && month <= 4) base.unshift("법인세 신고 관련 상담이 필요해요");
    if (month >= 11 && month <= 12) base.unshift("연말정산 준비를 시작하고 싶어요");
    return base.slice(0, 4);
  };

  const requestAIDraft = useCallback(async (input: string) => {
    const trimmedInput = input.trim();
    if (!trimmedInput || draftInFlightRef.current || lastDraftInputRef.current === trimmedInput) return;

    draftInFlightRef.current = true;
    lastDraftInputRef.current = trimmedInput;
    setDrafting(true);
    setPreviewReady(false);
    setPreviewLinks([]);
    try {
      const { data, error } = await supabase.functions.invoke("draft-consultation", {
        body: { briefDescription: trimmedInput, businessContext },
      });
      if (error) throw error;
      if (data?.subject) setSubject(data.subject);
      if (data?.question) setQuestion(data.question);
      toast.success(`${secretaryName}${topicParticle} 상담서를 작성했습니다. 이제 자료를 미리 생성해 확인해보세요.`);
    } catch (e) {
      lastDraftInputRef.current = null;
      toast.error("AI 작성에 실패했습니다. 직접 작성해주세요.");
      console.error("AI draft error:", e);
    } finally {
      draftInFlightRef.current = false;
      setDrafting(false);
    }
  }, [businessContext, secretaryName, topicParticle]);

  const generatePreviewDataPackage = async (silent = false) => {
    if (previewInFlightRef.current || attachingId === "preview") return null;

    previewInFlightRef.current = true;
    setAttachingId("preview");
    try {
      const { data, error } = await supabase.functions.invoke("attach-consultation-data", {
        body: { preview: true },
      });

      if (error) throw error;

      const links = Array.isArray(data?.links)
        ? (data.links as { label: string; url: string; description: string }[])
        : [];

      setPreviewLinks(links);
      setPreviewReady(true);

      if (!silent) {
        if (links.length > 0) {
          toast.success(`관련 자료 ${links.length}건을 준비했습니다`);
        } else {
          const missing = Array.isArray(data?.missingSources) ? data.missingSources as string[] : [];
          const missingText = missing.length > 0 ? missing.join(", ") : "거래내역, 세금계산서, 배달주문, 직원현황";
          toast.info(`${missingText} 데이터가 없습니다. 해당 서비스를 먼저 연동해주세요.`);
        }
      }

      return data;
    } catch (e) {
      setPreviewReady(false);
      setPreviewLinks([]);
      console.error("Preview data package error:", e);
      if (!silent) {
        toast.error("자료 미리보기에 실패했습니다. 다시 시도해주세요.");
      }
      throw e;
    } finally {
      previewInFlightRef.current = false;
      setAttachingId(null);
    }
  };

  const attachDataToConsultation = async (consultationId: string, silent = false) => {
    setAttachingId(consultationId);
    try {
      const { data, error } = await supabase.functions.invoke("attach-consultation-data", {
        body: { consultationId },
      });

      if (error) throw error;

      if (!silent) {
        if (data?.totalFiles > 0) {
          toast.success(`${data.totalFiles}개 자료가 첨부되었습니다`);
        } else {
          toast.info("첨부할 데이터가 아직 없습니다. 연동 후 다시 시도해주세요.");
        }
      }

      return data;
    } catch (e) {
      console.error("Attach data error:", e);
      if (!silent) {
        toast.error("자료 첨부에 실패했습니다. 다시 시도해주세요.");
      }
      throw e;
    } finally {
      setAttachingId(null);
    }
  };

  const handleSubmit = async () => {
    if (submitInFlightRef.current || submitting) return;

    if (!subject.trim() || !question.trim()) {
      toast.error("제목과 질문을 입력해 주세요");
      return;
    }

    if (!previewReady) {
      toast.error("먼저 자료를 생성해서 확인해 주세요");
      return;
    }

    submitInFlightRef.current = true;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const dataPackage = previewLinks.length > 0 ? { downloadLinks: previewLinks } : {};
      const { error } = await supabase.from("tax_consultations").insert({
        user_id: user.id,
        accountant_id: assignment?.accountant_id || null,
        subject: subject.trim(),
        user_question: question.trim(),
        consultation_type: "ad_hoc",
        status: "pending",
        data_package: dataPackage,
      });

      if (error) throw error;

      toast.success(`상담이 등록되었습니다${previewLinks.length > 0 ? ` (자료 ${previewLinks.length}건 첨부)` : ""}`);
      resetForm();
      onCreated();
    } catch (e) {
      toast.error((e as Error).message || "상담 등록에 실패했습니다");
    } finally {
      submitInFlightRef.current = false;
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

  if (!assignment) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">담당 세무사를 먼저 배정해주세요</h3>
          <p className="text-xs text-muted-foreground mb-4">
            상담을 요청하려면 먼저 매칭 탭에서<br />담당 세무사를 선택해야 합니다
          </p>
        </CardContent>
      </Card>
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

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 space-y-2.5">
              <p className="text-xs font-medium flex items-center gap-1.5 text-primary">
                <Wand2 className="h-3.5 w-3.5" />
                {secretaryName}{topicParticle} 도와드려요!
              </p>
              <p className="text-[11px] text-muted-foreground">
                먼저 상담 내용을 작성하고, 자료를 미리 생성해 확인한 뒤 최종 등록할 수 있습니다
              </p>
              <div className="flex flex-wrap gap-1.5">
                {getSuggestedConcerns().map((concern) => (
                  <button
                    key={concern}
                    type="button"
                    disabled={drafting}
                    onClick={() => {
                      void requestAIDraft(concern);
                    }}
                    className="text-[11px] px-2.5 py-1.5 rounded-full border border-primary/20 bg-background hover:bg-primary/10 hover:border-primary/40 text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {concern}
                  </button>
                ))}
              </div>
              {drafting && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                  {secretaryName}{topicParticle} 상담서를 작성하고 있어요...
                </div>
              )}
            </div>

            <Input
              placeholder="상담 제목 (예: 부가세 신고 관련 문의)"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setPreviewReady(false);
              }}
              className="text-sm"
            />
            <Textarea
              placeholder="세무사에게 질문할 내용을 작성해 주세요..."
              value={question}
              onChange={(e) => {
                setQuestion(e.target.value);
                setPreviewReady(false);
              }}
              rows={5}
              className="text-sm"
            />

            <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium">첨부 자료 미리보기</p>
                  <p className="text-[11px] text-muted-foreground">최근 3개월 자료를 먼저 생성해서 확인한 뒤 상담을 등록합니다</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs shrink-0"
                  disabled={drafting || submitting || !subject.trim() || !question.trim() || attachingId === "preview"}
                  onClick={() => void generatePreviewDataPackage()}
                >
                  {attachingId === "preview" ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />자료 생성 중...</>
                  ) : (
                    <><Paperclip className="h-3.5 w-3.5 mr-1.5" />관련자료 생성</>
                  )}
                </Button>
              </div>

              {attachingId === "preview" ? (
                <div className="space-y-2">
                  <Skeleton className="h-14 rounded-md" />
                  <Skeleton className="h-14 rounded-md" />
                </div>
              ) : previewLinks.length > 0 ? (
                <div className="space-y-1.5">
                  {previewLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md bg-background hover:bg-accent/50 transition-colors group"
                    >
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{link.label}</p>
                        <p className="text-[10px] text-muted-foreground">{link.description}</p>
                      </div>
                      <Download className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </a>
                  ))}
                  <p className="text-[10px] text-muted-foreground">⏰ 다운로드 링크는 7일간 유효합니다</p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">아직 생성된 미리보기 자료가 없습니다.</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={resetForm}
              >
                취소
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSubmit}
                disabled={submitting || drafting || attachingId === "preview" || !subject.trim() || !question.trim() || !previewReady}
              >
                {submitting ? "상담 등록 중..." : "자료 확인 후 상담 등록"}
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
                  {getDownloadLinks(c).length > 0 && (
                    <>
                      <span>•</span>
                      <Paperclip className="h-3 w-3" />
                      자료 {getDownloadLinks(c).length}건
                    </>
                  )}
                </div>

                {/* 첨부 자료 */}
                {isExpanded && (() => {
                  const links = getDownloadLinks(c);
                  if (links.length === 0 && c.status === "pending") {
                    return (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs w-full border-dashed"
                          disabled={attachingId === c.id}
                          onClick={() => attachDataToConsultation(c.id)}
                        >
                          {attachingId === c.id ? (
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />자료 수집 중...</>
                          ) : (
                            <><Paperclip className="h-3.5 w-3.5 mr-1.5" />관련 자료 첨부하기</>
                          )}
                        </Button>
                      </div>
                    );
                  }
                  if (links.length > 0) {
                    return (
                      <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                        <p className="text-xs font-medium flex items-center gap-1">
                          <Paperclip className="h-3 w-3 text-primary" />
                          첨부 자료
                        </p>
                        <div className="space-y-1.5">
                          {links.map((link, i) => (
                            <a
                              key={i}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 rounded-md bg-background hover:bg-accent/50 transition-colors group"
                            >
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{link.label}</p>
                                <p className="text-[10px] text-muted-foreground">{link.description}</p>
                              </div>
                              <Download className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            </a>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">⏰ 다운로드 링크는 7일간 유효합니다</p>
                      </div>
                    );
                  }
                  return null;
                })()}

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
