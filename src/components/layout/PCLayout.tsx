import { ReactNode, useState, useEffect } from "react";
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
  PanelLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";
import { useVoice } from "@/contexts/VoiceContext";
import { useChat } from "@/contexts/ChatContext";
import { VoiceOverlay } from "@/components/voice/VoiceOverlay";
import { AIChatPanel } from "@/components/chat/AIChatPanel";
const chaltteokImage = "/images/icc-4.webp";
const chatbotIcon = "/images/icc-5.webp";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [
  { title: "홈", url: "/", icon: LayoutDashboard },
  { title: "매출/매입", url: "/transactions", icon: Receipt },
  { title: "직원", url: "/employees", icon: Users },
  { title: "자금", url: "/funds", icon: Wallet },
  { title: "리포트", url: "/reports", icon: TrendingUp },
];

interface PCLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export function PCLayout({ children, title = "김비서", subtitle }: PCLayoutProps) {
  const navigate = useNavigate();
  const { openVoice, isOpen: isVoiceOpen } = useVoice();
  const { isOpen: isChatOpen } = useChat();
  const [collapsed, setCollapsed] = useState(false);

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
        "flex-shrink-0 border-r bg-card/50 backdrop-blur-sm flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* 로고 영역 */}
        <div className={cn("border-b", collapsed ? "p-3" : "p-6")}>
          <div 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/profile")}
          >
            <img 
              src={chaltteokImage} 
              alt="찰떡이" 
              className={cn(
                "object-contain transition-all",
                collapsed ? "h-10 w-10 mx-auto" : "h-12 w-12 mb-3"
              )} 
            />
            {!collapsed && (
              <>
                <h1 className="text-lg font-bold text-foreground leading-tight">
                  {title?.includes("안녕하세요,") ? (
                    <>
                      안녕하세요,<br />
                      {title.replace("안녕하세요, ", "")}
                    </>
                  ) : title}
                </h1>
                {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              </>
            )}
          </div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className={cn("flex-1 space-y-1", collapsed ? "p-2" : "p-4")}>
          {navItems.map((item) => (
            <Tooltip key={item.title} delayDuration={0}>
              <TooltipTrigger asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className={cn(
                    "flex items-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground",
                    collapsed ? "justify-center p-3" : "gap-3 px-4 py-3"
                  )}
                  activeClassName="bg-primary/10 text-primary font-medium"
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  {item.title}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </nav>

        {/* 하단 유틸리티 */}
        <div className={cn("border-t space-y-1", collapsed ? "p-2" : "p-4")}>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-muted-foreground hover:text-foreground",
                  collapsed ? "justify-center p-3" : "justify-start gap-3"
                )}
                onClick={() => navigate("/notifications")}
              >
                <div className="relative flex-shrink-0">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                    2
                  </span>
                </div>
                {!collapsed && <span>알림</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">알림</TooltipContent>}
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-muted-foreground hover:text-foreground",
                  collapsed ? "justify-center p-3" : "justify-start gap-3"
                )}
                onClick={() => navigate("/settings")}
              >
                <Settings className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>설정</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">설정</TooltipContent>}
          </Tooltip>

          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-muted-foreground hover:text-foreground",
                  collapsed ? "justify-center p-3" : "justify-start gap-3"
                )}
                onClick={() => navigate("/help")}
              >
                <HelpCircle className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>도움말</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right">도움말</TooltipContent>}
          </Tooltip>

          {/* 사이드바 접기/펼치기 버튼 */}
          <Button
            variant="ghost"
            className={cn(
              "w-full text-muted-foreground hover:text-foreground",
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
        <div className="max-w-6xl mx-auto p-6">
          {children}
        </div>

        {/* 플로팅 음성 버튼 */}
        {!isVoiceOpen && !isChatOpen && (
          <Button
            onClick={openVoice}
            size="lg"
            className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 bg-primary hover:bg-primary/90 p-2 animate-bounce-subtle"
          >
            <img src={chatbotIcon} alt="김비서" className="h-10 w-auto object-contain opacity-95" />
          </Button>
        )}
      </main>

      {/* AI 채팅 패널 */}
      <AIChatPanel />

      {/* 음성 오버레이 */}
      <VoiceOverlay />
    </div>
  );
}
