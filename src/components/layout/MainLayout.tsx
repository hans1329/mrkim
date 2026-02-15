import { ReactNode, useEffect } from "react";
import { useLayoutConfig } from "@/contexts/LayoutContext";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  stickyHeader?: ReactNode;
}

export function MainLayout({ children, title, subtitle, showBackButton, onBack, stickyHeader }: MainLayoutProps) {
  const { setConfig } = useLayoutConfig();

  useEffect(() => {
    setConfig({ title, subtitle, showBackButton, onBack, stickyHeader });
  }, [title, subtitle, showBackButton, setConfig]);

  // stickyHeader와 onBack은 의도적으로 deps에서 제외 (매 렌더마다 새 참조 생성되므로)
  // 초기 마운트 시 한 번만 설정하고, title/subtitle 변경 시 업데이트
  useEffect(() => {
    setConfig({ title, subtitle, showBackButton, onBack, stickyHeader });
  }, [stickyHeader]);

  return <>{children}</>;
}
