import { Outlet, useLocation } from "react-router-dom";
import { LayoutProvider, useLayoutConfig } from "@/contexts/LayoutContext";
import { AppLayout } from "./AppLayout";
import { PCLayout } from "./PCLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRef, useEffect, useState } from "react";

function AnimatedOutlet() {
  const location = useLocation();
  const [displayKey, setDisplayKey] = useState(location.key);
  const [transitioning, setTransitioning] = useState(false);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPathRef.current) {
      setTransitioning(true);
      // 짧은 페이드아웃 후 콘텐츠 교체 + 페이드인
      const timer = setTimeout(() => {
        setDisplayKey(location.key);
        prevPathRef.current = location.pathname;
        setTransitioning(false);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.key]);

  return (
    <div
      className="transition-opacity duration-150 ease-in-out"
      style={{ opacity: transitioning ? 0 : 1 }}
    >
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
