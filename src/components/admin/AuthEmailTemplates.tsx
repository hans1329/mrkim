import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Check, Mail, KeyRound, UserPlus, MailCheck, Loader2, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type EmailDesign, buildDesignedEmailHtml } from "./EmailDesignForm";

const AUTH_EMAIL_TYPES = [
  {
    id: "signup",
    label: "회원가입 확인",
    icon: UserPlus,
    description: "새 사용자가 가입할 때 이메일 인증 링크를 보냅니다",
  },
  {
    id: "magiclink",
    label: "매직 링크",
    icon: Mail,
    description: "비밀번호 없이 이메일로 로그인 링크를 보냅니다",
  },
  {
    id: "recovery",
    label: "비밀번호 재설정",
    icon: KeyRound,
    description: "비밀번호 변경을 위한 재설정 링크를 보냅니다",
  },
  {
    id: "email_change",
    label: "이메일 변경",
    icon: MailCheck,
    description: "이메일 주소 변경 시 확인 링크를 보냅니다",
  },
] as const;

type AuthEmailType = typeof AUTH_EMAIL_TYPES[number]["id"];

const TEMPLATE_CONTENT: Record<AuthEmailType, { heading: string; body: string; ctaText: string }> = {
  signup: {
    heading: "가입을 환영합니다! 🎉",
    body: "김비서에 가입해 주셔서 감사합니다.\n\n아래 버튼을 클릭하여 이메일 인증을 완료해주세요.\n인증이 완료되면 김비서의 모든 기능을 이용하실 수 있습니다.",
    ctaText: "이메일 인증하기",
  },
  magiclink: {
    heading: "로그인 링크",
    body: "김비서 로그인을 위한 매직 링크입니다.\n\n아래 버튼을 클릭하면 자동으로 로그인됩니다.\n이 링크는 한 번만 사용할 수 있으며, 일정 시간 후 만료됩니다.",
    ctaText: "로그인하기",
  },
  recovery: {
    heading: "비밀번호 재설정",
    body: "비밀번호 재설정을 요청하셨습니다.\n\n아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.\n본인이 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.",
    ctaText: "비밀번호 재설정",
  },
  email_change: {
    heading: "이메일 주소 변경 확인",
    body: "이메일 주소 변경이 요청되었습니다.\n\n아래 버튼을 클릭하여 새 이메일 주소를 확인해주세요.\n본인이 요청하지 않았다면 이 이메일을 무시하셔도 됩니다.",
    ctaText: "이메일 변경 확인",
  },
};

function buildAuthPreviewHtml(design: EmailDesign, type: AuthEmailType): string {
  const content = TEMPLATE_CONTENT[type];
  const confirmationUrl = "https://mrkim.today/auth/confirm?token=example";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f3f4f6;">
  <div style="background:${design.headerBg};padding:32px 24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;color:${design.headerTextColor};font-weight:700;">${design.headerTitle}</h1>
    <p style="margin:8px 0 0;font-size:14px;color:${design.headerTextColor};opacity:0.85;">${content.heading}</p>
  </div>
  <div style="padding:32px 24px;background:${design.bodyBg};">
    <div style="font-size:15px;line-height:1.8;color:${design.bodyTextColor};white-space:pre-wrap;">${content.body}</div>
    <div style="text-align:center;padding:24px 0 8px;">
      <a href="#" style="display:inline-block;padding:14px 32px;background:${design.ctaBg};color:${design.ctaTextColor};text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
        ${content.ctaText}
      </a>
    </div>
    <p style="margin-top:16px;font-size:12px;color:#9ca3af;text-align:center;">버튼이 작동하지 않으면 아래 링크를 브라우저에 붙여넣으세요:</p>
    <p style="font-size:11px;color:#6b7280;word-break:break-all;text-align:center;">${confirmationUrl}</p>
  </div>
  <div style="padding:24px;background:${design.footerBg};border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">${design.footerText}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} 김비서. All rights reserved.</p>
  </div>
