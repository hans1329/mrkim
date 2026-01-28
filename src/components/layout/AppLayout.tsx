import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Bell, Settings, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showBackButton?: boolean;
}

export function AppLayout({ 
  children, 
  title = "김비서", 
  subtitle,
  showHeader = true,
  showBackButton = false
}: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-background">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 border-b bg-card px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 -ml-2"
                  onClick={() => navigate(-1)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <div 
                className={`rounded-lg px-2 py-1 -my-1 transition-colors ${!showBackButton ? "cursor-pointer hover:bg-muted -mx-2" : ""}`}
                onClick={() => !showBackButton && navigate("/profile")}
              >
                <h1 className="text-lg font-bold text-foreground">{title}</h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Notifications */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative h-9 w-9"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                  2
                </span>
              </Button>

              {/* Settings */}
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9"
                onClick={() => navigate("/settings")}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
