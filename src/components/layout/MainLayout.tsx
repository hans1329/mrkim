import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AIChatPanel } from "@/components/chat/AIChatPanel";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        
        <div className="flex flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  안녕하세요, 사장님 👋
                </h1>
                <p className="text-sm text-muted-foreground">
                  오늘도 김비서가 도와드릴게요
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge 
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
                  variant="destructive"
                >
                  2
                </Badge>
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </div>

        {/* AI Chat Panel */}
        <AIChatPanel />
      </div>
    </SidebarProvider>
  );
}
