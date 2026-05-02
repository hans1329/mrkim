import { ReactNode, useState, useEffect } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Wallet, 
  TrendingUp,
  Bell,
  Settings,
  HelpCircle,
  PanelLeftClose,
  PanelLeft,
  User,
  UserCheck,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";
import { VoiceOverlay } from "@/components/voice/VoiceOverlay";
import { AIChatPanel } from "@/components/chat/AIChatPanel";
import { FloatingVoiceButton } from "@/components/voice/FloatingVoiceButton";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { getRandomAvatarUrl } from "@/lib/utils";


const navItems = [
  { title: "홈", url: "/", icon: LayoutDashboard },
  { title: "매출/매입", url: "/transactions", icon: Receipt },
  { title: "직원", url: "/employees", icon: Users },
  { title: "리포트", url: "/reports", icon: TrendingUp },
  { title: "자금", url: "/funds", icon: Wallet },
  { title: "세무사", url: "/tax-accountant", icon: UserCheck },
];

interface PCLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  headerRight?: ReactNode;
}

export function PCLayout({ children, title = "김비서", subtitle, showBackButton, onBack, headerRight }: PCLayoutProps) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const { profile } = useProfileQuery();
  const { unreadCount } = useNotifications();
  const userAvatarUrl = profile?.avatar_url || (profile?.user_id ? getRandomAvatarUrl(profile.user_id) : null);

  // PC에서는 body 스크롤 비활성화 (main만 스크롤)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* 좌측 네비게이션 사이드바 */}
      <aside className={cn(
        "flex-shrink-0 bg-primary/90 backdrop-blur-md flex flex-col transition-[width] duration-300 text-white z-10",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* 로고 영역 */}
        <div className={cn("border-b border-white/15", collapsed ? "p-3" : "p-6")}>
          <div 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/profile")}
          >
            {userAvatarUrl ? (
              <img 
                src={userAvatarUrl} 
                alt="프로필" 
                className={cn(
                  "rounded-full object-cover transition-all",
                  collapsed ? "h-10 w-10 mx-auto" : "h-12 w-12 mb-3"
                )} 
              />
            ) : (
              <div className={cn(
                "rounded-full bg-white/20 flex items-center justify-center transition-all",
                collapsed ? "h-10 w-10 mx-auto" : "h-12 w-12 mb-3"
              )}>
                <User className={cn("text-white/80", collapsed ? "h-5 w-5" : "h-6 w-6")} />
              </div>
            )}
            {!collapsed && (
              <>
                <h1 className="text-lg font-bold text-white leading-tight">
                  {title?.includes("안녕하세요,") ? (
                    <>
                      안녕하세요,<br />
                      {title.replace("안녕하세요, ", "")}
                    </>
                  ) : title}
                </h1>
                {subtitle && <p className="text-xs text-white/60">{subtitle}</p>}
              </>
            )}
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-4")}>
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className={cn(
                "flex items-center rounded-xl text-white/70 transition-colors hover:bg-white/15 hover:text-white",
                collapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
              )}
              activeClassName="bg-white/20 text-white font-medium"
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          ))}
        </nav>

        {/* 하단 유틸리티 */}
        <div className={cn("border-t border-white/15 space-y-1", collapsed ? "p-2" : "p-4")}>
          <Button
            variant="ghost"
            className={cn(
              "w-full text-white/70 hover:bg-white/15 hover:text-white transition-colors",
              collapsed ? "justify-center p-3" : "justify-start gap-3"
            )}
            onClick={() => navigate("/notifications")}
          >
            <div className="relative flex-shrink-0">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {!collapsed && <span>알림</span>}
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "w-full text-white/70 hover:bg-white/15 hover:text-white transition-colors",
              collapsed ? "justify-center p-3" : "justify-start gap-3"
            )}
            onClick={() => navigate("/settings")}
          >
            <Settings className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>설정</span>}
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "w-full text-white/70 hover:bg-white/15 hover:text-white transition-colors",
              collapsed ? "justify-center p-3" : "justify-start gap-3"
            )}
            onClick={() => navigate("/help")}
          >
            <HelpCircle className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span>도움말</span>}
          </Button>

          {/* 사이드바 접기/펼치기 버튼 */}
          <Button
            variant="ghost"
            className={cn(
              "w-full text-white/70 hover:bg-white/15 hover:text-white transition-colors",
              collapsed ? "justify-center p-3" : "justify-start gap-3"
            )}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5 flex-shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-5 w-5 flex-shrink-0" />
                <span>메뉴 접기</span>
              </>
            )}
          </Button>
        </div>
      </aside>

      {/* 메인 콘텐츠 - 풀스크린 with expanded width for 2-column layout */}
      <main className="flex-1 overflow-auto relative">
        {/* 사이드바 그림자 오버레이 */}
        <div className="absolute inset-y-0 left-0 w-3 z-10 pointer-events-none bg-gradient-to-r from-black/5 to-transparent" />

        {/* 서브페이지 헤더 */}
        {showBackButton && (
          <div className="sticky top-0 z-20 bg-card border-b border-border/50">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 -ml-2"
                  onClick={() => {
                    if (onBack) {
                      onBack();
                    } else {
                      navigate(-1);
                    }
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-base font-bold text-foreground">{title}</h1>
                  {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                </div>
              </div>
              {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
            </div>
          </div>
        )}

        <div className="[&>.pc-full-width]:contents [&>:not(.pc-full-width)]:max-w-6xl [&>:not(.pc-full-width)]:mx-auto [&>:not(.pc-full-width)]:p-6">
          {children}
        </div>

        {/* 플로팅 음성 버튼 */}
        <FloatingVoiceButton />
      </main>

      {/* AI 채팅 패널 */}
      <AIChatPanel />

      {/* 음성 오버레이 */}
      <VoiceOverlay />
    </div>
  );
}
