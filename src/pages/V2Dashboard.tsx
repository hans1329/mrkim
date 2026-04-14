import { useState, useCallback } from "react";
import { WeatherAnchor } from "@/components/v2/WeatherAnchor";
import { SecretaryFeed } from "@/components/v2/SecretaryFeed";
import { V2Layout } from "@/components/v2/V2Layout";
import { IntroSequence } from "@/components/v2/IntroSequence";
import { ChatOnboarding } from "@/components/v2/ChatOnboarding";

const V2Dashboard = () => {
  const [stage, setStage] = useState<"intro" | "onboarding" | "dashboard">("intro");

  const handleIntroComplete = useCallback(() => {
    setStage("onboarding");
  }, []);

  const handleOnboardingComplete = useCallback((data: Record<string, string>) => {
    console.log("Onboarding data:", data);
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

      {stage === "dashboard" && (
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <WeatherAnchor />
          <SecretaryFeed />
        </div>
      )}
    </V2Layout>
  );
};

export default V2Dashboard;
