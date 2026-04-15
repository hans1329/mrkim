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
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const EMPLOYEE_INTENTS = ["직원 등록", "직원 추가", "사람 등록", "알바 등록", "알바 추가", "직원등록", "직원추가"];

// Map onboarding step IDs → profiles columns
const ONBOARDING_TO_PROFILE: Record<string, string> = {
  name: "name",
  business_type: "business_type",
  business_number: "business_registration_number",
};

/** Build existingData from profile row */
function profileToOnboardingData(profile: Record<string, unknown> | null): Record<string, string> {
  if (!profile) return {};
  const data: Record<string, string> = {};
  if (profile.name) data.name = String(profile.name);
  if (profile.business_type) data.business_type = String(profile.business_type);
  if (profile.business_registration_number) data.business_number = String(profile.business_registration_number);
  // "connect" step has no DB field — check connection flags
  if (profile.account_connected || profile.card_connected || profile.hometax_connected) {
    data.connect = "연동 완료";
  }
  return data;
}

/** Check if user has completed onboarding (has name at minimum) */
function isOnboarded(profile: Record<string, unknown> | null): boolean {
  return !!profile?.name;
}

/** Inner component that uses V2Voice context (must be inside V2VoiceProvider) */
const DashboardContent = ({ stage, onStartOnboarding }: { stage: "intro" | "onboarding" | "dashboard"; onStartOnboarding: () => void }) => {
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
        <SecretaryFeed onStartOnboarding={onStartOnboarding} />
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
  const [stage, setStage] = useState<"intro" | "onboarding" | "dashboard" | "loading">("loading");
  const [existingData, setExistingData] = useState<Record<string, string>>({});

  // Load profile on mount to determine stage
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setStage("intro");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, business_type, business_registration_number, account_connected, card_connected, hometax_connected")
        .eq("user_id", user.id)
        .single();

      const onboardingData = profileToOnboardingData(profile);
      setExistingData(onboardingData);

      if (isOnboarded(profile)) {
        setStage("dashboard");
      } else {
        setStage("intro");
      }
    };
    load();
  }, []);

  const handleIntroComplete = useCallback(() => {
    setStage("onboarding");
  }, []);

  const handleOnboardingComplete = useCallback(async (data: Record<string, string>) => {
    // Save to Supabase profiles
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const updates: Record<string, unknown> = {};
      for (const [stepId, value] of Object.entries(data)) {
        const col = ONBOARDING_TO_PROFILE[stepId];
        if (col) updates[col] = value;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("profiles")
          .update(updates)
          .eq("user_id", user.id);
      }
    }

    // Merge existing data
    const merged = { ...existingData, ...data };
    setExistingData(merged);
    setStage("dashboard");
  }, [existingData]);

  const hideHeader = stage === "intro" || stage === "onboarding" || stage === "loading";

  if (stage === "loading") {
    return (
      <V2Layout hideHeader>
        <div className="flex-1 flex flex-col gap-4 px-4 pt-16">
          <Skeleton className="h-32 w-full rounded-3xl bg-white/5" />
          <Skeleton className="h-48 w-full rounded-3xl bg-white/5" />
          <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
        </div>
      </V2Layout>
    );
  }

  return (
    <V2Layout hideHeader={hideHeader}>
      {stage === "intro" && (
        <IntroSequence onComplete={handleIntroComplete} />
      )}

      {stage === "onboarding" && (
        <ChatOnboarding
          onComplete={handleOnboardingComplete}
          existingData={existingData}
        />
      )}

      <DashboardContent stage={stage} onStartOnboarding={() => {
        setStage("onboarding");
      }} />
    </V2Layout>
  );
};

export default V2Dashboard;
