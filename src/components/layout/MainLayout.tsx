import { ReactNode } from "react";
import { AppLayout } from "./AppLayout";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function MainLayout({ children, title, subtitle }: MainLayoutProps) {
  return (
    <AppLayout title={title} subtitle={subtitle}>
      {children}
    </AppLayout>
  );
}
