import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CreditCard,
  Landmark,
  Bike,
  Store,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Shield,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HometaxConnectionFlow } from "./HometaxConnectionFlow";
import { CardConnectionFlow } from "./CardConnectionFlow";
import { AccountConnectionFlow } from "./AccountConnectionFlow";
import { BaeminConnectionFlow } from "./BaeminConnectionFlow";
import { CoupangeatsConnectionFlow } from "./CoupangeatsConnectionFlow";
import { BusinessNumberModal } from "./BusinessNumberModal";
import { supabase } from "@/integrations/supabase/client";
import { useConnection } from "@/contexts/ConnectionContext";
import { toast } from "sonner";

export type ServiceType = "hometax" | "card" | "account" | "baemin" | "coupangeats";

interface ConnectionHubProps {
  open: boolean;
  onClose: () => void;
  onComplete?: () => void;
  /** 특정 서비스로 바로 진입 */
  initialService?: ServiceType | null;
  /** 외부에서 주입하는 연결 상태 */
  connectionStatus?: Partial<Record<ServiceType, boolean>>;
}

interface ServiceItem {
  key: ServiceType;
  label: string;
  description: string;
  icon: typeof Building2;
  connectorId: string;
  category: "essential" | "delivery";
}

const SERVICES: ServiceItem[] = [
  {
    key: "hometax",
    label: "국세청 (홈택스)",
    description: "세금계산서, 부가세 현황",
    icon: Building2,
    connectorId: "codef_hometax_tax_invoice",
    category: "essential",
  },
  {
    key: "card",
    label: "카드 매출",
    description: "여신금융협회 통합 카드매출",
    icon: CreditCard,
    connectorId: "codef_card_usage",
    category: "essential",
  },
  {
    key: "account",
    label: "은행 계좌",
    description: "입출금 내역, 잔액 조회",
    icon: Landmark,
    connectorId: "codef_bank_account",
    category: "essential",
  },
  {
    key: "baemin",
    label: "배달의민족",
    description: "매출, 정산, 리뷰 데이터",
    icon: Bike,
    connectorId: "hyphen_baemin",
    category: "delivery",
  },
  {
    key: "coupangeats",
    label: "쿠팡이츠",
    description: "매출, 정산, 리뷰 데이터",
    icon: Store,
    connectorId: "hyphen_coupangeats",
    category: "delivery",
  },
];

