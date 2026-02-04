import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Building2, 
  CreditCard, 
  Landmark, 
  CheckCircle2, 
  ArrowRight,
  ArrowLeft,
  Shield,
  Loader2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboarding, type OnboardingStep } from "@/hooks/useOnboarding";
import { CardConnectionFlow } from "@/components/onboarding/CardConnectionFlow";
import { AccountConnectionFlow } from "@/components/onboarding/AccountConnectionFlow";
import { BusinessNumberModal } from "@/components/onboarding/BusinessNumberModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const characterImg = "/images/icc-5.webp";

// 이미지 프리로딩 함수
const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

// 앱 시작 시 캐릭터 이미지 미리 로드
if (typeof window !== 'undefined') {
  preloadImage(characterImg);
}

const steps: { key: OnboardingStep; title: string; icon: typeof Building2 }[] = [
  { key: "welcome", title: "시작", icon: Building2 },
  { key: "hometax", title: "국세청", icon: Building2 },
  { key: "card", title: "카드", icon: CreditCard },
  { key: "account", title: "계좌", icon: Landmark },
  { key: "complete", title: "완료", icon: CheckCircle2 },
];

const stepIndex = (step: OnboardingStep) => steps.findIndex((s) => s.key === step);

export default function Onboarding() {
  const navigate = useNavigate();
  const { currentStep, connections, goToStep, connectService, completeOnboarding, resetOnboarding } = useOnboarding();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCardFlow, setShowCardFlow] = useState(false);
  const [showAccountFlow, setShowAccountFlow] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [businessNumber, setBusinessNumber] = useState(""); // 설정에서 가져온 사업자등록번호
  const [showBusinessNumberModal, setShowBusinessNumberModal] = useState(false); // 사업자등록번호 입력 모달
  
  // 페이지 진입 시 DB에서 연결 상태 확인 후 로컬 상태에 반영
  useEffect(() => {
    const loadConnectionStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoadingStatus(false);
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("hometax_connected, card_connected, account_connected, business_registration_number")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          // DB 상태를 로컬 상태에 동기화
          if (profile.hometax_connected) connectService("hometax");
          if (profile.card_connected) connectService("card");
          if (profile.account_connected) connectService("account");
          
          // 저장된 사업자등록번호가 있으면 자동으로 채우기
          if (profile.business_registration_number) {
            setBusinessNumber(profile.business_registration_number);
          }
        }
      } catch (err) {
        console.error("Failed to load connection status:", err);
      } finally {
        setIsLoadingStatus(false);
      }
    };

    goToStep("welcome");
    loadConnectionStatus();
  }, []);
  
  const currentIdx = stepIndex(currentStep);

  // DB에 연결 상태 저장
  const saveConnectionToDb = async (service: "hometax" | "card" | "account") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const columnMap = {
      hometax: { connected: "hometax_connected", connectedAt: "hometax_connected_at" },
      card: { connected: "card_connected", connectedAt: "card_connected_at" },
      account: { connected: "account_connected", connectedAt: "account_connected_at" },
    };

    const columns = columnMap[service];
    await supabase
      .from("profiles")
      .update({
        [columns.connected]: true,
        [columns.connectedAt]: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  };

  // 사업자등록번호가 설정되어 있는지 확인 후 연동 시작
  const handleHometaxConnectClick = () => {
    if (!businessNumber) {
      // 설정에 사업자등록번호가 없으면 모달 띄우기
      setShowBusinessNumberModal(true);
    } else {
      // 있으면 바로 연동 진행
      handleHometaxConnect(businessNumber);
    }
  };

  // 모달에서 저장 완료 후 콜백
  const handleBusinessNumberSaved = (savedNumber: string) => {
    setBusinessNumber(savedNumber);
    setShowBusinessNumberModal(false);
    // 저장 후 바로 연동 진행
    handleHometaxConnect(savedNumber);
  };

  const handleHometaxConnect = async (inputBusinessNumber: string) => {
    // 로그인 상태 체크
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    // 사업자등록번호 검증
    const cleanedNumber = inputBusinessNumber.replace(/\D/g, "");
    if (cleanedNumber.length !== 10) {
      toast.error("사업자등록번호 10자리를 입력해주세요.");
      return;
    }

    setIsConnecting(true);
    setConnectionResult(null);
    
    try {
      console.log("Calling codef-hometax API with:", cleanedNumber);
      
      const { data, error } = await supabase.functions.invoke("codef-hometax", {
        body: { businessNumber: cleanedNumber },
      });
      
      if (error) {
        console.error("Codef API error:", error);
        toast.error("홈택스 연동 실패: " + error.message);
        setConnectionResult({ success: false, error: error.message });
        return;
      }
      
      console.log("Codef API response:", data);
      setConnectionResult(data);
      
      if (data?.success) {
        toast.success("홈택스 연동 성공!");
        connectService("hometax");
        
        // 연결 상태만 업데이트 (사업자번호는 이미 저장됨)
        await supabase
          .from("profiles")
          .update({
            hometax_connected: true,
            hometax_connected_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } else {
        toast.error("홈택스 연동 실패: " + (data?.message || "알 수 없는 오류"));
      }
    } catch (err) {
      console.error("Connection error:", err);
      toast.error("연동 중 오류가 발생했습니다.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async (service: "hometax" | "card" | "account") => {
    // 로그인 상태 체크
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    setIsConnecting(true);
    setConnectionResult(null);
    
    try {
      // 카드/계좌는 아직 모의 연결
      await new Promise((r) => setTimeout(r, 1500));
      connectService(service);
      await saveConnectionToDb(service);
      toast.success(`${service === "card" ? "카드" : "계좌"} 연동 완료 (모의)`);
    } catch (err) {
      console.error("Connection error:", err);
      toast.error("연동 중 오류가 발생했습니다.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleNext = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx < steps.length) {
      goToStep(steps[nextIdx].key);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleCardConnect = async () => {
    // 로그인 상태 체크
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    setShowCardFlow(true);
  };

  const handleCardFlowComplete = () => {
    connectService("card");
    setShowCardFlow(false);
    handleNext();
  };

  const handleCardFlowBack = () => {
    setShowCardFlow(false);
  };

  const handleAccountConnect = async () => {
    // 로그인 상태 체크
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    setShowAccountFlow(true);
  };

  const handleAccountFlowComplete = () => {
    connectService("account");
    setShowAccountFlow(false);
    handleNext();
  };

  const handleAccountFlowBack = () => {
    setShowAccountFlow(false);
  };

  const handleComplete = () => {
    completeOnboarding();
    navigate("/");
  };

  const handleExit = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-primary/3 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Header with navigation */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground gap-1.5 -ml-2"
          onClick={handleExit}
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">대시보드</span>
        </Button>
        
        {/* Minimal step indicator */}
        <div className="flex items-center gap-1.5">
          {steps.map((step, idx) => (
            <motion.div
              key={step.key}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                idx === currentIdx 
                  ? "w-6 bg-primary" 
                  : idx < currentIdx 
                    ? "w-1.5 bg-primary/40" 
                    : "w-1.5 bg-muted-foreground/20"
              )}
              initial={false}
              animate={{ 
                width: idx === currentIdx ? 24 : 6,
                opacity: idx <= currentIdx ? 1 : 0.5
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground -mr-2"
          onClick={handleExit}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm relative z-10"
        >
          {currentStep === "welcome" && (
            <WelcomeStep onNext={handleNext} />
          )}
          {currentStep === "hometax" && (
            <HometaxStep
              isConnected={connections.hometax}
              isConnecting={isConnecting}
              businessNumber={businessNumber}
              onConnect={handleHometaxConnectClick}
              onNext={handleNext}
              onSkip={handleSkip}
              connectionResult={connectionResult}
            />
          )}
          {currentStep === "card" && !showCardFlow && (
            <ConnectionStep
              title="카드 연결"
              description="사업자 카드를 연동하면 지출 내역이 자동으로 분류됩니다."
              icon={CreditCard}
              isConnected={connections.card}
              isConnecting={isConnecting}
              onConnect={handleCardConnect}
              onNext={handleNext}
              onSkip={handleSkip}
              stepNumber={2}
              totalSteps={3}
            />
          )}
          {currentStep === "card" && showCardFlow && (
            <motion.div 
              className="bg-card rounded-2xl p-6 shadow-sm border"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <CardConnectionFlow 
                onComplete={handleCardFlowComplete}
                onBack={handleCardFlowBack}
              />
            </motion.div>
          )}
          {currentStep === "account" && !showAccountFlow && (
            <ConnectionStep
              title="계좌 연결"
              description="사업용 계좌를 연동하면 자금 흐름을 실시간으로 파악합니다."
              icon={Landmark}
              isConnected={connections.account}
              isConnecting={isConnecting}
              onConnect={handleAccountConnect}
              onNext={handleNext}
              onSkip={handleSkip}
              stepNumber={3}
              totalSteps={3}
            />
          )}
          {currentStep === "account" && showAccountFlow && (
            <motion.div 
              className="bg-card rounded-2xl p-6 shadow-sm border"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <AccountConnectionFlow 
                onComplete={handleAccountFlowComplete}
                onBack={handleAccountFlowBack}
              />
            </motion.div>
          )}
          {currentStep === "complete" && (
            <CompleteStep onComplete={handleComplete} connections={connections} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* 사업자등록번호 입력 모달 */}
      <BusinessNumberModal
        open={showBusinessNumberModal}
        onClose={() => setShowBusinessNumberModal(false)}
        onSaved={handleBusinessNumberSaved}
      />
    </div>
  );
}

// Welcome Step with character
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-4">
      {/* Character with speech bubble - both animate together */}
      <motion.div 
        className="flex flex-col items-center pt-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
      >
        <div className="relative">
          {/* Floating animation wrapper for both bubble and character */}
          <motion.div
            className="flex flex-col items-center"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Speech bubble */}
            <motion.div
              className="relative bg-primary text-primary-foreground px-4 py-2 rounded-2xl mb-1 shadow-md"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <span className="text-sm font-medium whitespace-nowrap">연동을 시작해 주세요!</span>
              {/* Centered pointed bubble tail */}
              <div 
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
                style={{
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '8px solid hsl(var(--primary))',
                }}
              />
            </motion.div>
            
            {/* Character image - preloaded with high priority */}
            <img 
              src={characterImg}
              alt="찰떡이" 
              className="w-20 h-20 object-contain drop-shadow-lg"
              loading="eager"
              decoding="async"
              fetchPriority="high"
            />
          </motion.div>
          
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl -z-10 scale-125" />
        </div>
      </motion.div>

      {/* Text content */}
      <motion.div 
        className="space-y-3 -mt-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          데이터 연동 설정
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
          사업 데이터를 연결하면<br />
          김비서가 더 정확하게 도와드려요
        </p>
      </motion.div>

      {/* Features - minimal style */}
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {[
          "매출·지출 자동 정리",
          "세금·급여 분리 관리", 
          "AI 경영 인사이트"
        ].map((feature, idx) => (
          <motion.div 
            key={feature}
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + idx * 0.1, duration: 0.3 }}
          >
            <div className="w-1 h-1 rounded-full bg-primary" />
            <span>{feature}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Button onClick={onNext} size="lg" className="w-full gap-2 h-12 text-base">
          시작하기
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}

// 사업자등록번호 포맷팅
const formatBusinessNumber = (value: string) => {
  const cleaned = value.replace(/\D/g, "").slice(0, 10);
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
};

// Hometax Step - 설정에서 가져온 사업자등록번호 사용
function HometaxStep({
  isConnected,
  isConnecting,
  businessNumber,
  onConnect,
  onNext,
  onSkip,
  connectionResult,
}: {
  isConnected: boolean;
  isConnecting: boolean;
  businessNumber: string;
  onConnect: () => void;
  onNext: () => void;
  onSkip: () => void;
  connectionResult?: any;
}) {
  const hasBusinessNumber = businessNumber.replace(/\D/g, "").length === 10;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
          1 / 3
        </span>
      </motion.div>

      {/* Icon */}
      <motion.div 
        className="flex justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className={cn(
          "h-20 w-20 rounded-2xl flex items-center justify-center transition-all duration-300",
          isConnected 
            ? "bg-green-500/10" 
            : "bg-primary/10"
        )}>
          {isConnected ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </motion.div>
          ) : (
            <Building2 className="h-10 w-10 text-primary" />
          )}
        </div>
      </motion.div>

      {/* Text content */}
      <motion.div 
        className="text-center space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h2 className="text-xl font-bold tracking-tight text-foreground">국세청 연결</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
          {hasBusinessNumber 
            ? "등록된 사업자등록번호로 홈택스 데이터를 연동합니다."
            : "사업자등록번호를 입력하면 홈택스 데이터를 자동으로 연동합니다."
          }
        </p>
      </motion.div>

      {/* 사업자등록번호 표시 (있을 경우) */}
      {!isConnected && hasBusinessNumber && (
        <motion.div 
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
        >
          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <div className="text-xs text-muted-foreground mb-1">사업자등록번호</div>
            <div className="font-mono text-lg tracking-wider text-foreground">
              {formatBusinessNumber(businessNumber)}
            </div>
          </div>
        </motion.div>
      )}

      {/* Connection Result */}
      {connectionResult && (
        <motion.div 
          className={cn(
            "rounded-xl p-4 text-center",
            connectionResult.success ? "bg-green-500/10" : "bg-destructive/10"
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          {connectionResult.success ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">사업자 정보 확인 완료!</span>
              </div>
              <div className="bg-background rounded-lg p-3 border space-y-1.5">
                <div className="text-sm text-foreground font-medium">
                  {connectionResult.data?.businessStatus?.replace(/\n/g, " ") || "사업자 정보가 정상적으로 확인되었습니다."}
                </div>
                <div className="text-xs text-muted-foreground">
                  {connectionResult.data?.taxationTypeDesc}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-sm font-medium text-destructive">
                연동에 실패했습니다
              </div>
              <div className="text-xs text-muted-foreground">
                {connectionResult.error || connectionResult.message || "잠시 후 다시 시도해주세요."}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Actions */}
      <motion.div 
        className="space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        {isConnected ? (
          <Button onClick={onNext} size="lg" className="w-full gap-2 h-12">
            다음으로
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button 
              onClick={onConnect} 
              size="lg" 
              className="w-full gap-2 h-12"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  연동 중...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  {hasBusinessNumber ? "연동하기" : "사업자등록번호 입력"}
                </>
              )}
            </Button>
            <Button 
              onClick={onSkip} 
              variant="ghost" 
              size="sm" 
              className="w-full text-muted-foreground"
              disabled={isConnecting}
            >
              나중에 하기
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}

// Connection Step - minimal style
function ConnectionStep({
  title,
  description,
  icon: Icon,
  isConnected,
  isConnecting,
  onConnect,
  onNext,
  onSkip,
  stepNumber,
  totalSteps,
  connectionResult,
}: {
  title: string;
  description: string;
  icon: typeof Building2;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onNext: () => void;
  onSkip: () => void;
  stepNumber: number;
  totalSteps: number;
  connectionResult?: any;
}) {
  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <span className="text-xs text-muted-foreground font-medium tracking-wider uppercase">
          {stepNumber} / {totalSteps}
        </span>
      </motion.div>

      {/* Icon */}
      <motion.div 
        className="flex justify-center"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className={cn(
          "h-20 w-20 rounded-2xl flex items-center justify-center transition-all duration-300",
          isConnected 
            ? "bg-green-500/10" 
            : "bg-primary/10"
        )}>
          {isConnected ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </motion.div>
          ) : (
            <Icon className="h-10 w-10 text-primary" />
          )}
        </div>
      </motion.div>

      {/* Text content */}
      <motion.div 
        className="text-center space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
          {description}
        </p>
      </motion.div>

      {/* API Response Result */}
      {connectionResult && (
        <motion.div 
          className="bg-muted/50 rounded-lg p-4 text-left"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <div className="text-xs font-medium text-muted-foreground mb-2">
            🔗 코드에프 API 응답 (샌드박스)
          </div>
          {connectionResult.success ? (
            <div className="space-y-1.5 text-sm">
              <div className="bg-background rounded p-3 border">
                <div className="font-mono text-xs text-muted-foreground">
                  사업자번호: {connectionResult.data?.businessNumber}
                </div>
                <div className="text-foreground mt-1.5 font-medium">
                  {connectionResult.data?.businessStatus?.replace(/\n/g, " ")}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  과세유형: {connectionResult.data?.taxationTypeDesc}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-destructive text-sm">
              ❌ {connectionResult.error || connectionResult.message}
            </div>
          )}
        </motion.div>
      )}

      {/* Security note */}
      <motion.div 
        className="flex items-center justify-center gap-2 text-xs text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Shield className="h-3.5 w-3.5 text-green-500" />
        <span>256bit SSL 암호화 적용</span>
      </motion.div>

      {/* Actions */}
      <motion.div 
        className="space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        {isConnected ? (
          <Button onClick={onNext} size="lg" className="w-full gap-2 h-12">
            다음
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Button 
              onClick={onConnect} 
              size="lg" 
              className="w-full gap-2 h-12"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  연결 중...
                </>
              ) : (
                "연결하기"
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={onSkip} 
              className="w-full text-muted-foreground h-10"
              disabled={isConnecting}
            >
              나중에 하기
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}

// Complete Step - minimal celebration
function CompleteStep({ 
  onComplete, 
  connections 
}: { 
  onComplete: () => void;
  connections: { hometax: boolean; card: boolean; account: boolean };
}) {
  const connectedCount = Object.values(connections).filter(Boolean).length;
  
  return (
    <div className="text-center space-y-6 pt-8">
      {/* Success icon with animation */}
      <motion.div 
        className="flex justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          {/* Ripple effect - smooth loop */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-green-500"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: [0.4, 0, 0.2, 1],
              repeatDelay: 0.3
            }}
          />
        </div>
      </motion.div>

      {/* Text content */}
      <motion.div 
        className="space-y-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <h2 className="text-xl font-bold tracking-tight text-foreground">설정 완료</h2>
        <p className="text-muted-foreground text-sm">
          {connectedCount > 0 
            ? `${connectedCount}개 서비스가 연결되었습니다` 
            : "언제든 다시 방문해서 연결할 수 있어요"}
        </p>
      </motion.div>

      {/* Connection status - minimal */}
      <motion.div 
        className="space-y-2 py-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {[
          { label: "국세청", connected: connections.hometax },
          { label: "카드", connected: connections.card },
          { label: "계좌", connected: connections.account },
        ].map((item, idx) => (
          <motion.div 
            key={item.label}
            className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-muted/50"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + idx * 0.1 }}
          >
            <span className="text-sm text-foreground">{item.label}</span>
            {item.connected ? (
              <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                연결됨
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">미연결</span>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <Button onClick={onComplete} size="lg" className="w-full gap-2 h-12">
          대시보드로 이동
          <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}
