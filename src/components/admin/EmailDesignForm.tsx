import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Palette, MousePointerClick, Eye, ChevronDown, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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

function ColorPicker({ label, value, onUpdate }: { label: string; value: string; onUpdate: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onUpdate(e.target.value)}
          className="w-7 h-7 rounded border cursor-pointer shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onUpdate(e.target.value)}
          className="h-7 text-[10px] font-mono px-1.5"
        />
      </div>
    </div>
  );
}

export default function EmailDesignForm({ design, onChange }: EmailDesignFormProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const update = (partial: Partial<EmailDesign>) => {
    onChange({ ...design, ...partial });
  };

  return (
    <div className="space-y-4">
      {/* Live editable template */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">이메일 디자인</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground h-7"
              onClick={() => onChange({ ...DEFAULT_DESIGN })}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              초기화
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Email preview frame */}
          <div className="mx-4 mb-4 border rounded-lg overflow-hidden shadow-sm" style={{ maxWidth: 480 }}>
            {/* Header section */}
            <div
              className="px-5 py-5 text-center space-y-2"
              style={{ background: design.headerBg }}
            >
              <input
                value={design.headerTitle}
                onChange={(e) => update({ headerTitle: e.target.value })}
                className="w-full text-center text-lg font-bold bg-transparent border-none outline-none focus:ring-1 focus:ring-white/30 rounded px-2 py-1"
                style={{ color: design.headerTextColor }}
                placeholder="헤더 타이틀"
              />
              <input
                value={design.headerSubtitle}
                onChange={(e) => update({ headerSubtitle: e.target.value })}
                className="w-full text-center text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-white/30 rounded px-2 py-0.5 opacity-85"
                style={{ color: design.headerTextColor }}
                placeholder="서브타이틀 (선택)"
              />
            </div>

            {/* Body section */}
            <div className="px-5 py-5" style={{ background: design.bodyBg }}>
              <textarea
                value={design.body}
                onChange={(e) => update({ body: e.target.value })}
                rows={6}
                className="w-full bg-transparent border-none outline-none resize-none focus:ring-1 focus:ring-primary/20 rounded px-1 py-1 text-sm leading-relaxed"
                style={{ color: design.bodyTextColor }}
                placeholder="본문 내용을 여기에 입력하세요..."
              />

              {/* CTA button area */}
              {design.ctaEnabled && (
                <div className="text-center pt-3 pb-1">
                  <div
                    className="inline-flex items-center gap-1 px-6 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ background: design.ctaBg, color: design.ctaTextColor }}
                  >
                    <input
                      value={design.ctaText}
                      onChange={(e) => update({ ctaText: e.target.value })}
                      className="bg-transparent border-none outline-none text-center font-semibold text-sm w-24"
                      style={{ color: design.ctaTextColor }}
                      placeholder="버튼 텍스트"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer section */}
            <div
              className="px-5 py-3 text-center border-t"
              style={{ background: design.footerBg, borderColor: "#e5e7eb" }}
            >
              <input
                value={design.footerText}
                onChange={(e) => update({ footerText: e.target.value })}
                className="w-full text-center text-[11px] bg-transparent border-none outline-none focus:ring-1 focus:ring-primary/20 rounded px-1 py-0.5"
                style={{ color: "#9ca3af" }}
                placeholder="푸터 텍스트"
              />
              <p className="text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>
                © {new Date().getFullYear()} 김비서
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA toggle + URL */}
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
          <CardContent className="pt-0">
            <div className="space-y-2">
              <Label className="text-xs">버튼 링크 URL</Label>
              <Input
                value={design.ctaUrl}
                onChange={(e) => update({ ctaUrl: e.target.value })}
                placeholder="https://mrkim.today"
                className="h-9"
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Collapsible color customization */}
      <Collapsible open={colorOpen} onOpenChange={setColorOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  색상 커스터마이징
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${colorOpen ? "rotate-180" : ""}`} />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <ColorPicker label="헤더 배경" value={design.headerBg} onUpdate={(v) => update({ headerBg: v })} />
                <ColorPicker label="헤더 텍스트" value={design.headerTextColor} onUpdate={(v) => update({ headerTextColor: v })} />
                <ColorPicker label="본문 텍스트" value={design.bodyTextColor} onUpdate={(v) => update({ bodyTextColor: v })} />
                {design.ctaEnabled && (
                  <>
                    <ColorPicker label="버튼 배경" value={design.ctaBg} onUpdate={(v) => update({ ctaBg: v })} />
                    <ColorPicker label="버튼 텍스트" value={design.ctaTextColor} onUpdate={(v) => update({ ctaTextColor: v })} />
                  </>
                )}
                <ColorPicker label="푸터 배경" value={design.footerBg} onUpdate={(v) => update({ footerBg: v })} />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Full preview */}
      <Button
        variant="outline"
        onClick={() => setPreviewOpen(true)}
        disabled={!design.body.trim()}
        className="w-full"
      >
        <Eye className="w-4 h-4 mr-2" />
        실제 이메일 미리보기
      </Button>

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
