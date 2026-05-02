import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Send } from "lucide-react";
import { toast } from "sonner";

interface EmailPreviewDialogProps {
  consultationId: string;
  onSent: () => void;
}

export default function EmailPreviewDialog({ consultationId, onSent }: EmailPreviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [accountantInfo, setAccountantInfo] = useState({ name: "", email: "" });

  const loadPreview = async () => {
    setOpen(true);
    setLoading(true);
    setHtml("");
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
          body: JSON.stringify({ consultationId, preview: true }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHtml(data.html);
      setAccountantInfo({ name: data.accountantName || "", email: data.accountantEmail || "" });
    } catch (e) {
      toast.error((e as Error).message || "미리보기 로드에 실패했습니다");
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
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
      setOpen(false);
      onSent();
    } catch (e) {
      toast.error((e as Error).message || "전달에 실패했습니다");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="text-xs text-muted-foreground"
        onClick={loadPreview}
      >
        <Eye className="h-3.5 w-3.5 mr-1" />
        미리보기
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 pb-2 shrink-0">
            <DialogTitle className="text-base">이메일 미리보기</DialogTitle>
            {accountantInfo.email && (
              <p className="text-xs text-muted-foreground">
                수신: {accountantInfo.name} ({accountantInfo.email})
              </p>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-auto border-y border-border bg-white">
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-40 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-24 rounded-lg" />
              </div>
            ) : (
              <iframe
                srcDoc={html}
                className="w-full h-full min-h-[500px] border-0"
                title="이메일 미리보기"
                sandbox="allow-same-origin"
              />
            )}
          </div>

          <div className="p-4 pt-3 shrink-0 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              닫기
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={sending || loading}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              {sending ? "전달 중..." : "이메일 발송"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
