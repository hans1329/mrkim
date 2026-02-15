import { Outlet, useLocation } from "react-router-dom";
import { LayoutProvider, useLayoutConfig } from "@/contexts/LayoutContext";
import { AppLayout } from "./AppLayout";
import { PCLayout } from "./PCLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRef, useEffect, useState } from "react";

function AnimatedOutlet() {
  const location = useLocation();
  const [animKey, setAnimKey] = useState(location.pathname);

  useEffect(() => {
    setAnimKey(location.pathname);
  }, [location.pathname]);

  return (
    <div key={animKey} className="animate-fade-in" style={{ animationDuration: '200ms' }}>
      <Outlet />
    </div>
  );
}

function LayoutShell() {
  const isMobile = useIsMobile();
  const { config } = useLayoutConfig();

  if (!isMobile) {
    return (
      <PCLayout title={config.title} subtitle={config.subtitle}>
        <AnimatedOutlet />
      </PCLayout>
    );
  }

  return (
    <AppLayout
      title={config.title}
      subtitle={config.subtitle}
      showBackButton={config.showBackButton}
      onBack={config.onBack}
      stickyHeader={config.stickyHeader}
    >
      <AnimatedOutlet />
    </AppLayout>
  );
}

export function LayoutRoute() {
  return (
    <LayoutProvider>
      <LayoutShell />
    </LayoutProvider>
  );
}
