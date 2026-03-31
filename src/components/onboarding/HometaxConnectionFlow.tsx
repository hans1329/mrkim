import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConnection } from "@/contexts/ConnectionContext";

import iconKakao from "@/assets/icon-kakao.png";
import iconNaver from "@/assets/icon-naver.png";
import iconPass from "@/assets/icon-pass.png";
import iconToss from "@/assets/icon-toss.png";

// 사업자등록번호 포맷팅
const formatBusinessNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, "").slice(0, 10);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
};

// 간편인증 수단 정의
const AUTH_METHODS = [
  { id: "kakao", label: "카카오", icon: iconKakao },
  { id: "naver", label: "네이버", icon: iconNaver },
  { id: "pass", label: "PASS", icon: iconPass },
  { id: "toss", label: "토스", icon: iconToss },
];

interface HometaxConnectionFlowProps {
  onComplete: () => void;
  onBack: () => void;
  isOpen?: boolean;
}

interface BusinessInfo {
  businessNumber: string;
  businessStatus: string;
  taxationType: string;
  taxationTypeDesc: string;
  businessName?: string;
  businessType?: string;
}

interface TwoWayInfo {
  jobId: string;
  threadId: string;
  jti: string;
  twoWayTimestamp: string;
}

type Step =
  | "already"
  | "input"
  | "verifying"
  | "confirmed"
  | "auth_select"
  | "auth_waiting"
  | "auth_complete";

