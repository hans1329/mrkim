import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Building2, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// 사업자등록번호 포맷팅
const formatBusinessNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, "").slice(0, 10);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
};

interface HometaxConnectionFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

interface BusinessInfo {
  businessNumber: string;
  businessStatus: string;
  taxationType: string;
  taxationTypeDesc: string;
  businessName?: string;
  businessType?: string;
}

export function HometaxConnectionFlow({ onComplete, onBack }: HometaxConnectionFlowProps) {
  const [step, setStep] = useState<"input" | "verifying" | "confirmed">("input");
  const [businessNumber, setBusinessNumber] = useState("");
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isValidNumber = businessNumber.replace(/\D/g, "").length === 10;

  const handleVerify = async () => {
    if (!isValidNumber) {
      toast.error("사업자등록번호 10자리를 입력해주세요.");
      return;
    }

    setStep("verifying");
    setError(null);

    try {
      const cleanedNumber = businessNumber.replace(/\D/g, "");
      
      // CODEF API 호출
      const { data, error: funcError } = await supabase.functions.invoke("codef-hometax", {
        body: { businessNumber: cleanedNumber },
      });

      if (funcError) throw funcError;

      if (!data.success) {
        setError(data.error || data.message || "조회에 실패했습니다.");
        setStep("input");
        return;
      }

      // 사업자 정보 저장
      setBusinessInfo({
        businessNumber: data.data.businessNumber,
        businessStatus: data.data.businessStatus,
        taxationType: data.data.taxationType,
        taxationTypeDesc: data.data.taxationTypeDesc,
        businessName: data.data.businessName,
        businessType: data.data.businessType,
      });
      setStep("confirmed");

    } catch (err) {
      console.error("Hometax verification error:", err);
      setError("사업자 조회 중 오류가 발생했습니다.");
      setStep("input");
    }
  };

  const handleComplete = async () => {
    if (!businessInfo) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      // 프로필 업데이트 - 사업자번호, 사업장명, 업종, 연결상태
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          business_registration_number: businessInfo.businessNumber,
          business_name: businessInfo.businessName || null,
          business_type: businessInfo.businessType || null,
          hometax_connected: true,
          hometax_connected_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast.success("홈택스가 연결되었습니다.");
      onComplete();

    } catch (err) {
      console.error("Failed to save hometax connection:", err);
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">국세청 연결</h2>
          <p className="text-sm text-muted-foreground">사업자등록번호로 연동합니다</p>
        </div>
      </div>

      {/* Step: Input */}
      {step === "input" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">사업자등록번호</label>
            <input
              type="text"
              placeholder="000-00-00000"
              value={formatBusinessNumber(businessNumber)}
              onChange={(e) => setBusinessNumber(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 rounded-xl border bg-background text-center font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              maxLength={12}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-center">
              10자리 숫자를 입력하세요
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={handleVerify}
            size="lg"
            className="w-full"
            disabled={!isValidNumber}
          >
            조회하기
          </Button>
        </motion.div>
      )}

      {/* Step: Verifying */}
      {step === "verifying" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="py-12 text-center space-y-4"
        >
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <div>
            <p className="font-medium">사업자 정보 조회 중...</p>
            <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
          </div>
        </motion.div>
      )}

      {/* Step: Confirmed */}
      {step === "confirmed" && businessInfo && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex justify-center mb-2">
            <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="text-center mb-4">
            <p className="text-lg font-bold">사업자 정보 확인</p>
            <p className="text-sm text-muted-foreground">아래 정보가 맞는지 확인해주세요</p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            {businessInfo.businessName && (
              <InfoRow label="사업장명" value={businessInfo.businessName} highlight />
            )}
            <InfoRow 
              label="사업자등록번호" 
              value={formatBusinessNumber(businessInfo.businessNumber)} 
            />
            <InfoRow label="사업자 상태" value={businessInfo.businessStatus} />
            {businessInfo.businessType && (
              <InfoRow label="업종" value={businessInfo.businessType} />
            )}
            <InfoRow label="과세유형" value={businessInfo.taxationTypeDesc} />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              onClick={handleComplete}
              size="lg"
              className="w-full"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  연결 중...
                </>
              ) : (
                "연결 완료"
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("input");
                setBusinessInfo(null);
              }}
              disabled={isSaving}
              className="text-muted-foreground"
            >
              다시 입력하기
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  highlight = false 
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(
        "font-medium",
        highlight && "text-primary"
      )}>
        {value}
      </span>
    </div>
  );
}
