import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Receipt, Users, Wallet, TrendingUp } from "lucide-react";
import { useVoice } from "@/contexts/VoiceContext";
import { useChat } from "@/contexts/ChatContext";
import { useProfileQuery } from "@/hooks/useProfileQuery";

const DEFAULT_ICON = "/images/icc-5.webp";

// 기본 아이콘 프리로딩
const preloadIcon = new Image();
preloadIcon.src = DEFAULT_ICON;

const leftNav = [
  { title: "홈", url: "/", icon: LayoutDashboard },
  { title: "매출/매입", url: "/transactions", icon: Receipt },
];

const rightNav = [
  { title: "자금", url: "/funds", icon: Wallet },
  { title: "리포트", url: "/reports", icon: TrendingUp },
];

export function BottomNav() {
  const { isOpen: isVoiceOpen, openVoice } = useVoice();
  const { isOpen: isChatOpen } = useChat();
  const { profile } = useProfileQuery();
  
  const avatarUrl = profile?.secretary_avatar_url || null;
  const imgSrc = avatarUrl || DEFAULT_ICON;

  return (
    <nav className="flex-shrink-0 mx-3 rounded-full bg-white border border-border/50 shadow-[0_-2px_20px_rgba(0,0,0,0.1)]" style={{ marginBottom: '0px' }}>
      <div className="relative flex h-16 items-center justify-around px-2">
        {/* 좌측 메뉴 */}
        {leftNav.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/"}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-muted-foreground/40 transition-colors"
            )}
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[11px] font-normal">{item.title}</span>
          </NavLink>
        ))}

        {/* 중앙 김비서 FAB */}
        <div className="flex flex-1 items-center justify-center">
          <button
            onClick={openVoice}
            className={cn(
              "relative -mt-8 flex h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30 transition-all active:scale-95 overflow-hidden ring-4 ring-background",
              (isVoiceOpen || isChatOpen) && "opacity-0 pointer-events-none"
            )}
          >
            <img
              src={imgSrc}
              alt="김비서"
              className={cn(
                "rounded-full",
                avatarUrl
                  ? "h-full w-full object-cover"
                  : "h-9 w-9 object-contain"
              )}
              loading="eager"
              fetchPriority="high"
            />
          </button>
        </div>

        {/* 우측 메뉴 */}
        {rightNav.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/"}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-muted-foreground/40 transition-colors"
            )}
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[11px] font-normal">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
