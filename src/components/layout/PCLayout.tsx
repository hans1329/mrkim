import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
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

export function PCLayout({ children, title, subtitle }: PCLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* 좌측 네비게이션 사이드바 - 컴팩트 */}
      <aside className="w-52 flex-shrink-0 border-r bg-card/50 backdrop-blur-sm flex flex-col">
        {/* 브랜드 로고 영역 */}
        <div className="p-4 border-b">
          <div 
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">김비서</h1>
              <p className="text-[10px] text-muted-foreground">AI 경영 비서</p>
            </div>
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              )}
              activeClassName="bg-primary/10 text-primary font-medium"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* 하단 유틸리티 */}
        <div className="p-3 border-t space-y-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-sm text-muted-foreground hover:text-foreground h-9"
            onClick={() => navigate("/notifications")}
          >
            <div className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-medium text-destructive-foreground">
                2
              </span>
            </div>
            <span>알림</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 text-sm text-muted-foreground hover:text-foreground h-9"
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-4 w-4" />
            <span>설정</span>
          </Button>
        </div>
      </aside>

      {/* 중앙 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* 페이지 타이틀 */}
          {title && (
            <div 
              className="mb-6 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigate("/profile")}
            >
              <h2 className="text-xl font-bold text-foreground">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </main>

      {/* 우측 AI 채팅 패널 */}
      <aside className="w-80 flex-shrink-0 border-l bg-card/30 backdrop-blur-sm">
        <PCSideChat />
      </aside>
    </div>
  );
}
