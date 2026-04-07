import { useState, useEffect, useCallback } from "react";

function LoadingStepText() {
  const [showAlt, setShowAlt] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => setShowAlt(prev => !prev), 2500);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="text-[10px] text-muted-foreground transition-opacity duration-300">
      {showAlt ? "조금 오래걸려요!" : "수집 중..."}
    </span>
  );
}
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  CreditCard,
  Landmark,
  Truck,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Shield,
  X,
  Sparkles,
  Smartphone,
  Loader2,
  Unlink,
  RefreshCw,
  Package,
  FileText,
  Star,
  BarChart3,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { HometaxConnectionFlow } from "./HometaxConnectionFlow";
import { CardConnectionFlow } from "./CardConnectionFlow";
import { AccountConnectionFlow } from "./AccountConnectionFlow";
import { BaeminConnectionFlow } from "./BaeminConnectionFlow";
import { CoupangeatsConnectionFlow } from "./CoupangeatsConnectionFlow";
import { BusinessNumberModal } from "./BusinessNumberModal";
import { useConnection } from "@/contexts/ConnectionContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const icc5Image = "/images/icc-5.webp";

export type ServiceType = "hometax" | "card" | "account" | "baemin" | "coupangeats";

/** 메인 허브에서 보이는 카테고리 */
type HubCategory = "hometax" | "card" | "account" | "delivery";

/** 배달앱 서브 선택 */
type DeliveryApp = "baemin" | "coupangeats";

interface ConnectionHubProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  initialService?: ServiceType | null;
  connectionStatus?: Partial<Record<ServiceType, boolean>>;
}

interface CategoryItem {
  key: HubCategory;
  label: string;
  description: string;
  icon: typeof Building2;
  connectedKeys: ServiceType[];
}

const CATEGORIES: CategoryItem[] = [
  {
    key: "hometax",
    label: "국세청 (홈택스)",
    description: "세금계산서, 부가세 현황 자동 수집",
    icon: Building2,
    connectedKeys: ["hometax"],
  },
  {
    key: "card",
    label: "카드 매출",
    description: "공동인증서로 카드사별 매출 조회",
    icon: CreditCard,
    connectedKeys: ["card"],
  },
  {
    key: "account",
    label: "은행 계좌",
    description: "입출금 내역, 잔액 실시간 조회",
    icon: Landmark,
    connectedKeys: ["account"],
  },
  {
    key: "delivery",
    label: "배달앱",
    description: "배달의민족, 쿠팡이츠 매출·정산",
    icon: Truck,
    connectedKeys: ["baemin", "coupangeats"],
  },
];

const DELIVERY_APPS: { key: DeliveryApp; label: string; emoji: string }[] = [
  { key: "baemin", label: "배달의민족", emoji: "🏍️" },
  { key: "coupangeats", label: "쿠팡이츠", emoji: "🛵" },
];

type ViewState =
  | { screen: "phone-register" }
  | { screen: "hub" }
  | { screen: "flow"; service: ServiceType }
  | { screen: "delivery-select" };

