import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Eye, EyeOff, Store, ShieldCheck, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useConnection } from "@/contexts/ConnectionContext";
import { toast } from "sonner";

type FlowStep = "auth" | "verifying" | "complete";

interface CoupangeatsConnectionFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

export function CoupangeatsConnectionFlow({ onComplete, onBack }: CoupangeatsConnectionFlowProps) {
  const [step, setStep] = useState<FlowStep>("auth");
  const [ceUserId, setCeUserId] = useState("");
  const [ceUserPw, setCeUserPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [storeCount, setStoreCount] = useState(0);
  const { connectService } = useConnection();

  const handleVerify = async () => {
    if (!ceUserId.trim() || !ceUserPw.trim()) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setError("");
    setStep("verifying");

    try {
      // 1. 계정 검증
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "hyphen-coupangeats",
        {
          body: {
            action: "verify",
            userId: ceUserId,
            userPw: ceUserPw,
          },
        }
      );

      if (verifyError || !verifyData?.success) {
        throw new Error(verifyData?.error || "계정 검증에 실패했습니다.");
      }

      // 2. 가게 정보 조회
      const { data: storeData } = await supabase.functions.invoke(
        "hyphen-coupangeats",
        {
          body: {
            action: "store_info",
            userId: ceUserId,
            userPw: ceUserPw,
          },
        }
      );

      const stores = storeData?.data?.data?.storeList || [];
      setStoreCount(stores.length);

      // 3. connector_instance 등록 (credentials_meta에 로그인 정보 저장)
      await connectService("hyphen_coupangeats", `ce_${ceUserId}`, {
        ce_user_id: ceUserId,
        ce_user_pw: ceUserPw,
      });

      // sync는 connectService 내부에서 자동 트리거됨 (중복 호출 제거)

      setStep("complete");
      toast.success("쿠팡이츠 연동 완료!");
    } catch (err) {
      console.error("Coupangeats verify error:", err);
      setError(err instanceof Error ? err.message : "연동에 실패했습니다.");
      setStep("auth");
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {step === "auth" && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-5"
          >
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Store className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">쿠팡이츠 계정 연동</h3>
              <p className="text-sm text-muted-foreground">
                쿠팡이츠 사장님 계정으로 로그인하세요
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ce-user-id">아이디</Label>
                <Input
                  id="ce-user-id"
                  placeholder="쿠팡이츠 아이디"
                  value={ceUserId}
                  onChange={(e) => setCeUserId(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ce-user-pw">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="ce-user-pw"
                    type={showPw ? "text" : "password"}
                    placeholder="쿠팡이츠 비밀번호"
                    value={ceUserPw}
                    onChange={(e) => setCeUserPw(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>로그인 정보는 안전하게 암호화되어 저장됩니다.</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" />
                뒤로
              </Button>
              <Button onClick={handleVerify} className="flex-1">
                연동하기
              </Button>
            </div>
          </motion.div>
        )}

        {step === "verifying" && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-12 space-y-4"
          >
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">계정을 확인하고 있습니다...</p>
          </motion.div>
        )}

        {step === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-8 space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">연동 완료!</h3>
              <p className="text-sm text-muted-foreground">
                쿠팡이츠 {storeCount > 0 ? `${storeCount}개 매장이` : "계정이"} 연동되었습니다.
              </p>
              <p className="text-xs text-muted-foreground">
                매출·정산 데이터가 자동으로 동기화됩니다.
              </p>
            </div>
            <Button onClick={handleComplete} className="w-full">
              완료
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
