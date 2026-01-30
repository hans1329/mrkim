import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import Dashboard from "@/pages/Dashboard";

const Index = () => {
  const {
    isFirstVisit,
    currentStep,
    connections,
    goToStep,
    connectService,
    completeOnboarding,
  } = useOnboarding();

  // 첫 방문 시 온보딩 위저드 표시
  if (isFirstVisit) {
    return (
      <OnboardingWizard
        currentStep={currentStep}
        connections={connections}
        onGoToStep={goToStep}
        onConnect={connectService}
        onComplete={completeOnboarding}
      />
    );
  }

  return <Dashboard />;
};

export default Index;
