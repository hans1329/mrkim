import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Eye, EyeOff, Bike, ShieldCheck, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useConnection } from "@/contexts/ConnectionContext";
import { toast } from "sonner";

type FlowStep = "auth" | "verifying" | "complete";

interface BaeminConnectionFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

export function BaeminConnectionFlow({ onComplete, onBack }: BaeminConnectionFlowProps) {
  const [step, setStep] = useState<FlowStep>("auth");
  const [bmUserId, setBmUserId] = useState("");
  const [bmUserPw, setBmUserPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [storeCount, setStoreCount] = useState(0);
  const { connectService, connectorInstances } = useConnection();

  const hasHyphenError = (payload: any) => {
    if (!payload?.success) return true;
    const common = payload?.data?.common;
    const nested = payload?.data?.data;
    return common?.errYn === "Y" || nested?.errYn === "Y";
  };

  const getHyphenErrorMessage = (payload: any, fallback: string) => {
    const nested = payload?.data?.data;
    const common = payload?.data?.common;
    return nested?.errMsg || common?.errMsg || payload?.error || fallback;
  };

  const hasMeaningfulValue = (value: unknown): boolean => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number" || typeof value === "boolean") return true;
    if (Array.isArray(value)) return value.some(hasMeaningfulValue);
    if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasMeaningfulValue);
    return false;
  };

  const hasMeaningfulProbeData = (payload: any) => {
    const result = payload?.data?.data;
    if (!result || typeof result !== "object") return false;

    return Object.entries(result as Record<string, unknown>).some(([key, value]) => {
      if (key === "errYn" || key === "errMsg") return false;
      if (key === "storeList") return Array.isArray(value) && value.length > 0;
      return hasMeaningfulValue(value);
    });
  };

  const getStoreListFromPayload = (payload: any): any[] => {
    const storeList = payload?.data?.data?.storeList;
    return Array.isArray(storeList) ? storeList : [];
  };

  const hasStoredCredentialMatch = (userId: string, userPw: string) => {
    return connectorInstances.some((instance) => {
      if (instance.connector_id !== "hyphen_baemin") return false;
      if (instance.status !== "connected" && instance.status !== "disconnected") return false;
      const meta = (instance.credentials_meta ?? {}) as Record<string, unknown>;
      return meta.bm_user_id === userId && meta.bm_user_pw === userPw;
    });
  };

  const handleVerify = async () => {
    if (!bmUserId.trim() || !bmUserPw.trim()) {
      setError("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    setError("");
    setStep("verifying");

    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "hyphen-baemin",
        {
          body: {
            action: "verify",
            userId: bmUserId,
            userPw: bmUserPw,
          },
        }
      );

      if (verifyError || hasHyphenError(verifyData)) {
        throw new Error(getHyphenErrorMessage(verifyData, "계정 검증에 실패했습니다. 아이디/비밀번호를 확인해주세요."));
      }

      const probeActions = ["store_info", "my_store", "account_info"] as const;
      const probeResults = await Promise.allSettled(
        probeActions.map((action) =>
          supabase.functions.invoke("hyphen-baemin", {
            body: {
              action,
              userId: bmUserId,
              userPw: bmUserPw,
            },
          })
        )
      );

      const successfulProbes = probeResults
        .filter((result): result is PromiseFulfilledResult<{ data: any; error: unknown }> => result.status === "fulfilled")
        .map((result) => result.value)
        .filter(({ error, data }) => !error && !hasHyphenError(data));

      const hasVerifiedAccess = successfulProbes.some(({ data }) => hasMeaningfulProbeData(data));
      if (!hasVerifiedAccess && !hasStoredCredentialMatch(bmUserId, bmUserPw)) {
        throw new Error("배달의민족 계정을 확인할 수 없습니다. 아이디/비밀번호를 다시 확인해주세요.");
      }

      const stores = successfulProbes.flatMap(({ data }) => getStoreListFromPayload(data));
      setStoreCount(stores.length);

      const connected = await connectService("hyphen_baemin", `bm_${bmUserId}`, {
        bm_user_id: bmUserId,
        bm_user_pw: bmUserPw,
      });

      if (!connected) {
        throw new Error("연동 정보를 저장하지 못했습니다. 다시 시도해주세요.");
      }

      // sync는 connectService 내부에서 자동 트리거됨 (중복 호출 제거)

      setStep("complete");
      toast.success("배달의민족 연동 완료!");
    } catch (err) {
      console.error("Baemin verify error:", err);
      setError(err instanceof Error ? err.message : "연동에 실패했습니다.");
      setStep("auth");
    }
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
                <Bike className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg">배달의민족 계정 연동</h3>
              <p className="text-sm text-muted-foreground">
                배달의민족 사장님 계정으로 로그인하세요
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bm-user-id">아이디</Label>
                <Input
                  id="bm-user-id"
                  placeholder="배달의민족 아이디"
                  value={bmUserId}
                  onChange={(e) => setBmUserId(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bm-user-pw">비밀번호</Label>
                <div className="relative">
                  <Input
                    id="bm-user-pw"
                    type={showPw ? "text" : "password"}
                    placeholder="배달의민족 비밀번호"
                    value={bmUserPw}
                    onChange={(e) => setBmUserPw(e.target.value)}
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
                배달의민족 {storeCount > 0 ? `${storeCount}개 매장이` : "계정이"} 연동되었습니다.
              </p>
              <p className="text-xs text-muted-foreground">
                매출·정산 데이터가 자동으로 동기화됩니다.
              </p>
            </div>
            <Button onClick={onComplete} className="w-full">
              완료
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
