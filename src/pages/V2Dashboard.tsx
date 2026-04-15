import { useState, useCallback, useEffect } from "react";
import { WeatherAnchor } from "@/components/v2/WeatherAnchor";
import { SecretaryFeed } from "@/components/v2/SecretaryFeed";
import { TaxSavingCarousel } from "@/components/v2/TaxSavingCarousel";
import { V2Layout } from "@/components/v2/V2Layout";
import { IntroSequence } from "@/components/v2/IntroSequence";
import { ChatOnboarding } from "@/components/v2/ChatOnboarding";
import { VoiceEmployeeRegistration } from "@/components/v2/VoiceEmployeeRegistration";
import { useV2Voice } from "@/components/v2/V2VoiceContext";
import { AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const EMPLOYEE_INTENTS = ["직원 등록", "직원 추가", "사람 등록", "알바 등록", "알바 추가", "직원등록", "직원추가"];

/** Inner component that uses V2Voice context (must be inside V2VoiceProvider) */
const DashboardContent = ({ stage }: { stage: "intro" | "onboarding" | "dashboard" }) => {
  const [showEmployeeReg, setShowEmployeeReg] = useState(false);
  const { onCommit } = useV2Voice();
  const { toast } = useToast();

  useEffect(() => {
    if (stage !== "dashboard") return;

    onCommit((text: string) => {
      const lower = text.toLowerCase().replace(/\s/g, "");
      const matched = EMPLOYEE_INTENTS.some((intent) => lower.includes(intent.replace(/\s/g, "")));
      if (matched) {
        setShowEmployeeReg(true);
      }
    });
  }, [stage, onCommit]);

  const handleEmployeeRegComplete = useCallback((data: Record<string, string>) => {
    setShowEmployeeReg(false);
    toast({
      title: "직원 등록 완료",
      description: `${data.name}님이 등록되었습니다.`,
    });
  }, [toast]);

  if (stage !== "dashboard") return null;

  return (
    <>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <WeatherAnchor />
        <div className="px-4 pt-3">
          <TaxSavingCarousel />
        </div>
        <SecretaryFeed />
      </div>
      <AnimatePresence>
        {showEmployeeReg && (
          <VoiceEmployeeRegistration
            onClose={() => setShowEmployeeReg(false)}
            onComplete={handleEmployeeRegComplete}
          />
        )}
      </AnimatePresence>
    </>
  );
};

const V2Dashboard = () => {
  const [stage, setStage] = useState<"intro" | "onboarding" | "dashboard">(() => {
    const saved = localStorage.getItem("v2_onboarded");
    return saved === "true" ? "dashboard" : "intro";
  });

  const handleIntroComplete = useCallback(() => {
    setStage("onboarding");
  }, []);

  const handleOnboardingComplete = useCallback((data: Record<string, string>) => {
    console.log("Onboarding data:", data);
    localStorage.setItem("v2_onboarded", "true");
    setStage("dashboard");
  }, []);

  const hideHeader = stage === "intro" || stage === "onboarding";

  return (
    <V2Layout hideHeader={hideHeader}>
      {stage === "intro" && (
        <IntroSequence onComplete={handleIntroComplete} />
      )}

      {stage === "onboarding" && (
        <ChatOnboarding onComplete={handleOnboardingComplete} />
      )}

      <DashboardContent stage={stage} />
    </V2Layout>
  );
};

export default V2Dashboard;
