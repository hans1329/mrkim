import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { AIChatPanel } from "@/components/chat/AIChatPanel";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
}

export function AppLayout({ 
  children, 
  title = "김비서", 
  subtitle,
  showHeader = true 
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      {showHeader && (
        <header className="sticky top-0 z-40 border-b bg-card px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                2
              </span>
            </Button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav />

      {/* AI Chat Panel */}
      <AIChatPanel />
    </div>
  );
}
