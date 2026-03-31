import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutProvider, useLayoutConfig } from "@/contexts/LayoutContext";
import { AppLayout } from "./AppLayout";
import { PCLayout } from "./PCLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

function BannedScreen({ reason }: { reason?: string | null }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <Ban className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">계정이 차단되었습니다</h1>
        <p className="text-sm text-muted-foreground">
          서비스 이용이 제한되었습니다. 문의사항이 있으시면 고객센터로 연락해주세요.
        </p>
        {reason && (
          <p className="text-sm text-destructive bg-destructive/5 rounded-lg p-3">
            사유: {reason}
          </p>
        )}
        <Button variant="outline" onClick={handleLogout} className="mt-4">
          로그아웃
        </Button>
      </div>
    </div>
  );
}

function AnimatedOutlet({ noWrapper }: { noWrapper?: boolean }) {
  const location = useLocation();

  if (noWrapper) {
    return <Outlet />;
  }

  return (
    <div
      key={location.pathname}
      className="animate-fade-in"
      style={{
        animationDuration: '350ms',
        animationDelay: '50ms',
        animationFillMode: 'both',
      }}
    >
      <Outlet />
    </div>
  );
}

function LayoutShell() {
  const isMobile = useIsMobile();
  const { config } = useLayoutConfig();
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkBan = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setChecked(true);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("is_banned, ban_reason")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.is_banned) {
        setIsBanned(true);
        setBanReason(data.ban_reason);
      }
      setChecked(true);
    };
    checkBan();
  }, []);

  if (!checked) return null;
  if (isBanned) return <BannedScreen reason={banReason} />;

  if (!isMobile) {
    return (
      <PCLayout title={config.title} subtitle={config.subtitle}>
        <AnimatedOutlet noWrapper />
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
      headerRight={config.headerRight}
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
