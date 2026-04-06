import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Upload,
  FileCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useConnection } from "@/contexts/ConnectionContext";

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
  isOpen?: boolean;
  showHeader?: boolean;
}

interface BusinessInfo {
  businessNumber: string;
  businessStatus: string;
  taxationType: string;
  taxationTypeDesc: string;
  businessName?: string;
  businessType?: string;
}

type Step =
  | "already"
  | "input"
  | "verifying"
  | "confirmed"
  | "cert_upload"
  | "registering"
  | "auth_complete";

export function HometaxConnectionFlow({
  onComplete,
  onBack,
  isOpen,
  showHeader = true,
}: HometaxConnectionFlowProps) {
  const {
    refetch: refetchProfile,
    connectService,
    profile,
  } = useConnection();

  const [step, setStep] = useState<Step>("input");
  const [businessNumber, setBusinessNumber] = useState("");
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [connectedId, setConnectedId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // 공동인증서 관련
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);

  const isDerMode = certFile?.name.toLowerCase().endsWith(".der");

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
      setCertFile(null);
      setCertPassword("");

      try {
        const { data: { user } } = await supabase.auth.getUser();

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
          setStep("cert_upload");
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

    return () => { cancelled = true; };
  }, [isOpen, profile?.business_name, profile?.business_registration_number, profile?.business_type]);

  const isValidNumber = businessNumber.replace(/\D/g, "").length === 10;

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

  // 인증서 파일 → Base64 변환
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:...;base64, 부분 제거
        const base64 = result.split(",")[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Step 2: 공동인증서로 등록
  const handleCertRegister = async () => {
    if (!certFile || !certPassword || !businessInfo) return;
    if (isDerMode && !keyFile) return;
    setStep("registering");
    setError(null);

    try {
      const certFileBase64 = await fileToBase64(certFile);
      let keyFileBase64: string | undefined;
      if (keyFile) {
        keyFileBase64 = await fileToBase64(keyFile);
      }

      const { data, error: funcError } = await supabase.functions.invoke(
        "codef-hometax",
        {
          body: {
            action: "register",
            businessNumber: businessInfo.businessNumber,
            certFileBase64,
            certPassword,
            keyFileBase64,
          },
        }
      );

      if (funcError) throw funcError;

      if (data.status === "completed") {
        setConnectedId(data.connectedId);
        setStep("auth_complete");
        return;
      }

      const errorMsg = data.error || "인증서 등록에 실패했습니다.";
      setError(errorMsg);
      setStep("cert_upload");
    } catch (err) {
      console.error("Cert register error:", err);
      setError(`인증서 등록 중 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`);
      setStep("cert_upload");
    }
  };

  // 최종 완료: connectedId 저장
  const handleComplete = async () => {
    if (!businessInfo) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      await supabase
        .from("profiles")
        .update({
          business_registration_number: businessInfo.businessNumber,
          business_name: businessInfo.businessName || null,
          business_type: businessInfo.businessType || null,
        })
        .eq("user_id", user.id);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.toLowerCase();
      if (ext.endsWith(".pfx") || ext.endsWith(".p12")) {
        setCertFile(file);
        setKeyFile(null);
        setError(null);
      } else if (ext.endsWith(".der")) {
        setCertFile(file);
        setError(null);
      } else {
        toast.error("PFX, P12 또는 DER 형식의 인증서 파일만 지원합니다.");
        return;
      }
    }
  };

  const handleKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.toLowerCase().endsWith(".key")) {
        setKeyFile(file);
      } else {
        toast.error("signPri.key 파일만 업로드 가능합니다.");
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    return `${(bytes / 1024).toFixed(1)}KB`;
  };

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={
              step === "cert_upload"
                ? hasVerifiedBusinessInfo
                  ? () => setStep("confirmed")
                  : onBack
                : onBack
            }
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-lg font-bold">국세청 연결</h2>
            <p className="text-sm text-muted-foreground">
              {step === "cert_upload" || step === "registering"
                ? "공동인증서로 세금계산서를 연동합니다"
                : "사업자등록번호로 연동합니다"}
            </p>
          </div>
        </div>
      )}

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
                <p className="text-sm text-muted-foreground">국세청 연동이 완료된 상태입니다</p>
              </div>
              {profile?.business_registration_number && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  {profile.business_name && (
                    <InfoRow label="사업장명" value={profile.business_name} highlight />
                  )}
                  <InfoRow label="사업자등록번호" value={formatBusinessNumber(profile.business_registration_number)} />
                  {profile.business_type && (
                    <InfoRow label="업종" value={profile.business_type} />
                  )}
                </div>
              )}
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={onBack} size="lg" className="w-full">확인</Button>
                <Button variant="ghost" size="sm" onClick={() => setStep("input")} className="text-muted-foreground">
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
                  onChange={(e) => setBusinessNumber(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 rounded-xl border bg-background text-center font-mono text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  maxLength={12}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">10자리 숫자를 입력하세요</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button onClick={handleVerify} size="lg" className="w-full" disabled={!isValidNumber}>
                조회하기
              </Button>
            </motion.div>
          )}

          {/* Step: Verifying */}
          {step === "verifying" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <p className="font-medium">사업자 정보 조회 중...</p>
                <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
              </div>
            </motion.div>
          )}

          {/* Step: Confirmed - 사업자 정보 확인 */}
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
                <InfoRow label="사업자등록번호" value={formatBusinessNumber(businessInfo.businessNumber)} />
                <InfoRow label="사업자 상태" value={businessInfo.businessStatus} />
                {businessInfo.businessType && (
                  <InfoRow label="업종" value={businessInfo.businessType} />
                )}
                <InfoRow label="과세유형" value={businessInfo.taxationTypeDesc} />
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => setStep("cert_upload")} size="lg" className="w-full gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  공동인증서로 세금계산서 연동
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
                  onClick={() => { setStep("input"); setBusinessInfo(null); }}
                  disabled={isSaving}
                  className="text-muted-foreground"
                >
                  다시 입력하기
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step: Certificate Upload - 공동인증서 업로드 */}
          {step === "cert_upload" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* 아이콘 + 타이틀 */}
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShieldCheck className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-lg font-bold">공동인증서 등록</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    세금계산서 자동 수집을 위해<br />
                    공동인증서(구 공인인증서)를 등록해주세요
                  </p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* 인증서 파일 업로드 영역 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">인증서 파일</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pfx,.p12,.der"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed transition-all text-left",
                    certFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                >
                  {certFile ? (
                    <>
                      <FileCheck className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{certFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          인증서 등록 완료 · {formatFileSize(certFile.size)}
                        </p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full py-4 gap-2">
                      <Upload className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">인증서 파일 (.pfx, .p12 또는 signCert.der)</p>
                    </div>
                  )}
                </button>
              </div>

              {/* DER 모드일 때 key 파일 업로드 */}
              {isDerMode && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">개인키 파일</label>
                  <input
                    ref={keyFileInputRef}
                    type="file"
                    accept=".key"
                    onChange={handleKeyFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => keyFileInputRef.current?.click()}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed transition-all text-left",
                      keyFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    {keyFile ? (
                      <>
                        <FileCheck className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{keyFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            개인키 등록 완료 · {formatFileSize(keyFile.size)}
                          </p>
                        </div>
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      </>
                    ) : (
                      <div className="flex items-center justify-center w-full py-4 gap-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">signPri.key 파일 업로드</p>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {/* 인증서 비밀번호 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">인증서 비밀번호</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="인증서 비밀번호를 입력하세요"
                    value={certPassword}
                    onChange={(e) => setCertPassword(e.target.value)}
                    disabled={!certFile}
                    className={cn(
                      "w-full px-4 py-3 pr-12 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all",
                      !certFile && "opacity-50 cursor-not-allowed"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={!certFile}
                    className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
                      !certFile && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                onClick={handleCertRegister}
                size="lg"
                className="w-full"
                disabled={!certFile || !certPassword}
              >
                인증서로 연동하기
              </Button>
            </motion.div>
          )}

          {/* Step: Registering */}
          {step === "registering" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <p className="font-medium">인증서 등록 중...</p>
                <p className="text-sm text-muted-foreground">잠시만 기다려주세요</p>
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
                <p className="text-sm text-muted-foreground">홈택스 세금계산서 연동이 준비되었습니다</p>
              </div>
              <Button onClick={handleComplete} size="lg" className="w-full" disabled={isSaving}>
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

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium", highlight && "text-primary")}>{value}</span>
    </div>
  );
}
