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
}

export function MainLayout({ children, title, subtitle, showBackButton, onBack }: MainLayoutProps) {
  const isMobile = useIsMobile();

  // PC에서는 3컬럼 레이아웃 사용
  if (!isMobile) {
    return (
      <PCLayout title={title} subtitle={subtitle}>
        {children}
      </PCLayout>
    );
  }

  // 모바일에서는 기존 레이아웃 사용
  return (
    <AppLayout title={title} subtitle={subtitle} showBackButton={showBackButton} onBack={onBack}>
      {children}
    </AppLayout>
  );
}
