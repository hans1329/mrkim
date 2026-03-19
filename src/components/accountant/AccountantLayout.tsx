import { useAccountantAuth } from "@/hooks/useAccountantAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AccountantSidebar } from "./AccountantSidebar";
import { Outlet } from "react-router-dom";

export function AccountantLayout() {
  const { accountant, loading } = useAccountantAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="space-y-4 w-80">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!accountant) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AccountantSidebar accountant={accountant} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4 gap-3">
            <SidebarTrigger />
            <span className="text-sm font-medium text-muted-foreground">
              {accountant.firm_name || accountant.name} 세무사 포털
            </span>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet context={{ accountant }} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
