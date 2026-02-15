import { Outlet } from "react-router-dom";
import { LayoutProvider, useLayoutConfig } from "@/contexts/LayoutContext";
import { AppLayout } from "./AppLayout";
import { PCLayout } from "./PCLayout";
import { useIsMobile } from "@/hooks/use-mobile";

function LayoutShell() {
  const isMobile = useIsMobile();
  const { config } = useLayoutConfig();

  if (!isMobile) {
    return (
      <PCLayout title={config.title} subtitle={config.subtitle}>
        <Outlet />
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
      <Outlet />
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
