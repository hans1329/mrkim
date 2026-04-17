import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { WeatherAnchor } from "@/components/v2/WeatherAnchor";
import { SecretaryFeed } from "@/components/v2/SecretaryFeed";
import { TaxSavingCarousel } from "@/components/v2/TaxSavingCarousel";
import { V2Layout } from "@/components/v2/V2Layout";
import { IntroSequence } from "@/components/v2/IntroSequence";
import { ChatOnboarding } from "@/components/v2/ChatOnboarding";
import { VoiceEmployeeRegistration } from "@/components/v2/VoiceEmployeeRegistration";
import { UrgentEventSplash } from "@/components/v2/UrgentEventSplash";
import { VoiceListeningHint } from "@/components/v2/VoiceListeningHint";
import { VoiceCardToast, type VoiceCard } from "@/components/v2/VoiceCardToast";
import { VoiceChatDrawer, type ChatTurn } from "@/components/v2/VoiceChatDrawer";
import { useV2Voice } from "@/components/v2/V2VoiceContext";
import { AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeedCards } from "@/hooks/useFeedCards";
import { detectVoiceIntent } from "@/lib/voiceIntent";

// 응답이 카드 토스트로 적합한지 판별: 짧고, 숫자/단위 포함, 시각화 없음
function shouldShowAsCard(response: string, hasVisualization: boolean): boolean {
  if (hasVisualization) return false;
  const text = response.trim();
  if (text.length > 70) return false;
  // 줄바꿈/리스트가 있으면 드로어
  if (/\n|[-*]\s/.test(text)) return false;
  return /(\d|만원|원|건|%|점|위|개|명)/.test(text);
}

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
  const navigate = useNavigate();
  const [showEmployeeReg, setShowEmployeeReg] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const { onCommit, isConnected, partialTranscript, toggleVoice } = useV2Voice();
  const { toast } = useToast();
  const { todayCards, isLoading: feedLoading } = useFeedCards();

  // 음성 응답 라우터 상태
  const [card, setCard] = useState<VoiceCard | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const processingRef = useRef(false);

  const askChatAI = useCallback(async (userText: string) => {
    if (processingRef.current) return;
    processingRef.current = true;

    // 사용자 발화를 누적 대화에 추가 (드로어 열렸을 때만 보이지만 미리 적재)
    const userTurn: ChatTurn = { id: `u-${Date.now()}`, role: "user", content: userText };
    setTurns((prev) => [...prev, userTurn]);
    setIsThinking(true);
    // 즉시 드로어를 열어 "생각 중…" 피드백을 보여준다 (응답 대기 4~5초 체감 제거)
    setCard(null);
    setDrawerOpen(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("chat-ai", {
        body: {
          messages: [...turns, userTurn].map((t) => ({ role: t.role, content: t.content })),
          userId: session?.user?.id,
        },
      });

      const reply = error ? "죄송해요, 응답을 가져오지 못했어요." : data?.response || "응답이 비어 있어요.";
      const hasVisualization = !!data?.visualization;

      const assistantTurn: ChatTurn = { id: `a-${Date.now()}`, role: "assistant", content: reply };
      setTurns((prev) => [...prev, assistantTurn]);
      // 첫 응답이고 짧은 단답형이면 드로어 닫고 카드 토스트로 승격
      const isFirstTurn = turns.length === 0;
      if (!error && isFirstTurn && shouldShowAsCard(reply, hasVisualization)) {
        setDrawerOpen(false);
        setCard({ id: assistantTurn.id, question: userText, answer: reply });
      }
    } catch (e) {
      console.error("chat-ai error:", e);
      setTurns((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: "오류가 발생했어요. 다시 시도해주세요." },
      ]);
    } finally {
      setIsThinking(false);
      processingRef.current = false;
    }
  }, [turns]);

  // 음성 commit → 인텐트 라우팅
  useEffect(() => {
    if (stage !== "dashboard") return;

    onCommit((text: string) => {
      const intent = detectVoiceIntent(text);

      switch (intent.kind) {
        case "dismiss":
          setCard(null);
          setDrawerOpen(false);
          setTurns([]);
          if (isConnected) toggleVoice(); // 마이크 끄기
          return;
        case "employee_register":
          setCard(null);
          setDrawerOpen(false);
          setShowEmployeeReg(true);
          return;
        case "onboarding_connect":
          setCard(null);
          setDrawerOpen(false);
          onStartOnboarding();
          return;
        case "settings":
          setCard(null);
          setDrawerOpen(false);
          navigate(intent.target === "secretary" ? "/secretary-settings" : "/settings");
          return;
        case "tax_consultation":
          setCard(null);
          setDrawerOpen(false);
          navigate("/tax-accountant");
          return;
        case "chat":
        default:
          void askChatAI(text);
          return;
      }
    });
  }, [stage, onCommit, navigate, onStartOnboarding, askChatAI, isConnected, toggleVoice]);

  const handleEmployeeRegComplete = useCallback((data: Record<string, string>) => {
    setShowEmployeeReg(false);
    toast({
      title: "직원 등록 완료",
      description: `${data.name}님이 등록되었습니다.`,
    });
  }, [toast]);

  const expandCardToDrawer = useCallback(() => {
    setCard(null);
    setDrawerOpen(true);
  }, []);

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

      {/* 마이크 ON 시: 작은 힌트 토스트만 (드로어 열렸을 땐 숨김) */}
      {!drawerOpen && (
        <VoiceListeningHint isConnected={isConnected} partialTranscript={partialTranscript} />
      )}

      {/* 단답형 응답 카드 토스트 */}
      <VoiceCardToast
        card={card}
        onExpand={expandCardToDrawer}
        onDismiss={() => setCard(null)}
      />

      {/* 복합 대화 드로어 */}
      <VoiceChatDrawer
        open={drawerOpen}
        turns={turns}
        isThinking={isThinking}
        partialTranscript={partialTranscript}
        isConnected={isConnected}
        onClose={() => setDrawerOpen(false)}
      />

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
