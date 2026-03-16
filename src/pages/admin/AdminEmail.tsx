import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Users, FileText, Megaphone, Bell, Plus, X, Palette, ShieldCheck, Loader2, Ban, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import EmailDesignForm, { DEFAULT_DESIGN, buildDesignedEmailHtml, type EmailDesign } from "@/components/admin/EmailDesignForm";
import AuthEmailTemplates from "@/components/admin/AuthEmailTemplates";

const EMAIL_TEMPLATES = {
  notice: {
    label: "공지/안내",
    icon: Megaphone,
    defaultSubject: "[김비서] 서비스 공지사항",
    placeholder: "서비스 업데이트, 점검 안내 등의 내용을 작성해주세요...",
  },
  marketing: {
    label: "마케팅/프로모션",
    icon: FileText,
    defaultSubject: "[김비서] 특별 이벤트 안내",
    placeholder: "이벤트, 할인, 신기능 홍보 등의 내용을 작성해주세요...",
  },
  notification: {
    label: "사용자 알림",
    icon: Bell,
    defaultSubject: "[김비서] 알림",
    placeholder: "개별 사용자에게 보낼 알림 내용을 작성해주세요...",
  },
  custom: {
    label: "자유 작성",
    icon: Mail,
    defaultSubject: "",
    placeholder: "자유롭게 이메일 내용을 작성해주세요...",
  },
};

type TemplateType = keyof typeof EMAIL_TEMPLATES;

interface EmailHistory {
  id: string;
  subject: string;
  recipients: string[];
  recipient_count: number;
  template_type: string;
  status: string;
  created_at: string;
}

interface Unsubscribe {
  id: string;
  email: string;
  reason: string | null;
  unsubscribed_at: string;
}

