import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CreditCard,
  Landmark,
  Bike,
  Store,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboarding } from "@/hooks/useOnboarding";
import { ConnectionHub, ServiceType } from "@/components/onboarding/ConnectionHub";
import { supabase } from "@/integrations/supabase/client";
import { useConnection } from "@/contexts/ConnectionContext";
import { useConnectorInstances } from "@/hooks/useConnectors";
import { isCardCompanyConnected, isConnectorConnected } from "@/lib/connectionStatus";

const characterImg = "/images/icc-5.webp";

// 이미지 프리로딩
const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

if (typeof window !== 'undefined') {
  preloadImage(characterImg);
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeOnboarding, setConnections } = useOnboarding();
  const { profile } = useConnection();
  const { data: connectorInstances = [] } = useConnectorInstances();
  const [showHub, setShowHub] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  const secretaryName = profile?.secretary_name || "김비서";

  // 연결 상태 계산
  const connectionStatus = useMemo(() => {
    return {
      hometax: isConnectorConnected(connectorInstances, "codef_hometax_tax_invoice"),
      card: connectorInstances.some(
        (i: any) => i.connector_id === "codef_card_usage" && i.status === "connected"
      ),
      account: isConnectorConnected(connectorInstances, "codef_bank_account"),
      baemin: isConnectorConnected(connectorInstances, "hyphen_baemin"),
      coupangeats: isConnectorConnected(connectorInstances, "hyphen_coupangeats"),
    };
  }, [connectorInstances]);

  const connectedCount = Object.values(connectionStatus).filter(Boolean).length;
  const totalServices = 5;

  // DB에서 상태 로드
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoadingStatus(false);
          return;
        }

        const { data: instances } = await supabase
          .from("connector_instances")
          .select("connector_id, status")
          .eq("user_id", user.id);

        const connectedIds = new Set(
          (instances || []).filter((i: any) => i.status === "connected").map((i: any) => i.connector_id)
        );

        setConnections({
          hometax: connectedIds.has("codef_hometax_tax_invoice"),
          card: (instances || []).some(
            (i: any) =>
              i.connector_id === "codef_card_usage" &&
              i.status === "connected"
          ),
          account: connectedIds.has("codef_bank_account"),
        });
      } catch (err) {
        console.error("Failed to load connection status:", err);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    loadStatus();
  }, []);

  // ?step=card 같은 파라미터로 바로 허브 열기
  useEffect(() => {
    const step = searchParams.get("step") as ServiceType | null;
    if (step && ["hometax", "card", "account", "baemin", "coupangeats"].includes(step)) {
      setShowHub(true);
    }
  }, [searchParams]);

  const handleComplete = () => {
    completeOnboarding();
    navigate("/");
  };

  const handleExit = () => {
    navigate("/");
  };

  const handleHubComplete = () => {
    // 허브에서 연동 완료 시 캐시 자동 갱신됨
  };

  const services = [
    { key: "hometax" as const, label: "국세청", icon: Building2 },
    { key: "card" as const, label: "카드 매출", icon: CreditCard },
    { key: "account" as const, label: "은행 계좌", icon: Landmark },
    { key: "baemin" as const, label: "배달의민족", icon: Bike },
    { key: "coupangeats" as const, label: "쿠팡이츠", icon: Store },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/3 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
          onClick={handleExit}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">대시보드</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground -mr-2"
          onClick={handleExit}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Content */}
      <motion.div
        className="w-full max-w-sm relative z-10 space-y-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Character */}
        <motion.div
          className="flex flex-col items-center"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <motion.div
            className="flex flex-col items-center"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              className="relative bg-primary text-primary-foreground px-4 py-2 rounded-2xl mb-1 shadow-md"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <span className="text-sm font-medium whitespace-nowrap">
                {connectedCount > 0 ? `${connectedCount}개 연결 완료!` : "연동을 시작해 주세요!"}
              </span>
              <div
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '8px solid hsl(var(--primary))',
                }}
              />
            </motion.div>
            <img
              src={characterImg}
              alt="찰떡이"
              className="w-20 h-20 object-contain drop-shadow-lg"
              loading="eager"
              fetchPriority="high"
            />
          </motion.div>
        </motion.div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            데이터 연동 설정
          </h1>
          <p className="text-muted-foreground text-sm">
            사업 데이터를 연결하면 AI 비서가 더 정확하게 도와드려요
          </p>
        </div>

        {/* Connection Status Summary */}
        <div className="space-y-2">
          {services.map((service, idx) => {
            const connected = connectionStatus[service.key];
            const Icon = service.icon;
            return (
              <motion.div
                key={service.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.05 }}
                className={cn(
                  "flex items-center justify-between px-4 py-3 rounded-xl",
                  connected
                    ? "bg-green-500/5 border border-green-500/20"
                    : "bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    connected ? "bg-green-500/10" : "bg-primary/10"
                  )}>
                    {connected ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Icon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{service.label}</span>
                </div>
                {connected ? (
                  <span className="text-xs text-green-600 font-medium">연결됨</span>
                ) : (
                  <span className="text-xs text-muted-foreground">미연결</span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Actions */}
        <motion.div
          className="space-y-3 pt-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button
            onClick={() => setShowHub(true)}
            size="lg"
            className="w-full gap-2 h-12 text-base"
          >
            {connectedCount > 0 ? "연동 관리하기" : "연동 시작하기"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {connectedCount > 0 && (
            <Button
              variant="ghost"
              onClick={handleComplete}
              className="w-full text-muted-foreground h-10"
            >
              대시보드로 이동
            </Button>
          )}
          {connectedCount === 0 && (
            <Button
              variant="ghost"
              onClick={handleExit}
              className="w-full text-muted-foreground h-10"
            >
              나중에 하기
            </Button>
          )}
        </motion.div>
      </motion.div>

      {/* Connection Hub Modal */}
      <ConnectionHub
        open={showHub}
        onClose={() => setShowHub(false)}
        onComplete={handleHubComplete}
        initialService={searchParams.get("step") as ServiceType | null}
        connectionStatus={connectionStatus}
      />
    </div>
  );
}
