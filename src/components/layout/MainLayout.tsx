import { ReactNode } from "react";
import { AppLayout } from "./AppLayout";
import { PCLayout } from "./PCLayout";
import { useIsMobile } from "@/hooks/use-mobile";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  stickyHeader?: ReactNode;
}

export function MainLayout({ children, title, subtitle, showBackButton, onBack, stickyHeader }: MainLayoutProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <PCLayout title={title} subtitle={subtitle}>
        {children}
      </PCLayout>
    );
  }

  return (
    <AppLayout title={title} subtitle={subtitle} showBackButton={showBackButton} onBack={onBack} stickyHeader={stickyHeader}>
      {children}
    </AppLayout>
  );
}
