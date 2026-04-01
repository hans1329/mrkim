import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
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

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  };

  const handleSavePhone = async () => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    if (cleaned.length < 10 || cleaned.length > 11) {
      toast.error("올바른 휴대폰 번호를 입력해주세요.");
      return;
    }
    setIsSavingPhone(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("로그인이 필요합니다."); return; }
      const { error } = await supabase.from("profiles").update({ phone: cleaned }).eq("user_id", user.id);
      if (error) throw error;
      await refetchProfile();
      toast.success("번호가 등록되었습니다!");
      setView({ screen: "hub" });
    } catch (err) {
      console.error("Failed to save phone:", err);
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsSavingPhone(false);
    }
  };

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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
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
                    <div className="relative">
                      <div className="h-28 w-28 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                        <img src={mrKimAvatar} alt="김비서" className="h-full w-full object-cover" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center shadow-md">
                        <Smartphone className="h-4 w-4 text-primary-foreground" />
                      </div>
                    </div>
                  </motion.div>

                  {/* Text */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.3 }}
                    className="space-y-2"
                  >
                    <h2 className="text-xl font-bold text-foreground">
                      비서에게 연락받을 번호를 알려주세요
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
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
                      onClick={handleSavePhone}
                      disabled={phoneNumber.replace(/\D/g, "").length < 10 || isSavingPhone}
                      className="w-full h-12 rounded-xl gap-2 text-base"
                    >
                      {isSavingPhone ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      등록하고 시작하기
                    </Button>
                    <button
                      onClick={() => setView({ screen: "hub" })}
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
                      내 사업 데이터 연동
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {connectedCount > 0
                        ? `${connectedCount}개 서비스 연결됨`
                        : "사업 데이터를 연결해보세요"}
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
                        <motion.button
                          key={cat.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.06, duration: 0.25 }}
                          onClick={() => handleCategoryClick(cat.key)}
                          className={cn(
                            "w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-left",
                            "active:scale-[0.98]",
                            allConnected
                              ? "bg-green-500/5 border border-green-500/20"
                              : anyConnected
                                ? "bg-primary/5 border border-primary/15"
                                : "bg-muted/40 border border-transparent hover:bg-muted/70"
                          )}
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
                        </motion.button>
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

      {/* Business Number Modal */}
      <BusinessNumberModal
        open={showBusinessModal}
        onClose={() => setShowBusinessModal(false)}
        onSaved={handleBusinessNumberSaved}
      />
    </>
  );
}
