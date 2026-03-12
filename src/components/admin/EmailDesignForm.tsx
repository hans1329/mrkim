import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Type, MousePointerClick, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DESIGN_TEMPLATES = [
  {
    id: "classic",
    label: "클래식",
    headerBg: "#2563eb",
    headerTextColor: "#ffffff",
    bodyBg: "#ffffff",
    bodyTextColor: "#374151",
    ctaBg: "#2563eb",
    ctaTextColor: "#ffffff",
    footerBg: "#f9fafb",
  },
  {
    id: "dark",
    label: "다크",
    headerBg: "#1f2937",
    headerTextColor: "#f9fafb",
    bodyBg: "#ffffff",
    bodyTextColor: "#1f2937",
    ctaBg: "#1f2937",
    ctaTextColor: "#ffffff",
    footerBg: "#111827",
  },
  {
    id: "warm",
    label: "웜톤",
    headerBg: "#ea580c",
    headerTextColor: "#ffffff",
    bodyBg: "#ffffff",
    bodyTextColor: "#374151",
    ctaBg: "#ea580c",
    ctaTextColor: "#ffffff",
    footerBg: "#fff7ed",
  },
  {
    id: "minimal",
    label: "미니멀",
    headerBg: "#ffffff",
    headerTextColor: "#111827",
    bodyBg: "#ffffff",
    bodyTextColor: "#374151",
    ctaBg: "#111827",
    ctaTextColor: "#ffffff",
    footerBg: "#f9fafb",
  },
];

export interface EmailDesign {
  headerTitle: string;
  headerSubtitle: string;
  body: string;
  ctaEnabled: boolean;
  ctaText: string;
  ctaUrl: string;
  headerBg: string;
  headerTextColor: string;
  bodyBg: string;
  bodyTextColor: string;
  ctaBg: string;
  ctaTextColor: string;
  footerBg: string;
  footerText: string;
}

export const DEFAULT_DESIGN: EmailDesign = {
  headerTitle: "김비서",
  headerSubtitle: "",
  body: "",
  ctaEnabled: false,
  ctaText: "자세히 보기",
  ctaUrl: "https://mrkim.today",
  headerBg: "#2563eb",
  headerTextColor: "#ffffff",
  bodyBg: "#ffffff",
  bodyTextColor: "#374151",
  ctaBg: "#2563eb",
  ctaTextColor: "#ffffff",
  footerBg: "#f9fafb",
  footerText: "이 이메일은 김비서에서 발송되었습니다.",
};

export function buildDesignedEmailHtml(design: EmailDesign): string {
  const ctaBlock = design.ctaEnabled && design.ctaText && design.ctaUrl
    ? `<div style="text-align:center;padding:24px 0 8px;">
        <a href="${design.ctaUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background:${design.ctaBg};color:${design.ctaTextColor};text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">
          ${design.ctaText}
        </a>
      </div>`
    : "";

  const subtitleBlock = design.headerSubtitle
    ? `<p style="margin:8px 0 0;font-size:14px;color:${design.headerTextColor};opacity:0.85;">${design.headerSubtitle}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:600px;margin:0 auto;padding:0;background:#f3f4f6;">
  <div style="background:${design.headerBg};padding:32px 24px;text-align:center;">
    <h1 style="margin:0;font-size:22px;color:${design.headerTextColor};font-weight:700;">${design.headerTitle}</h1>
    ${subtitleBlock}
  </div>
  <div style="padding:32px 24px;background:${design.bodyBg};">
    <div style="font-size:15px;line-height:1.8;color:${design.bodyTextColor};white-space:pre-wrap;">${design.body}</div>
    ${ctaBlock}
  </div>
  <div style="padding:24px;background:${design.footerBg};border-top:1px solid #e5e7eb;text-align:center;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">${design.footerText}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">© ${new Date().getFullYear()} 김비서. All rights reserved.</p>
  </div>
</body>
</html>`;
}

interface EmailDesignFormProps {
  design: EmailDesign;
  onChange: (design: EmailDesign) => void;
}

