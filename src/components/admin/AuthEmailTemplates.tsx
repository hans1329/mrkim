import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, Check, Mail, KeyRound, UserPlus, MailCheck, Loader2, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type EmailDesign } from "./EmailDesignForm";

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

interface TemplateContent {
  heading: string;
  body: string;
  ctaText: string;
}

const DEFAULT_TEMPLATE_CONTENT: Record<AuthEmailType, TemplateContent> = {
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

function buildAuthPreviewHtml(design: EmailDesign, content: TemplateContent): string {
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
  const [editingType, setEditingType] = useState<AuthEmailType | null>(null);
  const [templateContent, setTemplateContent] = useState<Record<AuthEmailType, TemplateContent>>(
    () => ({ ...DEFAULT_TEMPLATE_CONTENT })
  );

  // DB에서 저장된 컨텐츠 불러오기
  useEffect(() => {
    const loadSavedContent = async () => {
      try {
        const { data } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "auth_email_content")
          .single();

        if (data?.value && typeof data.value === "object") {
          const saved = data.value as unknown as Record<string, TemplateContent>;
          setTemplateContent((prev) => {
            const merged = { ...prev };
            for (const key of Object.keys(merged) as AuthEmailType[]) {
              if (saved[key]) {
                merged[key] = { ...merged[key], ...saved[key] };
              }
            }
            return merged;
          });
        }
      } catch {
        // 저장된 데이터 없으면 기본값 사용
      }
    };
    loadSavedContent();
  }, []);

  const updateContent = (type: AuthEmailType, partial: Partial<TemplateContent>) => {
    setTemplateContent((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...partial },
    }));
  };

  const handleSaveDesign = async () => {
    try {
      setSaving(true);

      // 1. 디자인 저장
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

      const { data: existingDesign } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "auth_email_design")
        .single();

      if (existingDesign) {
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

      // 2. 컨텐츠 저장
      const { data: existingContent } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", "auth_email_content")
        .single();

      if (existingContent) {
        const { error } = await supabase
          .from("site_settings")
          .update({ value: templateContent as any, updated_at: new Date().toISOString() })
          .eq("key", "auth_email_content");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("site_settings")
          .insert({ key: "auth_email_content", value: templateContent as any, description: "인증 이메일 컨텐츠 설정" });
        if (error) throw error;
      }

      setSaved(true);
      setEditingType(null);
      toast.success("인증 이메일 디자인과 컨텐츠가 저장되었습니다.");
      setTimeout(() => setSaved(false), 3000);
    } catch (error: any) {
      console.error("Save auth design error:", error);
      toast.error("저장에 실패했습니다: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const currentContent = templateContent[previewType];

  return (
    <div className="space-y-4">
      {/* 안내 */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-3">
          <p className="text-sm text-foreground">
            <strong>디자인 탭</strong>에서 설정한 헤더, 색상, 푸터가 인증 이메일에 자동 적용됩니다.
            각 유형의 <Pencil className="w-3 h-3 inline mx-0.5" /> 버튼으로 제목/본문/버튼 텍스트를 수정할 수 있습니다.
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
          <><Save className="w-4 h-4 mr-2" /> 현재 디자인 + 컨텐츠를 인증 메일에 적용</>
        )}
      </Button>

      {/* 이메일 유형 목록 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">인증 이메일 유형</CardTitle>
          <CardDescription>
            유형을 클릭하여 미리보기, 편집 버튼으로 내용을 수정할 수 있습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {AUTH_EMAIL_TYPES.map((emailType) => (
            <div key={emailType.id}>
              <div
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingType(editingType === emailType.id ? null : emailType.id);
                      setPreviewType(emailType.id);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  {previewType === emailType.id && (
                    <Badge variant="default" className="text-xs">
                      <Eye className="w-3 h-3 mr-1" /> 미리보기
                    </Badge>
                  )}
                </div>
              </div>

              {/* 인라인 편집 폼 */}
              {editingType === emailType.id && (
                <div className="mt-2 ml-12 mr-2 p-4 rounded-lg border bg-muted/30 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">제목 (헤더 서브타이틀)</Label>
                    <Input
                      value={templateContent[emailType.id].heading}
                      onChange={(e) => updateContent(emailType.id, { heading: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">본문</Label>
                    <Textarea
                      value={templateContent[emailType.id].body}
                      onChange={(e) => updateContent(emailType.id, { body: e.target.value })}
                      rows={4}
                      className="text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">버튼 텍스트</Label>
                    <Input
                      value={templateContent[emailType.id].ctaText}
                      onChange={(e) => updateContent(emailType.id, { ctaText: e.target.value })}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
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
                __html: buildAuthPreviewHtml(design, currentContent),
              }}
              className="bg-white"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
