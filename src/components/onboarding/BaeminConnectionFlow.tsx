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
  const { connectService } = useConnection();

  const getVerifyStatus = (payload: any): { ok: boolean; message: string } => {
    if (!payload?.success) {
      return { ok: false, message: payload?.error || "API 호출에 실패했습니다." };
    }
    const common = payload?.data?.common;
    const nested = payload?.data?.data;

    // errYn === "Y" → 명시적 에러
    if (common?.errYn === "Y" || nested?.errYn === "Y") {
      const msg = nested?.errMsg || common?.errMsg || "계정 검증에 실패했습니다.";
      return { ok: false, message: msg };
    }

    // errYn === "N" → 명시적 성공
    if (common?.errYn === "N") {
      return { ok: true, message: "" };
    }

    // errYn이 null/빈값 → API가 요청을 처리하지 않음
    return {
      ok: false,
      message: "하이픈 API가 정상 응답하지 않고 있습니다. 하이픈 대시보드에서 배달의민족 상품 구독 상태를 확인해주세요.",
    };
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

      if (verifyError) {
        throw new Error("API 호출에 실패했습니다. 다시 시도해주세요.");
      }

      const verifyStatus = getVerifyStatus(verifyData);
      if (!verifyStatus.ok) {
        throw new Error(verifyStatus.message);
      }

      // 매장 수 확인 (실패해도 연동은 진행)
      let stores: any[] = [];
      try {
        const storeResponse = await supabase.functions.invoke("hyphen-baemin", {
          body: { action: "store_info", userId: bmUserId, userPw: bmUserPw },
        });
        stores = Array.isArray(storeResponse.data?.data?.data?.storeList)
          ? storeResponse.data.data.data.storeList
          : [];
      } catch {
        // 매장 조회 실패해도 연동 진행
      }

      setStoreCount(stores.length);

      const connected = await connectService("hyphen_baemin", `bm_${bmUserId}`, {
        bm_user_id: bmUserId,
        bm_user_pw: bmUserPw,
      });

      if (!connected) {
        throw new Error("연동 정보를 저장하지 못했습니다. 다시 시도해주세요.");
      }

      supabase.functions.invoke("sync-orchestrator", {
        body: { connectorId: "hyphen_baemin" },
      }).catch(err => console.error("Initial baemin sync error:", err));

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
