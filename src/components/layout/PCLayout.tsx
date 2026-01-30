import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Wallet, 
  MoreHorizontal,
  Bell,
  Settings,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";
import { PCSideChat } from "@/components/chat/PCSideChat";

const navItems = [
  { title: "홈", url: "/", icon: LayoutDashboard },
  { title: "매출/매입", url: "/transactions", icon: Receipt },
  { title: "직원", url: "/employees", icon: Users },
  { title: "자금", url: "/funds", icon: Wallet },
  { title: "더보기", url: "/more", icon: MoreHorizontal },
];

interface PCLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function PCLayout({ children, title = "김비서", subtitle }: PCLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* 좌측 네비게이션 사이드바 */}
      <aside className="w-64 flex-shrink-0 border-r bg-card/50 backdrop-blur-sm flex flex-col">
        {/* 로고 영역 */}
        <div className="p-6 border-b">
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/profile")}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              )}
              activeClassName="bg-primary/10 text-primary font-medium"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* 하단 유틸리티 */}
        <div className="p-4 border-t space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/notifications")}
          >
            <div className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                2
              </span>
            </div>
            <span>알림</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-5 w-5" />
            <span>설정</span>
          </Button>
        </div>
      </aside>

      {/* 중앙 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          {children}
        </div>
      </main>

      {/* 우측 AI 채팅 패널 */}
      <aside className="w-96 flex-shrink-0 border-l bg-card/30 backdrop-blur-sm">
        <PCSideChat />
      </aside>
    </div>
  );
}
