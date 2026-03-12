import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  Megaphone,
  Bell,
  HelpCircle,
  Activity,
  Settings,
  Brain,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  loading?: boolean;
}

const menuGroups = [
  {
    label: "일반",
    items: [
      { path: "/admin", label: "대시보드", icon: LayoutDashboard },
      { path: "/admin/faq", label: "FAQ 관리", icon: MessageSquare },
      { path: "/admin/users", label: "사용자 관리", icon: Users },
    ],
  },
  {
    label: "운영",
    items: [
      { path: "/admin/announcements", label: "공지사항", icon: Megaphone },
      { path: "/admin/push", label: "푸시 알림", icon: Bell },
      { path: "/admin/email", label: "이메일 발송", icon: Mail },
      { path: "/admin/feedback", label: "피드백/문의", icon: HelpCircle },
      { path: "/admin/tax-accountants", label: "세무사 관리", icon: Users },
    ],
  },
  {
    label: "시스템",
    items: [
      { path: "/admin/intent-keywords", label: "AI 학습 관리", icon: Brain },
      { path: "/admin/api-usage", label: "API 사용량", icon: Activity },
      { path: "/admin/site-settings", label: "사이트 설정", icon: Settings },
    ],
  },
];

export function AdminLayout({ children, title, loading = false }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    // Clear local storage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("sb-")) {
        localStorage.removeItem(key);
      }
    });
    await supabase.auth.signOut();
    toast.success("로그아웃 되었습니다");
    navigate("/admin/login", { replace: true });
  };

  const handleBackToApp = () => {
    navigate("/");
  };

  const NavItem = ({ item }: { item: { path: string; label: string; icon: React.ComponentType<{ className?: string }> } }) => {
    const isActive = location.pathname === item.path;
    const content = (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
          isActive 
            ? "bg-primary-foreground/20 text-primary-foreground shadow-sm" 
            : "text-primary-foreground/60 hover:bg-primary-foreground/10 hover:text-primary-foreground"
        )}
      >
        <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "drop-shadow-sm")} />
        {!sidebarCollapsed && (
          <span className={cn("font-medium text-sm", isActive && "font-semibold")}>{item.label}</span>
        )}
      </Link>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="z-[9999]">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Primary Blue Theme */}
      <aside 
        className={cn(
          "bg-primary flex flex-col transition-all duration-300 relative",
          sidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header with Logo */}
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/20 backdrop-blur flex items-center justify-center overflow-hidden">
              <img 
                src="/images/icc-white.webp" 
                alt="Admin" 
                className="w-8 h-8 object-contain"
              />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="font-bold text-lg text-primary-foreground">Admin</h1>
                <p className="text-xs text-primary-foreground/60">김비서 관리 콘솔</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto scrollbar-thin">
          {menuGroups.map((group, idx) => (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <p className="px-3 mb-2 text-xs font-medium text-primary-foreground/40 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavItem key={item.path} item={item} />
                ))}
              </div>
              {idx < menuGroups.length - 1 && !sidebarCollapsed && (
                <Separator className="mt-4 bg-primary-foreground/10" />
              )}
            </div>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 space-y-1">
          {sidebarCollapsed ? (
            <>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBackToApp}
                    className="w-full text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="z-[9999]">
                  앱으로 돌아가기
                </TooltipContent>
              </Tooltip>
              
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="w-full text-primary-foreground/60 hover:text-red-200 hover:bg-red-500/20"
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="z-[9999]">
                  로그아웃
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={handleBackToApp}
                className="w-full justify-start text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <ExternalLink className="w-5 h-5 flex-shrink-0" />
                <span className="ml-3">앱으로 돌아가기</span>
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start text-primary-foreground/60 hover:text-red-200 hover:bg-red-500/20"
              >
                <LogOut className="w-5 h-5 flex-shrink-0" />
                <span className="ml-3">로그아웃</span>
              </Button>
            </>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border shadow-md",
            "flex items-center justify-center text-muted-foreground hover:text-foreground",
            "transition-colors z-10"
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-6">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>시스템 정상</span>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-muted/30">
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
