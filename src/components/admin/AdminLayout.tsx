import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  ChevronLeft,
  LogOut,
  Settings,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  loading?: boolean;
}

const menuItems = [
  { path: "/admin", label: "대시보드", icon: LayoutDashboard },
  { path: "/admin/faq", label: "FAQ 관리", icon: MessageSquare },
  { path: "/admin/users", label: "사용자 관리", icon: Users },
];

export function AdminLayout({ children, title, loading = false }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("로그아웃 되었습니다");
    navigate("/login");
  };

  const handleBackToApp = () => {
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-sidebar-background text-sidebar-foreground flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-lg">김비서 Admin</h1>
                <p className="text-xs text-sidebar-foreground/60">관리자 콘솔</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-primary" 
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <Button
            variant="ghost"
            onClick={handleBackToApp}
            className={cn(
              "w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
              sidebarCollapsed && "px-3"
            )}
          >
            <ChevronLeft className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">앱으로 돌아가기</span>}
          </Button>
          
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10",
              sidebarCollapsed && "px-3"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!sidebarCollapsed && <span className="ml-3">로그아웃</span>}
          </Button>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="p-2 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors border-t border-sidebar-border"
        >
          <ChevronLeft className={cn("w-5 h-5 mx-auto transition-transform", sidebarCollapsed && "rotate-180")} />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b bg-card flex items-center px-6">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
