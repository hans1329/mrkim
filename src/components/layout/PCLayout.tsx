import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Receipt, 
  Users, 
  Wallet, 
  MoreHorizontal,
  Bell,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";
import { useVoice } from "@/contexts/VoiceContext";
import { VoiceOverlay } from "@/components/voice/VoiceOverlay";
import chaltteokImage from "@/assets/icc-4.webp";
import chatbotIcon from "@/assets/icc-blue.webp";

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
  const { openVoice, isOpen } = useVoice();

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* 좌측 네비게이션 사이드바 */}
      <aside className="w-64 flex-shrink-0 border-r bg-card/50 backdrop-blur-sm flex flex-col">
        {/* 로고 영역 */}
        <div className="p-6 border-b">
          <div 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/profile")}
          >
            <img src={chaltteokImage} alt="찰떡이" className="h-12 w-12 object-contain mb-3" />
            <h1 className="text-lg font-bold text-foreground leading-tight">
              {title?.includes("안녕하세요,") ? (
                <>
                  안녕하세요,<br />
                  {title.replace("안녕하세요, ", "")}
                </>
              ) : title}
            </h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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

      {/* 메인 콘텐츠 - 풀스크린 with max-width constraint */}
      <main className="flex-1 overflow-auto relative">
        <div className="max-w-4xl mx-auto p-6">
          {children}
        </div>

        {/* 플로팅 음성 버튼 */}
        {!isOpen && (
          <Button
            onClick={openVoice}
            size="lg"
            className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 bg-white hover:bg-white/90 p-1 animate-bounce-subtle"
          >
            <img src={chatbotIcon} alt="김비서" className="h-12 w-12 object-contain" />
          </Button>
        )}
      </main>

      {/* 음성 오버레이 */}
      <VoiceOverlay />
    </div>
  );
}