</body>
</html>`;
}

interface AuthEmailTemplatesProps {
  design: EmailDesign;
}

export default function AuthEmailTemplates({ design }: AuthEmailTemplatesProps) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewType, setPreviewType] = useState<AuthEmailType>("signup");

  const handleSaveDesign = async () => {
    try {
      setSaving(true);

      // site_settings에 auth_email_design 저장 (upsert)
      const designToSave = {
        headerTitle: design.headerTitle,
        headerSubtitle: design.headerSubtitle,
        headerBg: design.headerBg,
        headerTextColor: design.headerTextColor,
        bodyBg: design.bodyBg,
        bodyTextColor: design.bodyTextColor,
        ctaBg: design.ctaBg,
        ctaTextColor: design.ctaTextColor,
        footerBg: design.footerBg,
        footerText: design.footerText,
      };

      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "auth_email_design")
        .single();

      if (existing) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: designToSave as any, updated_at: new Date().toISOString() })
          .eq("key", "auth_email_design");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key: "auth_email_design", value: designToSave as any, description: "인증 이메일 디자인 설정" });
        if (error) throw error;
      }

      setSaved(true);
      toast.success("인증 이메일 디자인이 저장되었습니다. 이제 회원가입/비밀번호 재설정 시 이 디자인이 적용됩니다.");
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error("Save auth design error:", error);
      toast.error("디자인 저장에 실패했습니다: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 안내 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-3">
          <p className="text-sm text-foreground">
            <strong>디자인 탭</strong>에서 설정한 헤더, 색상, 푸터가 인증 이메일에 자동 적용됩니다.
            디자인을 수정한 후 아래 <strong>"인증 메일에 적용"</strong> 버튼을 눌러 저장하세요.
          </p>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <Button
        onClick={handleSaveDesign}
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 저장 중...</>
        ) : saved ? (
          <><Check className="w-4 h-4 mr-2" /> 저장 완료!</>
        ) : (
          <><Save className="w-4 h-4 mr-2" /> 현재 디자인을 인증 메일에 적용</>
        )}
      </Button>

      {/* 이메일 유형 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">인증 이메일 유형</CardTitle>
          <CardDescription>
            각 유형을 클릭하면 현재 디자인이 적용된 미리보기를 확인할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {AUTH_EMAIL_TYPES.map((emailType) => (
            <div
              key={emailType.id}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                previewType === emailType.id
                  ? "border-primary bg-primary/5"
                  : "bg-card hover:bg-muted/50"
              }`}
              onClick={() => setPreviewType(emailType.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  previewType === emailType.id ? "bg-primary/20" : "bg-primary/10"
                }`}>
                  <emailType.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{emailType.label}</p>
                  <p className="text-xs text-muted-foreground">{emailType.description}</p>
                </div>
              </div>
              {previewType === emailType.id && (
                <Badge variant="default" className="text-xs">
                  <Eye className="w-3 h-3 mr-1" /> 미리보기
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 미리보기 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            미리보기: {AUTH_EMAIL_TYPES.find((t) => t.id === previewType)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="border rounded-lg overflow-hidden shadow-sm mx-auto" style={{ maxWidth: 500 }}>
            <div
              dangerouslySetInnerHTML={{
                __html: buildAuthPreviewHtml(design, previewType),
              }}
              className="bg-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Supabase 설정 안내 */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <ExternalLink className="w-4 h-4 text-amber-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Supabase Auth Hook 설정 필요</p>
              <p className="text-xs text-muted-foreground">
                Supabase 대시보드 → Authentication → Hooks에서 "Send Email" hook을
                <code className="mx-1 px-1 py-0.5 bg-muted rounded text-[11px]">auth-email-hook</code>
                엣지 함수로 연결해주세요.
              </p>
              <Button variant="outline" size="sm" className="mt-2 gap-2" asChild>
                <a
                  href="https://supabase.com/dashboard/project/kuxpsfxkumbfuqsvcucx/auth/hooks"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3" />
                  Auth Hook 설정 열기
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
