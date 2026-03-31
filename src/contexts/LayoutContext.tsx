import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export interface LayoutConfig {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  stickyHeader?: ReactNode;
  headerRight?: ReactNode;
}

interface LayoutContextType {
  config: LayoutConfig;
  setConfig: (config: LayoutConfig) => void;
}

const LayoutContext = createContext<LayoutContextType>({
  config: {},
  setConfig: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<LayoutConfig>({});

  const setConfig = useCallback((newConfig: LayoutConfig) => {
    setConfigState(newConfig);
  }, []);

  return (
    <LayoutContext.Provider value={{ config, setConfig }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutConfig() {
  return useContext(LayoutContext);
}