export default function EmailDesignForm({ design, onChange }: EmailDesignFormProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const update = (partial: Partial<EmailDesign>) => {
    onChange({ ...design, ...partial });
  };

  const applyTemplate = (templateId: string) => {
    const tmpl = DESIGN_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    update({
      headerBg: tmpl.headerBg,
      headerTextColor: tmpl.headerTextColor,
      bodyBg: tmpl.bodyBg,
      bodyTextColor: tmpl.bodyTextColor,
      ctaBg: tmpl.ctaBg,
      ctaTextColor: tmpl.ctaTextColor,
      footerBg: tmpl.footerBg,
    });
  };

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            디자인 템플릿
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            {DESIGN_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => applyTemplate(tmpl.id)}
                className="group rounded-lg border p-2 hover:border-primary/50 transition-all text-center space-y-1.5"
              >
                <div className="flex flex-col rounded overflow-hidden border">
                  <div
                    className="h-4"
                    style={{ background: tmpl.headerBg }}
                  />
                  <div className="h-6 bg-white" />
                  <div
                    className="h-2"
                    style={{ background: tmpl.footerBg }}
                  />
                </div>
                <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground">
                  {tmpl.label}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Header & Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="w-4 h-4" />
            헤더 & 본문
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>헤더 타이틀</Label>
              <Input
                value={design.headerTitle}
                onChange={(e) => update({ headerTitle: e.target.value })}
                placeholder="김비서"
              />
            </div>
            <div className="space-y-2">
              <Label>헤더 서브타이틀 (선택)</Label>
              <Input
                value={design.headerSubtitle}
                onChange={(e) => update({ headerSubtitle: e.target.value })}
                placeholder="서비스 안내"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>본문</Label>
            <Textarea
              value={design.body}
              onChange={(e) => update({ body: e.target.value })}
              rows={8}
              placeholder="이메일 본문을 작성해주세요..."
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label>푸터 텍스트</Label>
            <Input
              value={design.footerText}
              onChange={(e) => update({ footerText: e.target.value })}
              placeholder="이 이메일은 김비서에서 발송되었습니다."
            />
          </div>
        </CardContent>
      </Card>

      {/* CTA Button */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MousePointerClick className="w-4 h-4" />
              CTA 버튼
            </span>
            <Switch
              checked={design.ctaEnabled}
              onCheckedChange={(v) => update({ ctaEnabled: v })}
            />
          </CardTitle>
        </CardHeader>
        {design.ctaEnabled && (
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>버튼 텍스트</Label>
                <Input
                  value={design.ctaText}
                  onChange={(e) => update({ ctaText: e.target.value })}
                  placeholder="자세히 보기"
                />
              </div>
              <div className="space-y-2">
                <Label>버튼 링크</Label>
                <Input
                  value={design.ctaUrl}
                  onChange={(e) => update({ ctaUrl: e.target.value })}
                  placeholder="https://mrkim.today"
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Color Customization */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            색상 커스터마이징
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">헤더 배경</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={design.headerBg}
                  onChange={(e) => update({ headerBg: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={design.headerBg}
                  onChange={(e) => update({ headerBg: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">헤더 텍스트</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={design.headerTextColor}
                  onChange={(e) => update({ headerTextColor: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={design.headerTextColor}
                  onChange={(e) => update({ headerTextColor: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">본문 텍스트</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={design.bodyTextColor}
                  onChange={(e) => update({ bodyTextColor: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={design.bodyTextColor}
                  onChange={(e) => update({ bodyTextColor: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            {design.ctaEnabled && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">버튼 배경</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={design.ctaBg}
                      onChange={(e) => update({ ctaBg: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={design.ctaBg}
                      onChange={(e) => update({ ctaBg: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">버튼 텍스트</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={design.ctaTextColor}
                      onChange={(e) => update({ ctaTextColor: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer"
                    />
                    <Input
                      value={design.ctaTextColor}
                      onChange={(e) => update({ ctaTextColor: e.target.value })}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">푸터 배경</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={design.footerBg}
                  onChange={(e) => update({ footerBg: e.target.value })}
                  className="w-8 h-8 rounded border cursor-pointer"
                />
                <Input
                  value={design.footerBg}
                  onChange={(e) => update({ footerBg: e.target.value })}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Button */}
      <Button
        variant="outline"
        onClick={() => setPreviewOpen(true)}
        disabled={!design.body.trim()}
        className="w-full"
      >
        <Eye className="w-4 h-4 mr-2" />
        이메일 미리보기
      </Button>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>이메일 미리보기</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <div
              dangerouslySetInnerHTML={{ __html: buildDesignedEmailHtml(design) }}
              className="bg-white"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
