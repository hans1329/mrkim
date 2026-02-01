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
import characterImg from "@/assets/icc.webp";

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
  const { currentStep, connections, goToStep, connectService, completeOnboarding } = useOnboarding();
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCardFlow, setShowCardFlow] = useState(false);
  
  // 페이지 진입 시 항상 첫 단계부터 시작
  useEffect(() => {
    goToStep("welcome");
  }, []);
  
  const currentIdx = stepIndex(currentStep);

  const handleConnect = async (service: "hometax" | "card" | "account") => {
    setIsConnecting(true);
    await new Promise((r) => setTimeout(r, 1500));
    connectService(service);
    setIsConnecting(false);
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

  const handleCardConnect = () => {
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
            <ConnectionStep
              title="국세청 연결"
              description="홈택스 데이터를 연동하면 매출과 세금 현황을 자동으로 가져옵니다."
              icon={Building2}
              isConnected={connections.hometax}
              isConnecting={isConnecting}
              onConnect={() => handleConnect("hometax")}
              onNext={handleNext}
              onSkip={handleSkip}
              stepNumber={1}
              totalSteps={3}
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
          {currentStep === "account" && (
            <ConnectionStep
              title="계좌 연결"
              description="사업용 계좌를 연동하면 자금 흐름을 실시간으로 파악합니다."
              icon={Landmark}
              isConnected={connections.account}
              isConnecting={isConnecting}
              onConnect={() => handleConnect("account")}
              onNext={handleNext}
              onSkip={handleSkip}
              stepNumber={3}
              totalSteps={3}
            />
          )}
          {currentStep === "complete" && (
            <CompleteStep onComplete={handleComplete} connections={connections} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Welcome Step with character
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      {/* Character with subtle animation */}
      <motion.div 
        className="flex justify-center pt-6"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
      >
        <div className="relative">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <img 
              src={`${characterImg}?v=${Date.now()}`} 
              alt="찰떡이" 
              className="w-20 h-20 object-contain drop-shadow-lg"
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
}) {
  return (
    <div className="space-y-8">
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
    <div className="text-center space-y-8">
      {/* Success icon with animation */}
      <motion.div 
        className="flex justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/20">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          {/* Ripple effect */}
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-green-500"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
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
