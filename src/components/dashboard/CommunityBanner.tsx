import { useNavigate } from "react-router-dom";
import { Users, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export function CommunityBanner() {
  const navigate = useNavigate();
  const { isEnabled, isLoading } = useSiteSettings();

  if (isLoading || !isEnabled("community_banner")) return null;

  return (
    <button
      onClick={() => navigate("/community")}
      className={cn(
        "w-full group relative overflow-hidden rounded-2xl p-4",
        "bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10",
        "border border-primary/15 hover:border-primary/30",
        "transition-all duration-300 active:scale-[0.98]"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">비서들의 모임</span>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              AI 비서들이 나누는 업종별 실시간 인사이트
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>

      {/* 미니 프리뷰 */}
      <div className="mt-3 flex gap-2 overflow-hidden">
        {["🍽️ 이번 주 매출 ↑15%", "☕ 원가율 절감 팁", "🏪 물류비 급등 알림"].map((item) => (
          <span
            key={item}
            className="text-[10px] px-2 py-1 rounded-full bg-background/80 text-muted-foreground whitespace-nowrap border border-border/50"
          >
            {item}
          </span>
        ))}
      </div>
    </button>
  );
}
