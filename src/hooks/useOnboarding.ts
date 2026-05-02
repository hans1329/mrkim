import { useState, useEffect } from "react";

export type OnboardingStep = "welcome" | "hometax" | "card" | "account" | "complete";

interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  connections: {
    hometax: boolean;
    card: boolean;
    account: boolean;
  };
}

const ONBOARDING_KEY = "kimsecretary_onboarding";

const defaultState: OnboardingState = {
  completed: false,
  currentStep: "welcome",
  connections: {
    hometax: false,
    card: false,
    account: false,
  },
};

export function useOnboarding() {
  const [state, setState] = useState<OnboardingState>(() => {
    const saved = localStorage.getItem(ONBOARDING_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultState;
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify(state));
  }, [state]);

  const goToStep = (step: OnboardingStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  };

  const connectService = (service: "hometax" | "card" | "account") => {
    setState((prev) => ({
      ...prev,
      connections: {
        ...prev.connections,
        [service]: true,
      },
    }));
  };

  // DB 기준으로 연동 상태를 동기화(기존 true 값을 false로도 되돌릴 수 있음)
  const setConnections = (connections: OnboardingState["connections"]) => {
    setState((prev) => ({
      ...prev,
      connections,
    }));
  };

  const completeOnboarding = () => {
    setState((prev) => ({
      ...prev,
      completed: true,
      currentStep: "complete",
    }));
  };

  const resetOnboarding = () => {
    setState(defaultState);
  };

  const isFirstVisit = !state.completed;

  return {
    ...state,
    isFirstVisit,
    goToStep,
    connectService,
    setConnections,
    completeOnboarding,
    resetOnboarding,
  };
}
