import { ReactNode, useEffect } from "react";
import { useLayoutConfig } from "@/contexts/LayoutContext";

export interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  stickyHeader?: ReactNode;
  headerRight?: ReactNode;
}

export function MainLayout({ children, title, subtitle, showBackButton, onBack, stickyHeader, headerRight }: MainLayoutProps) {
  const { setConfig } = useLayoutConfig();

  useEffect(() => {
    setConfig({ title, subtitle, showBackButton, onBack, stickyHeader, headerRight });
  }, [title, subtitle, showBackButton, setConfig]);

  useEffect(() => {
    setConfig({ title, subtitle, showBackButton, onBack, stickyHeader, headerRight });
  }, [stickyHeader, headerRight]);

  return <>{children}</>;
}