export function ConnectionHub({
  open,
  onClose,
  onComplete,
  initialService = null,
  connectionStatus = {},
}: ConnectionHubProps) {
  const [activeService, setActiveService] = useState<ServiceType | null>(null);

  // Sync initialService when hub opens with a specific service
  useState(() => {
    if (initialService) setActiveService(initialService);
  });

  // When initialService changes externally (e.g. openDrawer("card")), update
  const prevInitial = useState<ServiceType | null>(null);
  if (initialService !== prevInitial[0]) {
    prevInitial[1](initialService);
    if (initialService && open) {
      setActiveService(initialService);
    }
  }
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const { profile } = useConnection();

  // Reset active service when closed
  const handleClose = () => {
    setActiveService(null);
    onClose();
  };

  const handleServiceClick = (service: ServiceType) => {
    if (service === "hometax") {
      // 홈택스는 사업자등록번호 필요
      const bn = profile?.business_registration_number;
      if (!bn || bn.replace(/\D/g, "").length !== 10) {
        setShowBusinessModal(true);
        return;
      }
    }
    setActiveService(service);
  };

  const handleFlowComplete = () => {
    setActiveService(null);
    onComplete?.();
  };

  const handleFlowBack = () => {
    setActiveService(null);
  };

  const handleBusinessNumberSaved = (savedNumber: string) => {
    setShowBusinessModal(false);
    setActiveService("hometax");
  };

  const isConnected = (service: ServiceType) => connectionStatus[service] === true;
  const connectedCount = SERVICES.filter(s => isConnected(s.key)).length;

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div
          initial={{ y: "100%", opacity: 0.5 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          className={cn(
            "bg-background w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl",
            "max-h-[92dvh] sm:max-h-[85vh] flex flex-col",
            "border shadow-2xl"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            {activeService ? (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
                onClick={handleFlowBack}
              >
                <ArrowLeft className="h-4 w-4" />
                뒤로
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">데이터 연동</h2>
                  <p className="text-[11px] text-muted-foreground">
                    {connectedCount > 0
                      ? `${connectedCount}/${SERVICES.length}개 연결됨`
                      : "사업 데이터를 연결해보세요"}
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground -mr-1"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 pb-5">
            <AnimatePresence mode="wait">
              {!activeService ? (
                <motion.div
                  key="hub"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Essential services */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-medium text-muted-foreground px-1 mb-2">
                      필수 연동
                    </h3>
                    {SERVICES.filter(s => s.category === "essential").map((service, idx) => (
                      <ServiceRow
                        key={service.key}
                        service={service}
                        connected={isConnected(service.key)}
                        onClick={() => handleServiceClick(service.key)}
                        index={idx}
                      />
                    ))}
                  </div>

                  {/* Delivery services */}
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-medium text-muted-foreground px-1 mb-2">
                      배달앱 연동
                    </h3>
                    {SERVICES.filter(s => s.category === "delivery").map((service, idx) => (
                      <ServiceRow
                        key={service.key}
                        service={service}
                        connected={isConnected(service.key)}
                        onClick={() => handleServiceClick(service.key)}
                        index={idx + 3}
                      />
                    ))}
                  </div>

                  {/* Security note */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl px-4 py-3">
                    <Shield className="h-4 w-4 text-green-500 shrink-0" />
                    <span>모든 데이터는 256bit SSL 암호화로 안전하게 전송됩니다</span>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={activeService}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeService === "hometax" && (
                    <HometaxConnectionFlow
                      onComplete={handleFlowComplete}
                      onBack={handleFlowBack}
                      isOpen={open}
                    />
                  )}
                  {activeService === "card" && (
                    <CardConnectionFlow
                      onComplete={handleFlowComplete}
                      onBack={handleFlowBack}
                    />
                  )}
                  {activeService === "account" && (
                    <AccountConnectionFlow
                      onComplete={handleFlowComplete}
                      onBack={handleFlowBack}
                    />
                  )}
                  {activeService === "baemin" && (
                    <BaeminConnectionFlow
                      onComplete={handleFlowComplete}
                      onBack={handleFlowBack}
                    />
                  )}
                  {activeService === "coupangeats" && (
                    <CoupangeatsConnectionFlow
                      onComplete={handleFlowComplete}
                      onBack={handleFlowBack}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Business Number Modal */}
      <BusinessNumberModal
        open={showBusinessModal}
        onClose={() => setShowBusinessModal(false)}
        onSaved={handleBusinessNumberSaved}
      />
    </>
  );
}

function ServiceRow({
  service,
  connected,
  onClick,
  index,
}: {
  service: ServiceItem;
  connected: boolean;
  onClick: () => void;
  index: number;
}) {
  const Icon = service.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3.5 rounded-xl transition-all text-left",
        "hover:bg-muted/70 active:scale-[0.98]",
        connected
          ? "bg-green-500/5 border border-green-500/20"
          : "bg-muted/30 border border-transparent hover:border-border"
      )}
    >
      {/* Icon */}
      <div className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
        connected ? "bg-green-500/10" : "bg-primary/10"
      )}>
        {connected ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Icon className="h-5 w-5 text-primary" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{service.label}</span>
          {connected && (
            <span className="text-[10px] font-medium text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded-full">
              연결됨
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
      </div>

      {/* Arrow */}
      <ChevronRight className={cn(
        "h-4 w-4 shrink-0",
        connected ? "text-green-500/50" : "text-muted-foreground/40"
      )} />
    </motion.button>
  );
}