export function ConnectionHub({
  open,
  onClose,
  onComplete,
  initialService = null,
  connectionStatus = {},
}: ConnectionHubProps) {
  const [view, setView] = useState<ViewState>({ screen: "hub" });
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const { profile, refetch: refetchProfile } = useConnection();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<{ key: HubCategory; label: string } | null>(null);
  const [resyncing, setResyncing] = useState<string | null>(null);
  const [resyncProgress, setResyncProgress] = useState<{
    category: string;
    steps: { label: string; icon: any; status: "pending" | "loading" | "done" | "error"; count?: number }[];
    currentStep: number;
    totalSaved: number;
  } | null>(null);
  const queryClient = useQueryClient();
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  };

  const handleSendCode = async () => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length < 10 || cleaned.length > 11) {
      toast.error("올바른 휴대폰 번호를 입력해주세요.");
      return;
    }
    setIsSendingCode(true);
    try {
      const { data, error } = await supabase.functions.invoke("twilio-verify", {
        body: { action: "send", phone: cleaned },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setIsCodeSent(true);
      toast.success("인증번호가 발송되었습니다");
    } catch (error: any) {
      console.error("SMS 발송 오류:", error);
      toast.error(error?.message || "인증번호 발송에 실패했습니다");
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyAndSave = async () => {
    if (verificationCode.length !== 6) {
      toast.error("6자리 인증번호를 입력해주세요");
      return;
    }
    const cleaned = phoneNumber.replace(/\D/g, "");
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("twilio-verify", {
        body: { action: "verify", phone: cleaned, code: verificationCode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // 인증 성공 → 프로필에 번호 저장
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const e164Phone = cleaned.startsWith("0")
          ? "+82" + cleaned.slice(1)
          : cleaned;
        await supabase
          .from("profiles")
          .update({
            phone: e164Phone,
            secretary_phone: e164Phone,
            secretary_phone_verified: true,
          })
          .eq("user_id", user.id);
      }

      await refetchProfile();
      toast.success("번호가 인증·등록되었습니다!");
      setIsCodeSent(false);
      setVerificationCode("");
      setView({ screen: "hub" });

      // 환영 전화 (비동기, 실패 무시)
      try {
        const secretaryName = profile?.secretary_name || "김비서";
        const ownerName = profile?.name || "사장";
        const script = `안녕하세요, ${ownerName}님. 저는 ${ownerName}님의 AI 비서 ${secretaryName}입니다. 전화번호 인증이 완료되어 인사드립니다. 앞으로 중요한 경영 알림이 있을 때 이 번호로 전화드리겠습니다. 감사합니다.`;
        await supabase.functions.invoke("twilio-outbound-call", {
          body: { recipient_phone: cleaned, recipient_name: ownerName, script, call_type: "welcome" },
        });
        const lastChar = secretaryName.charAt(secretaryName.length - 1);
        const hasBatchim = (lastChar.charCodeAt(0) - 0xAC00) % 28 !== 0;
        toast("📞 환영 전화를 발신합니다", { description: `${secretaryName}${hasBatchim ? "이" : "가"} 잠시 후 전화드립니다` });
      } catch { /* 무시 */ }
    } catch (error: any) {
      console.error("인증 확인 오류:", error);
      toast.error(error?.message || "인증번호 확인에 실패했습니다");
    } finally {
      setIsVerifying(false);
    }
  };

  // Legacy — kept for compatibility but no longer primary
  const handleSavePhone = handleVerifyAndSave;

  // Sync with open/initialService — check phone first
  useEffect(() => {
    if (open) {
      const hasPhone = !!profile?.phone;
      if (!hasPhone && !initialService) {
        setPhoneNumber("");
        setView({ screen: "phone-register" });
      } else if (initialService) {
        setView({ screen: "flow", service: initialService });
      }
    }
    if (!open) {
      setView({ screen: "hub" });
    }
  }, [open, initialService]);

  const handleClose = () => {
    setView({ screen: "hub" });
    onClose();
  };

  const handleCategoryClick = (category: HubCategory) => {
    if (category === "hometax") {
      const bn = profile?.business_registration_number;
      if (!bn || bn.replace(/\D/g, "").length !== 10) {
        setShowBusinessModal(true);
        return;
      }
      setView({ screen: "flow", service: "hometax" });
    } else if (category === "card") {
      setView({ screen: "flow", service: "card" });
    } else if (category === "account") {
      setView({ screen: "flow", service: "account" });
    } else if (category === "delivery") {
      setView({ screen: "delivery-select" });
    }
  };

  const handleFlowComplete = () => {
    setView({ screen: "hub" });
    onComplete?.();
  };

  const handleBack = () => {
    if (view.screen === "phone-register") {
      handleClose();
    } else if (view.screen === "flow" && (view.service === "baemin" || view.service === "coupangeats")) {
      setView({ screen: "delivery-select" });
    } else {
      setView({ screen: "hub" });
    }
  };

  const handleBusinessNumberSaved = async () => {
    setShowBusinessModal(false);
    await refetchProfile();
    setView({ screen: "flow", service: "hometax" });
  };

  const isConnected = (key: ServiceType) => connectionStatus[key] === true;
  const connectedCount = Object.values(connectionStatus).filter(Boolean).length;

  const CATEGORY_CONNECTOR_MAP: Record<HubCategory, { connectorId: string; profileField: string; profileAtField: string }[]> = {
    hometax: [{ connectorId: "codef_hometax_tax_invoice", profileField: "hometax_connected", profileAtField: "hometax_connected_at" }],
    card: [{ connectorId: "codef_card_usage", profileField: "card_connected", profileAtField: "card_connected_at" }],
    account: [{ connectorId: "codef_bank_account", profileField: "account_connected", profileAtField: "account_connected_at" }],
    delivery: [
      { connectorId: "hyphen_baemin", profileField: "", profileAtField: "" },
      { connectorId: "hyphen_coupangeats", profileField: "", profileAtField: "" },
    ],
  };

  const handleDisconnect = async (categoryKey: HubCategory) => {
    setDisconnecting(categoryKey);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const mappings = CATEGORY_CONNECTOR_MAP[categoryKey];
      for (const mapping of mappings) {
        await supabase
          .from("connector_instances")
          .update({ status: "disconnected" as any, status_message: "사용자가 연동 해제" })
          .eq("connector_id", mapping.connectorId)
          .eq("user_id", user.id)
          .eq("status", "connected" as any);

        if (mapping.profileField) {
          await supabase
            .from("profiles")
            .update({ [mapping.profileField]: false, [mapping.profileAtField]: null })
            .eq("user_id", user.id);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["connector_instances"] });
      queryClient.invalidateQueries({ queryKey: ["connector-status"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      onComplete?.();
      toast.success("연동이 해제되었습니다");
    } catch (error) {
      console.error("Disconnect error:", error);
      toast.error("연동 해제에 실패했습니다");
    } finally {
      setDisconnecting(null);
      setConfirmDisconnect(null);
    }
  };

  const CATEGORY_RESYNC_CONNECTORS: Record<HubCategory, string[]> = {
    hometax: ["codef_hometax"],
    card: ["crefia"],
    account: ["codef_bank"],
    delivery: ["hyphen_baemin", "hyphen_coupangeats"],
  };

  const DELIVERY_RESYNC_STEPS = [
    { label: "주문 데이터 수집", icon: Package },
    { label: "정산 내역 수집", icon: FileText },
    { label: "리뷰 수집", icon: Star },
    { label: "매출 통계 수집", icon: BarChart3 },
  ];

  const SIMPLE_RESYNC_STEPS: Record<string, { label: string; icon: any }[]> = {
    hometax: [{ label: "세금계산서 수집", icon: FileText }],
    card: [{ label: "카드 매출 수집", icon: CreditCard }],
    account: [{ label: "계좌 내역 수집", icon: Landmark }],
  };

  const handleResync = async (categoryKey: HubCategory) => {
    setResyncing(categoryKey);

    const isDelivery = categoryKey === "delivery";
    const stepDefs = isDelivery ? DELIVERY_RESYNC_STEPS : (SIMPLE_RESYNC_STEPS[categoryKey] || [{ label: "데이터 수집", icon: RefreshCw }]);

    const steps = stepDefs.map(s => ({ ...s, status: "pending" as const }));
    setResyncProgress({ category: categoryKey, steps, currentStep: 0, totalSaved: 0 });

    try {
      const connectorIds = CATEGORY_RESYNC_CONNECTORS[categoryKey];
      let totalSaved = 0;

      if (isDelivery) {
        // 배달앱: 단계별 진행 표시
        for (let i = 0; i < connectorIds.length; i++) {
          // 첫 번째 커넥터 시작 시 모든 스텝을 순차 진행
          const connectorId = connectorIds[i];

          if (i === 0) {
            // 스텝 0: 주문 데이터
            setResyncProgress(prev => prev ? {
              ...prev,
              steps: prev.steps.map((s, idx) => idx === 0 ? { ...s, status: "loading" } : s),
              currentStep: 0,
            } : null);
          }

          const { data, error } = await supabase.functions.invoke("sync-orchestrator", {
            body: { connectorId, forceFullSync: true },
          });

          if (error) throw error;

          const results = data?.results || [];
          const saved = results.reduce((sum: number, r: any) => sum + (r.recordsSaved || 0), 0);
          totalSaved += saved;

          if (i === connectorIds.length - 1) {
            // 마지막 커넥터 완료 시 모든 스텝 완료 처리
            setResyncProgress(prev => prev ? {
              ...prev,
              steps: prev.steps.map(s => ({ ...s, status: "done" as const })),
              currentStep: prev.steps.length,
              totalSaved,
            } : null);
          } else {
            // 중간: 절반 진행
            const midStep = Math.floor(steps.length / 2);
            setResyncProgress(prev => prev ? {
              ...prev,
              steps: prev.steps.map((s, idx) =>
                idx < midStep ? { ...s, status: "done" as const, count: saved } :
                idx === midStep ? { ...s, status: "loading" } : s
              ),
              currentStep: midStep,
              totalSaved,
            } : null);
          }
        }
      } else {
        // 비배달: 단일 스텝
        setResyncProgress(prev => prev ? {
          ...prev,
          steps: prev.steps.map(s => ({ ...s, status: "loading" as const })),
          currentStep: 0,
        } : null);

        for (const connectorId of connectorIds) {
          const { data, error } = await supabase.functions.invoke("sync-orchestrator", {
            body: { connectorId, forceFullSync: true },
          });
          if (error) throw error;
          const saved = data?.results?.reduce((sum: number, r: any) => sum + (r.recordsSaved || 0), 0) || 0;
          totalSaved += saved;
        }

        setResyncProgress(prev => prev ? {
          ...prev,
          steps: prev.steps.map(s => ({ ...s, status: "done" as const })),
          currentStep: prev.steps.length,
          totalSaved,
        } : null);
      }

      // 2초 후 자동 닫기
      setTimeout(() => {
        setResyncProgress(null);
        toast.success(totalSaved > 0 ? `${totalSaved}건 데이터 재수집 완료` : "새로운 데이터가 없습니다");
      }, 2000);
    } catch (err) {
      console.error("Resync error:", err);
      setResyncProgress(prev => prev ? {
        ...prev,
        steps: prev.steps.map(s => s.status === "loading" ? { ...s, status: "error" as const } : s),
      } : null);
      setTimeout(() => {
        setResyncProgress(null);
        toast.error("재수집에 실패했습니다");
      }, 2000);
    } finally {
      setResyncing(null);
    }
  };

  const getHeaderTitle = () => {
    if (view.screen === "phone-register") return "연락처 등록";
    if (view.screen === "hub") return "데이터 연동";
    if (view.screen === "delivery-select") return "배달앱 연동";
    const labels: Record<ServiceType, string> = {
      hometax: "국세청 연동",
      card: "카드 매출 연동",
      account: "은행 계좌 연동",
      baemin: "배달의민족 연동",
      coupangeats: "쿠팡이츠 연동",
    };
    return view.screen === "flow" ? labels[view.service] : "데이터 연동";
  };

  if (!open) return null;

  return (
    <>
      {/* Full-screen drawer overlay */}
      <motion.div
        initial={{ opacity: 0, y: "100%" }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="fixed inset-0 z-50 bg-background flex flex-col"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 h-14 border-b shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="flex items-center gap-2">
            {view.screen !== "hub" ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-1"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
            )}
            <h1 className="text-base font-semibold">{getHeaderTitle()}</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-md w-full mx-auto px-4 py-6">
            <AnimatePresence mode="wait">
              {view.screen === "phone-register" && (
                <motion.div
                  key="phone-register"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center text-center space-y-6 pt-4"
                >
                  {/* Avatar */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, duration: 0.4, type: "spring" }}
                  >
                    <img src={icc5Image} alt="김비서" className="h-16 w-auto object-contain" />
                  </motion.div>

                  {/* Text */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="space-y-1.5"
                  >
                     <h2 className="text-base font-bold text-foreground leading-snug">
                       비서에게<br />
                       연락받을 번호를 알려주세요
                     </h2>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      간편인증 및 중요 알림 수신에 사용됩니다.<br />
                      언제든 설정에서 변경할 수 있어요.
                    </p>
                  </motion.div>

                  {/* Phone input */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="w-full max-w-xs space-y-3"
                   >
                    {!isCodeSent ? (
                      <>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="tel"
                            placeholder="010-0000-0000"
                            value={formatPhone(phoneNumber)}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                            className="pl-10 h-12 text-center text-lg tracking-wider rounded-xl"
                            maxLength={13}
                          />
                        </div>
                        <Button
                          onClick={handleSendCode}
                          disabled={phoneNumber.replace(/\D/g, "").length < 10 || isSendingCode}
                          className="w-full h-12 rounded-xl gap-2 text-base"
                        >
                          {isSendingCode ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                          인증번호 받기
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{formatPhone(phoneNumber)}</span>으로 발송된 인증번호를 입력하세요
                        </p>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="인증번호 6자리"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          className="h-12 text-center text-xl tracking-[0.3em] rounded-xl"
                          maxLength={6}
                          autoFocus
                        />
                        <Button
                          onClick={handleVerifyAndSave}
                          disabled={verificationCode.length !== 6 || isVerifying}
                          className="w-full h-12 rounded-xl gap-2 text-base"
                        >
                          {isVerifying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          인증 완료
                        </Button>
                        <button
                          onClick={() => { setIsCodeSent(false); setVerificationCode(""); }}
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          번호 다시 입력
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => { setView({ screen: "hub" }); setIsCodeSent(false); setVerificationCode(""); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      나중에 등록할게요
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {view.screen === "hub" && (
                <motion.div
                  key="hub"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Title & Status summary */}
                  <div className="text-center space-y-1 pb-1">
                    <h2 className="text-lg font-bold text-foreground">
                      내 사업 데이터 연결하기
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {connectedCount > 0
                        ? `${connectedCount}개 서비스 연결됨`
                        : "연동하면 매출·세금·지출을 한눈에 관리할 수 있어요"}
                    </p>
                  </div>

                  {/* Category list */}
                  <div className="space-y-2.5">
                    {CATEGORIES.map((cat, idx) => {
                      const anyConnected = cat.connectedKeys.some(k => isConnected(k));
                      const allConnected = cat.connectedKeys.every(k => isConnected(k));
                      const connectedSub = cat.connectedKeys.filter(k => isConnected(k)).length;
                      const totalSub = cat.connectedKeys.length;

                      return (
                        <motion.div
                          key={cat.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.06, duration: 0.25 }}
                          className={cn(
                            "w-full rounded-2xl transition-all overflow-hidden",
                            allConnected
                              ? "bg-green-500/5 border border-green-500/20"
                              : anyConnected
                                ? "bg-primary/5 border border-primary/15"
                                : "bg-muted/40 border border-transparent hover:bg-muted/70"
                          )}
                        >
                          <button
                            onClick={() => handleCategoryClick(cat.key)}
                            className="w-full flex items-center gap-3 p-3.5 text-left active:scale-[0.98] transition-transform"
                          >
                            {/* Icon */}
                            <div className={cn(
                              "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
                              allConnected ? "bg-green-500/10" : "bg-primary/10"
                            )}>
                              {allConnected ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <cat.icon className="h-5 w-5 text-primary" />
                              )}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-sm font-semibold text-foreground leading-tight">
                                  {cat.label}
                                </span>
                                {allConnected && (
                                  <span className="text-[10px] font-medium text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full leading-none">
                                    연결됨
                                  </span>
                                )}
                                {anyConnected && !allConnected && totalSub > 1 && (
                                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full leading-none">
                                    {connectedSub}/{totalSub}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                                {cat.description}
                              </p>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          </button>

                          {/* Disconnect button for connected services */}
                          {anyConnected && (
                            <div className="px-3.5 pb-2.5 -mt-1 flex items-center gap-3 ml-14">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResync(cat.key);
                                }}
                                disabled={resyncing === cat.key}
                                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
                              >
                                {resyncing === cat.key ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-3 w-3" />
                                )}
                                재수집
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDisconnect({ key: cat.key, label: cat.label });
                                }}
                                disabled={disconnecting === cat.key}
                                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                              >
                                {disconnecting === cat.key ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Unlink className="h-3 w-3" />
                                )}
                                연동 끊기
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Security note */}
                  <div className="flex items-start gap-2.5 text-[11px] text-muted-foreground bg-muted/50 rounded-xl px-3.5 py-2.5">
                    <Shield className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                    <span>모든 데이터는 256bit SSL 암호화로 안전하게 전송됩니다</span>
                  </div>
                </motion.div>
              )}

              {view.screen === "delivery-select" && (
                <motion.div
                  key="delivery"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  <h2 className="text-lg font-bold text-foreground text-center -mt-1">
                    연동할 배달앱을 선택해주세요
                  </h2>
                  <div className="space-y-2.5">
                    {DELIVERY_APPS.map((app, idx) => {
                      const connected = isConnected(app.key);
                      return (
                        <motion.button
                          key={app.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          onClick={() => setView({ screen: "flow", service: app.key })}
                          className={cn(
                            "w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-left",
                            "active:scale-[0.98]",
                            connected
                              ? "bg-green-500/5 border border-green-500/20"
                              : "bg-muted/40 border border-transparent hover:bg-muted/70"
                          )}
                        >
                          <div className={cn(
                            "h-11 w-11 rounded-xl flex items-center justify-center shrink-0 text-xl",
                            connected ? "bg-green-500/10" : "bg-muted"
                          )}>
                            {connected ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <span>{app.emoji}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="text-[13px] font-semibold text-foreground">{app.label}</span>
                            {connected && (
                              <p className="text-[11px] text-green-600 mt-0.5">연결됨</p>
                            )}
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {view.screen === "flow" && (
                <motion.div
                  key={`flow-${view.service}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {view.service === "hometax" && (
                    <HometaxConnectionFlow
                      onComplete={handleFlowComplete}
                      onBack={handleBack}
                      isOpen={open}
                      showHeader={false}
                    />
                  )}
                  {view.service === "card" && (
                    <CardConnectionFlow
                      onComplete={handleFlowComplete}
                      onBack={handleBack}
                    />
                  )}
                  {view.service === "account" && (
                    <AccountConnectionFlow
                      onComplete={handleFlowComplete}
                      onBack={handleBack}
                    />
                  )}
                  {view.service === "baemin" && (
                    <BaeminConnectionFlow
                      onComplete={handleFlowComplete}
                      onBack={handleBack}
                    />
                  )}
                  {view.service === "coupangeats" && (
                    <CoupangeatsConnectionFlow
                      onComplete={handleFlowComplete}
                      onBack={handleBack}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Disconnect Confirmation */}
      {confirmDisconnect && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-2xl p-5 mx-6 max-w-sm w-full space-y-4 shadow-xl">
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-foreground">연동을 해제할까요?</h3>
              <p className="text-sm text-muted-foreground">
                {confirmDisconnect.label} 연동을 해제하면 관련 데이터 동기화가 중단됩니다.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setConfirmDisconnect(null)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-1"
                disabled={disconnecting === confirmDisconnect.key}
                onClick={() => handleDisconnect(confirmDisconnect.key)}
              >
                {disconnecting === confirmDisconnect.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Unlink className="h-4 w-4" />
                )}
                해제
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Resync Progress Overlay */}
      <AnimatePresence>
        {resyncProgress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-background rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-5"
            >
              <div className="text-center space-y-1">
                <h3 className="text-base font-bold text-foreground">데이터 재수집 중</h3>
                <p className="text-xs text-muted-foreground">잠시만 기다려주세요...</p>
              </div>

              {/* Overall progress bar */}
              <div className="space-y-1.5">
                <Progress
                  value={
                    resyncProgress.steps.length > 0
                      ? (resyncProgress.steps.filter(s => s.status === "done").length / resyncProgress.steps.length) * 100
                      : 0
                  }
                  className="h-2"
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {resyncProgress.steps.filter(s => s.status === "done").length} / {resyncProgress.steps.length} 완료
                </p>
              </div>

              {/* Step list */}
              <div className="space-y-2">
                {resyncProgress.steps.map((step, idx) => {
                  const StepIcon = step.icon;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                        step.status === "done" ? "bg-green-500/5" :
                        step.status === "loading" ? "bg-primary/5" :
                        step.status === "error" ? "bg-destructive/5" :
                        "bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                        step.status === "done" ? "bg-green-500/10" :
                        step.status === "loading" ? "bg-primary/10" :
                        step.status === "error" ? "bg-destructive/10" :
                        "bg-muted/50"
                      )}>
                        {step.status === "loading" ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        ) : step.status === "done" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : step.status === "error" ? (
                          <X className="h-4 w-4 text-destructive" />
                        ) : (
                          <StepIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className={cn(
                        "text-[13px] font-medium flex-1",
                        step.status === "done" ? "text-green-600" :
                        step.status === "loading" ? "text-foreground" :
                        step.status === "error" ? "text-destructive" :
                        "text-muted-foreground"
                      )}>
                        {step.label}
                      </span>
                      {step.status === "loading" && (
                        <LoadingStepText />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Result summary */}
              {resyncProgress.steps.every(s => s.status === "done") && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center pt-1"
                >
                  <p className="text-sm font-semibold text-green-600">
                    ✅ {resyncProgress.totalSaved > 0 ? `${resyncProgress.totalSaved}건 수집 완료!` : "수집 완료 (신규 데이터 없음)"}
                  </p>
                </motion.div>
              )}

              {resyncProgress.steps.some(s => s.status === "error") && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center pt-1"
                >
                  <p className="text-sm font-semibold text-destructive">수집 중 오류가 발생했습니다</p>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Business Number Modal */}
      <BusinessNumberModal
        open={showBusinessModal}
        onClose={() => setShowBusinessModal(false)}
        onSaved={handleBusinessNumberSaved}
      />
    </>
  );
}
