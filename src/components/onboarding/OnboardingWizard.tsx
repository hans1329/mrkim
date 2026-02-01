import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Bot, 
  Building2, 
  CreditCard, 
  Landmark, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  Shield,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OnboardingStep } from "@/hooks/useOnboarding";
import { CardConnectionFlow } from "./CardConnectionFlow";

interface OnboardingWizardProps {
  currentStep: OnboardingStep;
  connections: {
    hometax: boolean;
    card: boolean;
    account: boolean;
  };
  onGoToStep: (step: OnboardingStep) => void;
  onConnect: (service: "hometax" | "card" | "account") => void;
  onComplete: () => void;
}

const steps: { key: OnboardingStep; title: string; icon: typeof Bot }[] = [
  { key: "welcome", title: "환영", icon: Bot },
  { key: "hometax", title: "국세청", icon: Building2 },
  { key: "card", title: "카드", icon: CreditCard },
  { key: "account", title: "계좌", icon: Landmark },
  { key: "complete", title: "완료", icon: CheckCircle2 },
];

const stepIndex = (step: OnboardingStep) => steps.findIndex((s) => s.key === step);

export function OnboardingWizard({
  currentStep,
  connections,
  onGoToStep,
  onConnect,
  onComplete,
}: OnboardingWizardProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showCardFlow, setShowCardFlow] = useState(false);
  const currentIdx = stepIndex(currentStep);
  const progress = ((currentIdx + 1) / steps.length) * 100;

  const handleConnect = async (service: "hometax" | "card" | "account") => {
    setIsConnecting(true);
    // 시뮬레이션: 실제로는 Codef API 연동
    await new Promise((r) => setTimeout(r, 1500));
    onConnect(service);
    setIsConnecting(false);
  };

  const handleNext = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx < steps.length) {
      onGoToStep(steps[nextIdx].key);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleCardConnect = () => {
    setShowCardFlow(true);
  };

  const handleCardFlowComplete = () => {
    onConnect("card");
    setShowCardFlow(false);
    handleNext();
  };

  const handleCardFlowBack = () => {
    setShowCardFlow(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex flex-col items-center justify-center p-4">
      {/* Progress */}
      <div className="w-full max-w-xs mb-6">
        <Progress value={progress} className="h-1.5" />
        <div className="flex justify-between mt-2 px-1">
          {steps.map((step, idx) => (
            <div
              key={step.key}
              className={cn(
                "flex flex-col items-center gap-0.5",
                idx <= currentIdx ? "text-primary" : "text-muted-foreground"
              )}
            >
              <step.icon className="h-3.5 w-3.5" />
              <span className="text-[9px]">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {currentStep === "welcome" && (
            <WelcomeStep onNext={handleNext} />
          )}
          {currentStep === "hometax" && (
            <ConnectionStep
              title="국세청 연결"
              description="홈택스 데이터를 연동하면 매출, 세금계산서, 부가세 현황을 자동으로 가져옵니다."
              icon={Building2}
              isConnected={connections.hometax}
              isConnecting={isConnecting}
              onConnect={() => handleConnect("hometax")}
              onNext={handleNext}
              onSkip={handleSkip}
            />
          )}
          {currentStep === "card" && !showCardFlow && (
            <ConnectionStep
              title="카드 연결"
              description="법인/사업자 카드를 연동하면 지출 내역이 자동 분류되고 비용 관리가 쉬워집니다."
              icon={CreditCard}
              isConnected={connections.card}
              isConnecting={isConnecting}
              onConnect={handleCardConnect}
              onNext={handleNext}
              onSkip={handleSkip}
            />
          )}
          {currentStep === "card" && showCardFlow && (
            <div className="bg-card rounded-3xl p-6 shadow-xl">
              <CardConnectionFlow 
                onComplete={handleCardFlowComplete}
                onBack={handleCardFlowBack}
              />
            </div>
          )}
          {currentStep === "account" && (
            <ConnectionStep
              title="계좌 연결"
              description="사업용 계좌를 연동하면 입출금 내역을 실시간으로 확인하고 자금 흐름을 파악할 수 있습니다."
              icon={Landmark}
              isConnected={connections.account}
              isConnecting={isConnecting}
              onConnect={() => handleConnect("account")}
              onNext={handleNext}
              onSkip={handleSkip}
            />
          )}
          {currentStep === "complete" && (
            <CompleteStep onComplete={onComplete} connections={connections} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Welcome Step
function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="bg-card rounded-3xl p-8 shadow-xl text-center space-y-5">
      <div className="flex justify-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <Bot className="h-8 w-8 text-primary-foreground" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-500" />
        </div>
      </div>
      <div className="-mt-1">
        <h1 className="text-2xl font-bold text-foreground">안녕하세요, 사장님!</h1>
        <h2 className="text-xl font-semibold text-primary mt-1">김비서입니다 👋</h2>
      </div>
      <p className="text-muted-foreground leading-relaxed">
        사장님은 <strong className="text-foreground">명령만</strong> 하세요.<br />
        실행은 <strong className="text-primary">김비서</strong>가 합니다.
      </p>
      <div className="bg-muted/50 rounded-xl p-4 text-sm text-left space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span>매출/지출 자동 정리</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span>부가세/급여 자동 분리</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
          <span>AI 경영 비서 24시간 대기</span>
        </div>
      </div>
      <Button onClick={onNext} size="lg" className="w-full gap-2">
        시작하기
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Connection Step
function ConnectionStep({
  title,
  description,
  icon: Icon,
  isConnected,
  isConnecting,
  onConnect,
  onNext,
  onSkip,
}: {
  title: string;
  description: string;
  icon: typeof Building2;
  isConnected: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="bg-card rounded-3xl p-8 shadow-xl space-y-6">
      <div className="flex justify-center">
        <div className={cn(
          "h-14 w-14 rounded-xl flex items-center justify-center",
          isConnected 
            ? "bg-green-500/10 text-green-500" 
            : "bg-primary/10 text-primary"
        )}>
          {isConnected ? (
            <CheckCircle2 className="h-7 w-7" />
          ) : (
            <Icon className="h-7 w-7" />
          )}
        </div>
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
        <Shield className="h-4 w-4 shrink-0 text-green-500" />
        <span>256bit SSL 암호화로 안전하게 연결됩니다</span>
      </div>
      {isConnected ? (
        <Button onClick={onNext} size="lg" className="w-full gap-2">
          다음 단계
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <div className="space-y-3">
          <Button 
            onClick={onConnect} 
            size="lg" 
            className="w-full gap-2"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                연결 중...
              </>
            ) : (
              <>
                연결하기
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            onClick={onSkip} 
            className="w-full text-muted-foreground"
            disabled={isConnecting}
          >
            나중에 하기
          </Button>
        </div>
      )}
    </div>
  );
}

// Complete Step
function CompleteStep({ 
  onComplete, 
  connections 
}: { 
  onComplete: () => void;
  connections: { hometax: boolean; card: boolean; account: boolean };
}) {
  const connectedCount = Object.values(connections).filter(Boolean).length;
  
  return (
    <div className="bg-card rounded-3xl p-8 shadow-xl text-center space-y-6">
      <div className="flex justify-center">
        <div className="relative">
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-green-500 to-green-400 flex items-center justify-center shadow-lg">
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-yellow-500" />
        </div>
      </div>
      <div>
        <h2 className="text-xl font-bold text-foreground">설정 완료!</h2>
        <p className="text-muted-foreground mt-2">
          {connectedCount > 0 
            ? `${connectedCount}개 서비스가 연결되었습니다` 
            : "언제든 설정에서 연결할 수 있어요"}
        </p>
      </div>
      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
        <ConnectionStatus label="국세청" connected={connections.hometax} />
        <ConnectionStatus label="카드" connected={connections.card} />
        <ConnectionStatus label="계좌" connected={connections.account} />
      </div>
      <Button onClick={onComplete} size="lg" className="w-full gap-2">
        김비서 시작하기
        <Sparkles className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ConnectionStatus({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {connected ? (
        <span className="flex items-center gap-1 text-green-500">
          <CheckCircle2 className="h-4 w-4" />
          연결됨
        </span>
      ) : (
        <span className="text-muted-foreground/60">미연결</span>
      )}
    </div>
  );
}
