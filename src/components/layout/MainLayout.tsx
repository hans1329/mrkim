import { ReactNode } from "react";
import { AppLayout } from "./AppLayout";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export function MainLayout({ children, title, subtitle, showBackButton }: MainLayoutProps) {
  return (
    <AppLayout title={title} subtitle={subtitle} showBackButton={showBackButton}>
      {children}
    </AppLayout>
  );
}