export function HometaxConnectionFlow({
  onComplete,
  onBack,
  isOpen,
}: HometaxConnectionFlowProps) {
  const {
    refetch: refetchProfile,
    connectService,
    hometaxConnected,
    profile,
  } = useConnection();

  const [step, setStep] = useState<Step>("input");
  const [businessNumber, setBusinessNumber] = useState("");
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAuth, setSelectedAuth] = useState<string | null>(null);
  const [twoWayInfo, setTwoWayInfo] = useState<TwoWayInfo | null>(null);
  const [authTimer, setAuthTimer] = useState(120);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [birthDate, setBirthDate] = useState("");

  const formatBirthDate = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 8);
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6)}`;
  };

  const hasVerifiedBusinessInfo = Boolean(
    businessInfo?.businessStatus || businessInfo?.taxationTypeDesc
  );

  // 드로워가 열릴 때마다 실제 connectedId 존재 여부 재확인
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    const checkConnectedId = async () => {
      setIsInitializing(true);
      setError(null);
      setSelectedAuth(null);
      setTwoWayInfo(null);
      setAuthTimer(120);
      setBirthDate("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) {
            setConnectedId(null);
            setBusinessInfo(null);
            setBusinessNumber("");
            setStep("input");
          }
          return;
        }

        const { data } = await supabase
          .from("connector_instances")
          .select("connected_id")
          .eq("user_id", user.id)
          .eq("connector_id", "codef_hometax_tax_invoice")
          .eq("status", "connected")
          .maybeSingle();

        if (cancelled) return;

        if (data?.connected_id) {
          setConnectedId(data.connected_id);
          setStep("already");
          return;
        }

        setConnectedId(null);

        if (profile?.business_registration_number) {
          const normalizedBusinessNumber = profile.business_registration_number.replace(/\D/g, "");

          setBusinessNumber(normalizedBusinessNumber);
          setBusinessInfo({
            businessNumber: normalizedBusinessNumber,
            businessStatus: "",
            taxationType: "",
            taxationTypeDesc: "",
            businessName: profile.business_name || undefined,
            businessType: profile.business_type || undefined,
          });
          setStep("auth_select");
          return;
        }

        setBusinessInfo(null);
        setBusinessNumber("");
        setStep("input");
      } catch (err) {
        console.error("Failed to initialize hometax drawer:", err);
        if (!cancelled) {
          setBusinessInfo(null);
          setConnectedId(null);
          setStep("input");
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    };

    void checkConnectedId();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    profile?.business_name,
    profile?.business_registration_number,
    profile?.business_type,
  ]);

  const isValidNumber = businessNumber.replace(/\D/g, "").length === 10;

  // 간편인증 타이머
  useEffect(() => {
    if (step !== "auth_waiting") return;
    if (authTimer <= 0) {
      setError("인증 시간이 초과되었습니다. 다시 시도해주세요.");
      setStep("auth_select");
      return;
    }
    const timer = setTimeout(() => setAuthTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, authTimer]);

  // Step 1: 사업자번호 조회
  const handleVerify = async () => {
    if (!isValidNumber) {
      toast.error("사업자등록번호 10자리를 입력해주세요.");
      return;
    }

    setStep("verifying");
    setError(null);

    try {
      const cleanedNumber = businessNumber.replace(/\D/g, "");
      const { data, error: funcError } = await supabase.functions.invoke(
        "codef-hometax",
        { body: { businessNumber: cleanedNumber } }
      );

      if (funcError) throw funcError;

      if (!data.success) {
        setError(data.error || data.message || "조회에 실패했습니다.");
        setStep("input");
        return;
      }

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

  // Step 2: 간편인증 요청
  const handleStartAuth = async () => {
    if (!selectedAuth || !businessInfo) return;

    // 핸드폰 번호 확인
    const userPhone = profile?.phone || profile?.secretary_phone;
    if (!userPhone) {
      setError("간편인증을 위해 프로필에 휴대폰 번호를 먼저 등록해주세요. (설정 > 김비서 설정에서 등록 가능)");
      return;
    }

    // 이름 확인
    if (!profile?.name) {
      setError("간편인증을 위해 프로필에 이름을 먼저 등록해주세요.");
      return;
    }

    // 생년월일 확인
    const cleanedBirth = birthDate.replace(/\D/g, "");
    if (cleanedBirth.length !== 8) {
      setError("생년월일 8자리를 입력해주세요. (예: 19850101)");
      return;
    }

    setStep("auth_waiting");
    setAuthTimer(120);
    setError(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke(
        "codef-hometax",
        {
          body: {
            action: "register",
            businessNumber: businessInfo.businessNumber,
            authMethod: selectedAuth,
            userName: profile.name,
            phoneNo: userPhone,
            birthDate: cleanedBirth,
          },
        }
      );

      if (funcError) throw funcError;

      if (data.status === "2way_required") {
        setTwoWayInfo(data.twoWayInfo);
        // 자동 확인 폴링 시작은 하지 않음 - 사용자가 "인증 완료" 버튼 누르면 확인
        return;
      }

      if (data.status === "completed") {
        setConnectedId(data.connectedId);
        setStep("auth_complete");
        return;
      }

      const errorMsg = data.error || "인증 요청에 실패했습니다.";
      setError(errorMsg);
      setStep("auth_select");
    } catch (err) {
      console.error("Auth request error:", err);
      setError(`간편인증 요청 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
      setStep("auth_select");
    }
  };

  // Step 3: 2-way 인증 확인
  const handleConfirm2Way = useCallback(async () => {
    if (!twoWayInfo || !selectedAuth || !businessInfo) return;

    try {
      const { data, error: funcError } = await supabase.functions.invoke(
        "codef-hometax",
        {
          body: {
            action: "confirm2Way",
            businessNumber: businessInfo.businessNumber,
            authMethod: selectedAuth,
            twoWayInfo,
            userName: profile?.name || "",
            phoneNo: profile?.phone || profile?.secretary_phone || "",
            birthDate: birthDate.replace(/\D/g, ""),
          },
        }
      );

      if (funcError) throw funcError;

      if (data.status === "completed") {
        setConnectedId(data.connectedId);
        setStep("auth_complete");
        return;
      }

      if (data.status === "2way_required") {
        toast.info("아직 인증이 완료되지 않았습니다. 휴대폰을 확인해주세요.");
        return;
      }

      setError(data.error || "인증 확인에 실패했습니다.");
      setStep("auth_select");
    } catch (err) {
      console.error("2-way confirm error:", err);
      setError("인증 확인 중 오류가 발생했습니다.");
      setStep("auth_select");
    }
  }, [twoWayInfo, selectedAuth, businessInfo]);

  // 최종 완료: connectedId 저장
  const handleComplete = async () => {
    if (!businessInfo) return;

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      // 프로필에 사업자 정보 저장
      await supabase
        .from("profiles")
        .update({
          business_registration_number: businessInfo.businessNumber,
          business_name: businessInfo.businessName || null,
          business_type: businessInfo.businessType || null,
        })
        .eq("user_id", user.id);

      // connector_instances에 연동 상태 저장
      await connectService("codef_hometax_tax_invoice", connectedId || undefined);

      toast.success(
        connectedId
          ? "홈택스가 연결되었습니다. 세금계산서를 자동으로 동기화합니다."
          : "홈택스가 연결되었습니다."
      );
      refetchProfile();
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
        <Button
          variant="ghost"
          size="icon"
          onClick={
            step === "auth_select"
              ? hasVerifiedBusinessInfo
                ? () => setStep("confirmed")
                : onBack
              : step === "auth_waiting"
              ? () => setStep("auth_select")
              : onBack
          }
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold">국세청 연결</h2>
          <p className="text-sm text-muted-foreground">
            {step === "auth_select" || step === "auth_waiting"
              ? "간편인증으로 세금계산서를 연동합니다"
              : "사업자등록번호로 연동합니다"}
          </p>
        </div>
      </div>

      {isInitializing ? (
        <div className="space-y-4">
          <div className="flex justify-center mb-2">
            <Skeleton className="h-14 w-14 rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 mx-auto" />
            <Skeleton className="h-4 w-56 mx-auto" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      ) : (
        <>

      {/* Step: Already connected */}
      {step === "already" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="text-center mb-2">
            <p className="text-lg font-bold">이미 연동되어 있습니다</p>
            <p className="text-sm text-muted-foreground">
              국세청 연동이 완료된 상태입니다
            </p>
          </div>

          {profile?.business_registration_number && (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              {profile.business_name && (
                <InfoRow
                  label="사업장명"
                  value={profile.business_name}
                  highlight
                />
              )}
              <InfoRow
                label="사업자등록번호"
                value={formatBusinessNumber(
                  profile.business_registration_number
                )}
              />
              {profile.business_type && (
                <InfoRow label="업종" value={profile.business_type} />
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={onBack} size="lg" className="w-full">
              확인
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep("input")}
              className="text-muted-foreground"
            >
              다른 사업자번호로 재연동
            </Button>
          </div>
        </motion.div>
      )}

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
              onChange={(e) =>
                setBusinessNumber(e.target.value.replace(/\D/g, ""))
              }
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

      {/* Step: Confirmed - 사업자 정보 확인 + 간편인증 선택 */}
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
            <p className="text-sm text-muted-foreground">
              아래 정보가 맞는지 확인해주세요
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            {businessInfo.businessName && (
              <InfoRow
                label="사업장명"
                value={businessInfo.businessName}
                highlight
              />
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
              onClick={() => setStep("auth_select")}
              size="lg"
              className="w-full gap-2"
            >
              <ShieldCheck className="h-4 w-4" />
              간편인증으로 세금계산서 연동
            </Button>
            <Button
              onClick={handleComplete}
              variant="outline"
              size="lg"
              className="w-full"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  저장 중...
                </>
              ) : (
                "사업자 정보만 저장 (세금계산서 연동 건너뛰기)"
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

      {/* Step: Auth Select - 간편인증 수단 선택 */}
      {step === "auth_select" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {AUTH_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedAuth(method.id)}
                className={cn(
                  "p-4 rounded-xl border-2 text-center transition-all",
                  selectedAuth === method.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                )}
              >
                <img src={method.icon} alt={method.label} className="w-8 h-8 mx-auto mb-1 rounded-lg" loading="lazy" width={32} height={32} />
                <span className="text-sm font-medium">{method.label}</span>
              </button>
            ))}
          </div>

          {/* 생년월일 입력 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">생년월일</label>
            <input
              type="text"
              placeholder="1985-01-01"
              value={formatBirthDate(birthDate)}
              onChange={(e) => setBirthDate(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 rounded-xl border bg-background text-center font-mono text-base tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              maxLength={10}
              inputMode="numeric"
            />
            <p className="text-xs text-muted-foreground text-center">8자리 숫자를 입력하세요 (예: 19850101)</p>
          </div>

          <Button
            onClick={handleStartAuth}
            size="lg"
            className="w-full"
            disabled={!selectedAuth || birthDate.replace(/\D/g, "").length !== 8}
          >
            인증 요청
          </Button>
        </motion.div>
      )}

      {/* Step: Auth Waiting - 간편인증 대기 */}
      {step === "auth_waiting" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center relative">
              <Smartphone className="h-8 w-8 text-primary" />
              <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary animate-pulse" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-lg font-bold">휴대폰에서 인증해주세요</p>
            <p className="text-sm text-muted-foreground">
              {AUTH_METHODS.find((m) => m.id === selectedAuth)?.label} 앱에서
              인증 요청을 확인해주세요
            </p>
          </div>

          {/* 타이머 */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50">
              <div
                className={cn(
                  "text-2xl font-mono font-bold",
                  authTimer <= 30 ? "text-destructive" : "text-foreground"
                )}
              >
                {Math.floor(authTimer / 60)}:
                {String(authTimer % 60).padStart(2, "0")}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={handleConfirm2Way}
              size="lg"
              className="w-full"
            >
              인증 완료 확인
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep("auth_select");
                setTwoWayInfo(null);
              }}
              className="text-muted-foreground"
            >
              다시 시도
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step: Auth Complete */}
      {step === "auth_complete" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="flex justify-center mb-2">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>

          <div className="text-center mb-4">
            <p className="text-lg font-bold">인증 완료!</p>
            <p className="text-sm text-muted-foreground">
              홈택스 세금계산서 연동이 준비되었습니다
            </p>
          </div>

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
        </motion.div>
      )}
        </>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", highlight && "text-primary")}>
        {value}
      </span>
    </div>
  );
}
