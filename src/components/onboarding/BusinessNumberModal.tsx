import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// 사업자등록번호 포맷팅
const formatBusinessNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, "").slice(0, 10);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
};

interface BusinessNumberModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (businessNumber: string) => void;
}

export function BusinessNumberModal({ open, onClose, onSaved }: BusinessNumberModalProps) {
  const [businessNumber, setBusinessNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const isValidNumber = businessNumber.replace(/\D/g, "").length === 10;

  const handleSave = async () => {
    if (!isValidNumber) {
      toast.error("사업자등록번호 10자리를 입력해주세요.");
      return;
    }

    const cleanedNumber = businessNumber.replace(/\D/g, "");

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          business_registration_number: cleanedNumber,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("사업자등록번호가 저장되었습니다.");
      onSaved(cleanedNumber);
    } catch (err) {
      console.error("Failed to save business number:", err);
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <motion.div 
            className="flex justify-center mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
          >
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </motion.div>
          <DialogTitle className="text-xl font-bold">사업자등록번호 입력</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            국세청 연동을 위해 사업자등록번호가 필요합니다.
            <br />
            설정에도 함께 저장됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="000-00-00000"
              value={formatBusinessNumber(businessNumber)}
              onChange={(e) => setBusinessNumber(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 rounded-xl border bg-background text-center font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              maxLength={12}
              disabled={isSaving}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              10자리 숫자를 입력하세요
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleSave}
              size="lg"
              className="w-full h-12"
              disabled={isSaving || !isValidNumber}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  저장 중...
                </>
              ) : (
                "저장하고 계속하기"
              )}
            </Button>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              disabled={isSaving}
            >
              나중에 설정하기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
