import { useState, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { WeatherAnchor } from "@/components/v2/WeatherAnchor";
import { SecretaryFeed } from "@/components/v2/SecretaryFeed";
import { TaxSavingCarousel } from "@/components/v2/TaxSavingCarousel";
import { V2Layout } from "@/components/v2/V2Layout";
import { IntroSequence } from "@/components/v2/IntroSequence";
import { ChatOnboarding } from "@/components/v2/ChatOnboarding";
import { VoiceEmployeeRegistration } from "@/components/v2/VoiceEmployeeRegistration";
import { UrgentEventSplash } from "@/components/v2/UrgentEventSplash";
import { useV2Voice } from "@/components/v2/V2VoiceContext";
import { AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedCards } from "@/hooks/useFeedCards";

const EMPLOYEE_INTENTS = ["직원 등록", "직원 추가", "사람 등록", "알바 등록", "알바 추가", "직원등록", "직원추가"];
const V2_ONBOARDED_KEY = "v2_onboarded";

const ONBOARDING_TO_PROFILE: Record<string, string> = {
  name: "name",
  business_type: "business_type",
  business_number: "business_registration_number",
};

function profileToOnboardingData(profile: Record<string, unknown> | null): Record<string, string> {
  if (!profile) return {};
  const data: Record<string, string> = {};
  if (profile.name) data.name = String(profile.name);
  if (profile.business_type) data.business_type = String(profile.business_type);
  if (profile.business_registration_number) data.business_number = String(profile.business_registration_number);
  if (profile.account_connected || profile.card_connected || profile.hometax_connected) {
    data.connect = "연동 완료";
  }
  return data;
}

function isOnboarded(profile: Record<string, unknown> | null): boolean {
  return !!profile?.name;
}

const DashboardContent = ({ stage, onStartOnboarding }: { stage: "intro" | "onboarding" | "dashboard" | "loading"; onStartOnboarding: () => void }) => {
  const [showEmployeeReg, setShowEmployeeReg] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const { onCommit } = useV2Voice();
  const { toast } = useToast();
  const { todayCards, isLoading: feedLoading } = useFeedCards();

  useEffect(() => {
    if (stage !== "dashboard") return;

    let isProcessing = false;
    let currentAudio: HTMLAudioElement | null = null;

    onCommit(async (text: string) => {
      if (isProcessing || !text.trim()) return;

      const lower = text.toLowerCase().replace(/\s/g, "");
      const matched = EMPLOYEE_INTENTS.some((intent) => lower.includes(intent.replace(/\s/g, "")));
      if (matched) {
        setShowEmployeeReg(true);
        return;
      }

      isProcessing = true;
      // 사용자 발화 표시
      toast({ title: "🎤 질문", description: text });

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        // 1) AI 응답 생성
        const { data: chatData, error: chatError } = await supabase.functions.invoke("chat-ai", {
          body: {
            messages: [{ role: "user", content: text }],
            userId,
          },
        });

        if (chatError) throw chatError;
        const reply = chatData?.response || "죄송합니다, 응답을 만들지 못했어요.";

        // 2) 화면에 답변 표시
        toast({ title: "💬 김비서", description: reply, duration: 8000 });

        // 3) TTS 재생
        const { data: ttsData, error: ttsError } = await supabase.functions.invoke("elevenlabs-tts", {
          body: { text: reply, gender: "female" },
        });

        if (!ttsError && ttsData?.audio) {
          if (currentAudio) currentAudio.pause();
          const audio = new Audio(`data:audio/mpeg;base64,${ttsData.audio}`);
          currentAudio = audio;
          audio.play().catch((e) => console.warn("TTS play failed:", e));
        }
      } catch (e) {
        console.error("Voice query failed:", e);
        toast({ title: "오류", description: "음성 응답 중 문제가 발생했어요.", variant: "destructive" });
      } finally {
        isProcessing = false;
      }
    });
  }, [stage, onCommit, toast]);

  const handleEmployeeRegComplete = useCallback((data: Record<string, string>) => {
    setShowEmployeeReg(false);
    toast({
      title: "직원 등록 완료",
      description: `${data.name}님이 등록되었습니다.`,
    });
  }, [toast]);

  if (stage !== "dashboard") return null;

  if (!splashDone && !feedLoading && todayCards.length > 0) {
    return (
      <UrgentEventSplash
        feedCards={todayCards}
        onComplete={() => setSplashDone(true)}
      />
    );
  }

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stage, setStage] = useState<"intro" | "onboarding" | "dashboard" | "loading">("loading");
  const [existingData, setExistingData] = useState<Record<string, string>>({});

  const shouldStartConnectionOnboarding = searchParams.get("onboarding") === "connect";

  const clearOnboardingQuery = useCallback(() => {
    if (!shouldStartConnectionOnboarding) return;
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("onboarding");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams, shouldStartConnectionOnboarding]);

  useEffect(() => {
    const load = async () => {
      const locallyOnboarded = localStorage.getItem(V2_ONBOARDED_KEY) === "true";
      const showIntroAfterLogin = sessionStorage.getItem("v2_show_intro") === "1";
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // 비로그인 상태에서는 온보딩(이름 묻기) 진입을 막고 로그인으로 이동
        if (shouldStartConnectionOnboarding) {
          navigate("/login", { replace: true });
          return;
        }
        setExistingData({});
        setStage(locallyOnboarded ? "dashboard" : "intro");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, business_type, business_registration_number, account_connected, card_connected, hometax_connected")
        .eq("user_id", user.id)
        .single();

      const onboardingData = profileToOnboardingData(profile);
      setExistingData(onboardingData);

      if (shouldStartConnectionOnboarding) {
        setStage("onboarding");
        return;
      }

      // 로그인 직후에는 인사말(인트로) 화면을 우선 보여줌
      if (showIntroAfterLogin) {
        sessionStorage.removeItem("v2_show_intro");
        setStage("intro");
        return;
      }

      if (isOnboarded(profile) || locallyOnboarded) {
        setStage("dashboard");
      } else {
        setStage("onboarding");
      }
    };

    load();
  }, [shouldStartConnectionOnboarding, navigate]);

  const handleIntroComplete = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/login");
      return;
    }
    // 이미 온보딩이 완료된 사용자는 인트로 이후 바로 대시보드로
    if (existingData.name) {
      localStorage.setItem(V2_ONBOARDED_KEY, "true");
      setStage("dashboard");
      return;
    }
    setStage("onboarding");
  }, [navigate, existingData.name]);

  const persistOnboardingProgress = useCallback(async (partialData: Record<string, string>) => {
    setExistingData((prev) => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(partialData)) {
        if (v) next[k] = v;
        else delete next[k];
      }
      return next;
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const updates: Record<string, unknown> = {};
    for (const [stepId, value] of Object.entries(partialData)) {
      const col = ONBOARDING_TO_PROFILE[stepId];
      if (col) updates[col] = value || null;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);
    }
  }, []);

  const handleOnboardingComplete = useCallback(async (data: Record<string, string>) => {
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

    localStorage.setItem(V2_ONBOARDED_KEY, "true");
    setExistingData((prev) => ({ ...prev, ...data }));
    clearOnboardingQuery();
    setStage("dashboard");
  }, [clearOnboardingQuery]);

  const openVoiceOnboarding = useCallback(() => {
    setStage("onboarding");
  }, []);

  const hideHeader = stage === "intro" || stage === "loading";

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
          onProgress={persistOnboardingProgress}
          existingData={existingData}
        />
      )}

      <DashboardContent stage={stage} onStartOnboarding={openVoiceOnboarding} />
    </V2Layout>
  );
};

export default V2Dashboard;