export default function AdminEmail() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("notice");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientMode, setRecipientMode] = useState<"manual" | "all">("manual");
  const [formData, setFormData] = useState({
    subject: EMAIL_TEMPLATES.notice.defaultSubject,
    replyTo: "",
  });

  // 유형별 디자인 저장
  const [designsByType, setDesignsByType] = useState<Record<TemplateType, EmailDesign>>({
    notice: { ...DEFAULT_DESIGN },
    marketing: { ...DEFAULT_DESIGN },
    notification: { ...DEFAULT_DESIGN },
    custom: { ...DEFAULT_DESIGN },
  });
  const [designLoading, setDesignLoading] = useState(true);
  const [designSaving, setDesignSaving] = useState(false);

  const emailDesign = designsByType[selectedTemplate];
  const setEmailDesign = (design: EmailDesign) => {
    setDesignsByType((prev) => ({ ...prev, [selectedTemplate]: design }));
  };

  // DB-backed history
  const [sentHistory, setSentHistory] = useState<EmailHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Unsubscribes
  const [unsubscribes, setUnsubscribes] = useState<Unsubscribe[]>([]);
  const [unsubLoading, setUnsubLoading] = useState(true);
  const [historyFilterType, setHistoryFilterType] = useState("all");
  const [historyFilterStatus, setHistoryFilterStatus] = useState("all");

  // All users count
  const [allUserCount, setAllUserCount] = useState<number | null>(null);

  const filteredHistory = sentHistory.filter((item) => {
    if (historyFilterType !== "all" && item.template_type !== historyFilterType) return false;
    if (historyFilterStatus !== "all" && item.status !== historyFilterStatus) return false;
    return true;
  });

  // 유형별 디자인 DB에서 로드
  useEffect(() => {
    if (!isAdmin) return;
    const loadDesigns = async () => {
      setDesignLoading(true);
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("key, value")
          .like("key", "email_design_%");
        if (!error && data) {
          const updated = { ...designsByType };
          for (const row of data) {
            const type = row.key.replace("email_design_", "") as TemplateType;
            if (type in updated) {
              updated[type] = { ...DEFAULT_DESIGN, ...(row.value as any) };
            }
          }
          setDesignsByType(updated);
        }
      } catch {}
      setDesignLoading(false);
    };
    loadDesigns();
  }, [isAdmin]);

  // 디자인 저장
  const saveDesign = async (type: TemplateType) => {
    setDesignSaving(true);
    try {
      const key = `email_design_${type}`;
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key, value: designsByType[type] as any, description: `${EMAIL_TEMPLATES[type].label} 이메일 디자인` }, { onConflict: "key" });
      if (error) throw error;
      toast.success(`${EMAIL_TEMPLATES[type].label} 디자인이 저장되었습니다`);
    } catch {
      toast.error("디자인 저장에 실패했습니다");
    }
    setDesignSaving(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    loadHistory();
    loadUnsubscribes();
  }, [isAdmin]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_send_history" as any)
        .select("id, subject, recipients, recipient_count, template_type, status, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (!error && data) setSentHistory(data as any);
    } catch {}
    setHistoryLoading(false);
  };

  const loadUnsubscribes = async () => {
    setUnsubLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_unsubscribes" as any)
        .select("*")
        .order("unsubscribed_at", { ascending: false });
      if (!error && data) setUnsubscribes(data as any);
    } catch {}
    setUnsubLoading(false);
  };

  const removeUnsubscribe = async (id: string) => {
    try {
      const { error } = await supabase.from("email_unsubscribes" as any).delete().eq("id", id);
      if (error) throw error;
      setUnsubscribes((prev) => prev.filter((u) => u.id !== id));
      toast.success("수신 거부가 해제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  const handleTemplateChange = (type: TemplateType) => {
    setSelectedTemplate(type);
    setFormData((prev) => ({
      ...prev,
      subject: EMAIL_TEMPLATES[type].defaultSubject || prev.subject,
    }));
  };

  const addRecipient = () => {
    const email = recipientInput.trim();
    if (!email) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("올바른 이메일 형식이 아닙니다");
      return;
    }
    if (recipients.includes(email)) {
      toast.error("이미 추가된 이메일입니다");
      return;
    }
    setRecipients([...recipients, email]);
    setRecipientInput("");
  };

  const removeRecipient = (email: string) => {
    setRecipients(recipients.filter((r) => r !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRecipient();
    }
  };

  const handleSend = async () => {
    if (recipientMode === "manual" && recipients.length === 0) {
      toast.error("수신자를 최소 1명 이상 추가해주세요");
      return;
    }
    if (!formData.subject.trim()) {
      toast.error("제목을 입력해주세요");
      return;
    }
    if (!emailDesign.body.trim()) {
      toast.error("본문을 입력해주세요");
      return;
    }

    const targetLabel = recipientMode === "all" ? "전체 유저" : `${recipients.length}명`;
    if (!confirm(`${targetLabel}에게 이메일을 발송하시겠습니까?`)) return;

    try {
      setSending(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const body: any = {
        subject: formData.subject,
        html: buildDesignedEmailHtml(emailDesign),
        replyTo: formData.replyTo || undefined,
        templateType: selectedTemplate,
      };

      if (recipientMode === "all") {
        body.fetchAllUsers = true;
      } else {
        body.to = recipients;
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://app.mrkim.today"}/functions/v1/send-custom-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
          },
          body: JSON.stringify(body),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "발송 실패");

      toast.success(`${result.recipientCount || result.successCount}명에게 이메일이 발송되었습니다${result.failCount ? ` (${result.failCount}건 실패)` : ""}`);
      setFormData({ subject: EMAIL_TEMPLATES[selectedTemplate].defaultSubject, replyTo: "" });
      setEmailDesign({ ...DEFAULT_DESIGN });
      setRecipients([]);
      loadHistory();
    } catch (error: any) {
      console.error("Email send error:", error);
      toast.error(error.message || "이메일 발송에 실패했습니다");
    } finally {
      setSending(false);
    }
  };

  const handlePasteEmails = (text: string) => {
    const emails = text
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      .filter((e) => !recipients.includes(e));
    if (emails.length > 0) {
      setRecipients([...recipients, ...emails]);
      setRecipientInput("");
      toast.success(`${emails.length}개 이메일 추가됨`);
    }
  };

  if (authLoading) {
    return <AdminLayout title="이메일 발송" loading><div /></AdminLayout>;
  }

  if (!isAdmin) return null;

  const template = EMAIL_TEMPLATES[selectedTemplate];

  return (
    <AdminLayout title="이메일 발송">
      <div className="space-y-6 max-w-4xl">
        <Tabs defaultValue="compose" className="space-y-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="compose">
              <Mail className="w-4 h-4 mr-2" />
              작성
            </TabsTrigger>
            <TabsTrigger value="design">
              <Palette className="w-4 h-4 mr-2" />
              디자인
            </TabsTrigger>
            <TabsTrigger value="history">
              <FileText className="w-4 h-4 mr-2" />
              발송 내역
            </TabsTrigger>
            <TabsTrigger value="unsubscribe">
              <Ban className="w-4 h-4 mr-2" />
              수신 거부
            </TabsTrigger>
            <TabsTrigger value="auth">
              <ShieldCheck className="w-4 h-4 mr-2" />
              인증 메일
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            {/* Template Selection */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(EMAIL_TEMPLATES) as [TemplateType, typeof EMAIL_TEMPLATES[TemplateType]][]).map(
                ([key, tmpl]) => (
                  <Card
                    key={key}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate === key
                        ? "ring-2 ring-primary border-primary"
                        : "hover:border-primary/30"
                    }`}
                    onClick={() => handleTemplateChange(key)}
                  >
                    <CardContent className="pt-4 pb-3 text-center">
                      <tmpl.icon
                        className={`w-6 h-6 mx-auto mb-2 ${
                          selectedTemplate === key ? "text-primary" : "text-muted-foreground"
                        }`}
                      />
                      <p className={`text-sm font-medium ${
                        selectedTemplate === key ? "text-primary" : "text-foreground"
                      }`}>
                        {tmpl.label}
                      </p>
                    </CardContent>
                  </Card>
                )
              )}
            </div>

            {/* Recipients */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  수신자
                </CardTitle>
                <CardDescription>수동 입력 또는 전체 유저 대상으로 발송할 수 있습니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Mode toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={recipientMode === "manual" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecipientMode("manual")}
                  >
                    수동 입력
                  </Button>
                  <Button
                    variant={recipientMode === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setRecipientMode("all")}
                  >
                    <Users className="w-3.5 h-3.5 mr-1" />
                    전체 유저
                  </Button>
                </div>

                {recipientMode === "manual" ? (
                  <>
                    <div className="flex gap-2">
                      <Input
                        placeholder="이메일 주소 입력..."
                        value={recipientInput}
                        onChange={(e) => setRecipientInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData("text");
                          if (text.includes(",") || text.includes("\n") || text.includes(";")) {
                            e.preventDefault();
                            handlePasteEmails(text);
                          }
                        }}
                        className="flex-1"
                      />
                      <Button variant="secondary" onClick={addRecipient} size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        추가
                      </Button>
                    </div>

                    {recipients.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {recipients.map((email) => (
                          <Badge key={email} variant="secondary" className="gap-1 py-1">
                            {email}
                            <button onClick={() => removeRecipient(email)}>
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {recipients.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        총 <span className="font-semibold text-foreground">{recipients.length}</span>명
                      </p>
                    )}
                  </>
                ) : (
                  <div className="p-4 rounded-lg border bg-muted/30 text-center space-y-1">
                    <Users className="w-8 h-8 mx-auto text-primary opacity-60" />
                    <p className="text-sm font-medium">전체 가입 유저에게 발송</p>
                    <p className="text-xs text-muted-foreground">
                      수신 거부한 유저는 자동으로 제외됩니다
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subject & Reply-To */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <template.icon className="w-4 h-4" />
                  {template.label} 이메일 설정
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>제목</Label>
                  <Input
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="이메일 제목"
                  />
                </div>
                <div className="space-y-2">
                  <Label>회신 주소 (선택)</Label>
                  <Input
                    type="email"
                    value={formData.replyTo}
                    onChange={(e) => setFormData({ ...formData, replyTo: e.target.value })}
                    placeholder="reply@example.com"
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={sending || (recipientMode === "manual" && recipients.length === 0) || !formData.subject.trim() || !emailDesign.body.trim()}
                  className="w-full"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 발송 중...</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> {recipientMode === "all" ? "전체 유저에게 발송" : `${recipients.length}명에게 발송`}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design" className="space-y-4">
            {/* 유형 선택 */}
            <div className="flex flex-wrap items-center gap-2">
              {(Object.entries(EMAIL_TEMPLATES) as [TemplateType, typeof EMAIL_TEMPLATES[TemplateType]][]).map(
                ([key, tmpl]) => (
                  <Button
                    key={key}
                    variant={selectedTemplate === key ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTemplate(key)}
                    className="gap-1.5"
                  >
                    <tmpl.icon className="w-3.5 h-3.5" />
                    {tmpl.label}
                  </Button>
                )
              )}
            </div>

            {designLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <>
                <EmailDesignForm design={emailDesign} onChange={setEmailDesign} />
                <Button
                  onClick={() => saveDesign(selectedTemplate)}
                  disabled={designSaving}
                  className="w-full"
                >
                  {designSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 저장 중...</>
                  ) : (
                    <>{EMAIL_TEMPLATES[selectedTemplate].label} 디자인 저장</>
                  )}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">발송 내역</CardTitle>
                    <CardDescription>최근 50건의 이메일 발송 기록</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={loadHistory} className="text-xs">
                    <RotateCcw className="w-3 h-3 mr-1" />
                    새로고침
                  </Button>
                </div>
                {/* Filters */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <select
                    value={historyFilterType}
                    onChange={(e) => setHistoryFilterType(e.target.value)}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="all">전체 유형</option>
                    {Object.entries(EMAIL_TEMPLATES).map(([key, tmpl]) => (
                      <option key={key} value={key}>{tmpl.label}</option>
                    ))}
                  </select>
                  <select
                    value={historyFilterStatus}
                    onChange={(e) => setHistoryFilterStatus(e.target.value)}
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                  >
                    <option value="all">전체 상태</option>
                    <option value="sent">발송완료</option>
                    <option value="failed">실패</option>
                    <option value="partial">부분실패</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>{sentHistory.length === 0 ? "발송 내역이 없습니다" : "필터 조건에 맞는 내역이 없습니다"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      총 <span className="font-semibold text-foreground">{filteredHistory.length}</span>건
                    </p>
                    {filteredHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{item.subject}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="text-xs">{item.template_type}</Badge>
                            <span>{item.recipient_count}명</span>
                            <span>{new Date(item.created_at).toLocaleString("ko-KR")}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(item.recipients || []).slice(0, 3).map((email: string) => (
                              <Badge key={email} variant="secondary" className="text-[10px] py-0">
                                {email}
                              </Badge>
                            ))}
                            {(item.recipients || []).length > 3 && (
                              <Badge variant="secondary" className="text-[10px] py-0">
                                +{item.recipients.length - 3}명
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant={item.status === "sent" ? "default" : item.status === "failed" ? "destructive" : "secondary"}>
                          {item.status === "sent" ? "발송완료" : item.status === "failed" ? "실패" : "부분실패"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unsubscribe">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Ban className="w-4 h-4" />
                  수신 거부 목록
                </CardTitle>
                <CardDescription>수신 거부한 사용자는 이메일 발송 시 자동으로 제외됩니다</CardDescription>
              </CardHeader>
              <CardContent>
                {unsubLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : unsubscribes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Ban className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>수신 거부한 사용자가 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-3">
                      총 <span className="font-semibold text-foreground">{unsubscribes.length}</span>명
                    </p>
                    {unsubscribes.map((unsub) => (
                      <div
                        key={unsub.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div>
                          <p className="text-sm font-medium">{unsub.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(unsub.unsubscribed_at).toLocaleString("ko-KR")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm(`${unsub.email}의 수신 거부를 해제하시겠습니까?`)) {
                              removeUnsubscribe(unsub.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth">
            <AuthEmailTemplates design={emailDesign} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
