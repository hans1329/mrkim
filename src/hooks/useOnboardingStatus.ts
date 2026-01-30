import { useState, useEffect } from "react";

export interface OnboardingStatus {
  hometax: boolean;
  card: boolean;
  account: boolean;
}

const STORAGE_KEY = "kimsecretary_onboarding_status";

export function useOnboardingStatus() {
  const [status, setStatus] = useState<OnboardingStatus>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      hometax: false,
      card: false,
      account: false,
    };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(status));
  }, [status]);

  const connect = (type: keyof OnboardingStatus) => {
    setStatus((prev) => ({ ...prev, [type]: true }));
  };

  const disconnect = (type: keyof OnboardingStatus) => {
    setStatus((prev) => ({ ...prev, [type]: false }));
  };

  const isFullyConnected = status.hometax && status.card && status.account;

  const reset = () => {
    setStatus({ hometax: false, card: false, account: false });
  };

  return {
    status,
    connect,
    disconnect,
    isFullyConnected,
    reset,
  };
}
