import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Users, FileText, Megaphone, Bell, Plus, X, Palette } from "lucide-react";
import { toast } from "sonner";
import EmailDesignForm, { DEFAULT_DESIGN, buildDesignedEmailHtml, type EmailDesign } from "@/components/admin/EmailDesignForm";

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

export default function AdminEmail() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [sending, setSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>("notice");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [recipientMode, setRecipientMode] = useState<"manual" | "all">("manual");
  const [emailDesign, setEmailDesign] = useState<EmailDesign>({ ...DEFAULT_DESIGN });
  const [formData, setFormData] = useState({
    subject: EMAIL_TEMPLATES.notice.defaultSubject,
    replyTo: "",
  });
  const [sentHistory, setSentHistory] = useState<Array<{
    id: string;
    subject: string;
    recipients: string[];
    template: string;
    sentAt: Date;
  }>>([]);

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

  const loadAllUserEmails = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("인증 필요");

      // profiles 테이블에서 user_id 목록 가져온 후 auth.users에서 이메일을 가져오는 대신
      // admin RPC나 별도 방법이 필요하므로, 여기서는 수동 입력 안내
      toast.info("전체 발송은 수신자 이메일을 직접 입력하거나, CSV로 붙여넣기 해주세요");
    } catch {
      toast.error("사용자 목록을 불러오지 못했습니다");
    }
  };

  const buildEmailHtml = (body: string): string => {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:0;color:#333;background:#ffffff;">
  <div style="background:#2563eb;padding:32px 24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">김비서</h1>
  </div>
  <div style="padding:32px 24px;">
    <div style="font-size:15px;line-height:1.8;color:#374151;white-space:pre-wrap;">${body}</div>
  </div>
  <div style="padding:24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">이 이메일은 김비서에서 발송되었습니다.</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} 김비서. All rights reserved.</p>
  </div>
</body>
</html>`;
  };

  const handleSend = async () => {
    if (recipients.length === 0) {
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

    if (!confirm(`${recipients.length}명에게 이메일을 발송하시겠습니까?`)) return;

    try {
      setSending(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL || "https://app.mrkim.today"}/functions/v1/send-custom-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
          },
          body: JSON.stringify({
            to: recipients,
            subject: formData.subject,
            html: buildDesignedEmailHtml(emailDesign),
            replyTo: formData.replyTo || undefined,
          }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "발송 실패");

      setSentHistory((prev) => [
        {
          id: result.id || crypto.randomUUID(),
          subject: formData.subject,
          recipients: [...recipients],
          template: EMAIL_TEMPLATES[selectedTemplate].label,
          sentAt: new Date(),
        },
        ...prev,
      ]);

      toast.success(`${recipients.length}명에게 이메일이 발송되었습니다`);
      setFormData({ subject: EMAIL_TEMPLATES[selectedTemplate].defaultSubject, replyTo: "" });
      setEmailDesign({ ...DEFAULT_DESIGN });
      setRecipients([]);
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

        <Tabs defaultValue="compose" className="space-y-4">
          <TabsList>
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
          </TabsList>

          <TabsContent value="compose" className="space-y-4">
            {/* Recipients */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  수신자
                </CardTitle>
                <CardDescription>이메일 주소를 입력하거나, 여러 개를 쉼표/줄바꿈으로 붙여넣기할 수 있습니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
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
                  disabled={sending || recipients.length === 0 || !formData.subject.trim() || !emailDesign.body.trim()}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sending ? "발송 중..." : `${recipients.length}명에게 발송`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="design" className="space-y-4">
            <EmailDesignForm design={emailDesign} onChange={setEmailDesign} />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">최근 발송 내역</CardTitle>
                <CardDescription>이번 세션에서 발송한 이메일 내역입니다</CardDescription>
              </CardHeader>
              <CardContent>
                {sentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>발송 내역이 없습니다</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentHistory.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{item.subject}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{item.template}</Badge>
                            <span>{item.recipients.length}명</span>
                            <span>{item.sentAt.toLocaleString("ko-KR")}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.recipients.slice(0, 5).map((email) => (
                              <Badge key={email} variant="secondary" className="text-[10px] py-0">
                                {email}
                              </Badge>
                            ))}
                            {item.recipients.length > 5 && (
                              <Badge variant="secondary" className="text-[10px] py-0">
                                +{item.recipients.length - 5}명
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge variant="default">발송완료</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>이메일 미리보기</DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted border-b">
                <p className="text-sm"><span className="font-medium">제목:</span> {formData.subject}</p>
                <p className="text-sm"><span className="font-medium">수신:</span> {recipients.join(", ") || "미지정"}</p>
              </div>
              <div
                dangerouslySetInnerHTML={{ __html: buildEmailHtml(formData.body) }}
                className="bg-white"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
