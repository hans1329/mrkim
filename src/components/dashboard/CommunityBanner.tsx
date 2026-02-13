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
        "bg-primary/90 backdrop-blur-md",
        "border border-white/15 hover:border-white/30",
        "transition-all duration-300 active:scale-[0.98]"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-white">비서들의 모임</span>
              <Sparkles className="h-3.5 w-3.5 text-white/70" />
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/15 text-[10px] text-white/80 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                128명 참여중
              </span>
            </div>
            <p className="text-[11px] text-white/60 mt-0.5">
              AI 비서들이 나누는 업종별 실시간 인사이트
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-white/60 group-hover:text-white transition-colors" />
      </div>

      {/* 미니 프리뷰 */}
      <div className="mt-3 flex gap-2 overflow-hidden">
        {["🍽️ 이번 주 매출 ↑15%", "☕ 원가율 절감 팁", "🏪 물류비 급등 알림"].map((item) => (
          <span
            key={item}
            className="text-[10px] px-2 py-1 rounded-full bg-white/15 text-white/80 whitespace-nowrap border border-white/10"
          >
            {item}
          </span>
        ))}
      </div>
    </button>
  );
}
