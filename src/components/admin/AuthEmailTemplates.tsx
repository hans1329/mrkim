import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ExternalLink, Mail, KeyRound, UserPlus, MailCheck } from "lucide-react";
import { toast } from "sonner";

const AUTH_EMAIL_TYPES = [
  {
    id: "signup",
    label: "회원가입 확인",
    icon: UserPlus,
    description: "새 사용자가 가입할 때 이메일 인증 링크를 보냅니다",
    supabaseKey: "Confirm signup",
    variables: ["{{ .ConfirmationURL }}", "{{ .SiteURL }}"],
  },
  {
    id: "magic_link",
    label: "매직 링크",
    icon: Mail,
    description: "비밀번호 없이 이메일로 로그인 링크를 보냅니다",
    supabaseKey: "Magic Link",
    variables: ["{{ .ConfirmationURL }}", "{{ .SiteURL }}"],
  },
  {
    id: "recovery",
    label: "비밀번호 재설정",
    icon: KeyRound,
    description: "비밀번호 변경을 위한 재설정 링크를 보냅니다",
    supabaseKey: "Reset Password",
    variables: ["{{ .ConfirmationURL }}", "{{ .SiteURL }}"],
  },
  {
    id: "email_change",
    label: "이메일 변경",
    icon: MailCheck,
    description: "이메일 주소 변경 시 확인 링크를 보냅니다",
    supabaseKey: "Change Email Address",
    variables: ["{{ .ConfirmationURL }}", "{{ .SiteURL }}"],
  },
] as const;

type AuthEmailType = typeof AUTH_EMAIL_TYPES[number]["id"];

const TEMPLATE_CONTENT: Record<AuthEmailType, { heading: string; body: string; ctaText: string }> = {
  signup: {
    heading: "가입을 환영합니다! 🎉",
    body: "김비서에 가입해 주셔서 감사합니다.\n\n아래 버튼을 클릭하여 이메일 인증을 완료해주세요.\n인증이 완료되면 김비서의 모든 기능을 이용하실 수 있습니다.",
    ctaText: "이메일 인증하기",
  },
  magic_link: {
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

function buildAuthEmailHtml(type: AuthEmailType): string {
  const content = TEMPLATE_CONTENT[type];

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f3f4f6;">
  <div style="background:#2563eb;padding:32px 24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;color:#ffffff;font-weight:700;">김비서</h1>
    <p style="margin:8px 0 0;font-size:14px;color:#ffffff;opacity:0.85;">${content.heading}</p>
  </div>
  <div style="padding:32px 24px;background:#ffffff;">
    <div style="font-size:15px;line-height:1.8;color:#374151;white-space:pre-wrap;">${content.body}</div>
    <div style="text-align:center;padding:24px 0 8px;">
      <a href="{{ .ConfirmationURL }}" target="_blank" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
        ${content.ctaText}
      </a>
    </div>
    <p style="margin-top:16px;font-size:12px;color:#9ca3af;text-align:center;">버튼이 작동하지 않으면 아래 링크를 브라우저에 붙여넣으세요:</p>
    <p style="font-size:11px;color:#6b7280;word-break:break-all;text-align:center;">{{ .ConfirmationURL }}</p>
  </div>
  <div style="padding:24px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">이 이메일은 김비서에서 자동 발송되었습니다.</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} 김비서. All rights reserved.</p>
  </div>
</body>
</html>`;
}

export default function AuthEmailTemplates() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<AuthEmailType>("signup");

  const handleCopy = async (type: AuthEmailType) => {
    const html = buildAuthEmailHtml(type);
    await navigator.clipboard.writeText(html);
    setCopiedId(type);
    toast.success("HTML 템플릿이 클립보드에 복사되었습니다");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supabase 인증 이메일 템플릿</CardTitle>
          <CardDescription>
            아래 템플릿을 복사한 후, Supabase 대시보드 → Authentication → Email Templates에 붙여넣으세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {AUTH_EMAIL_TYPES.map((emailType) => (
            <div
              key={emailType.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <emailType.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{emailType.label}</p>
                    <Badge variant="outline" className="text-[10px]">{emailType.supabaseKey}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{emailType.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setPreviewType(emailType.id)}
                >
                  미리보기
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => handleCopy(emailType.id)}
                >
                  {copiedId === emailType.id ? (
                    <><Check className="w-3 h-3" /> 복사됨</>
                  ) : (
                    <><Copy className="w-3 h-3" /> HTML 복사</>
                  )}
                </Button>
              </div>
            </div>
          ))}

          <div className="pt-2">
            <Button variant="outline" size="sm" className="w-full gap-2" asChild>
              <a
                href="https://supabase.com/dashboard/project/kuxpsfxkumbfuqsvcucx/auth/templates"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="w-4 h-4" />
                Supabase 이메일 템플릿 설정 열기
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            미리보기: {AUTH_EMAIL_TYPES.find((t) => t.id === previewType)?.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="border rounded-lg overflow-hidden shadow-sm" style={{ maxWidth: 500 }}>
            <div
              dangerouslySetInnerHTML={{
                __html: buildAuthEmailHtml(previewType).replace(
                  /\{\{ \.ConfirmationURL \}\}/g,
                  "https://mrkim.today/auth/confirm?token=example"
                ),
              }}
              className="bg-white"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
