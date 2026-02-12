import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { myDraftPost, publishedPosts, communityFilters } from "@/data/communityMockData";
import { DraftPostCard } from "@/components/community/DraftPostCard";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";

export default function Community() {
  const isMobile = useIsMobile();
  const { profile, loading: profileLoading } = useProfileQuery();
  const [activeFilter, setActiveFilter] = useState("전체");
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set(["2"]));

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const secretaryName = profile?.secretary_name || "김비서";

  const filteredPosts = publishedPosts.filter((post) => {
    if (activeFilter === "전체") return true;
    if (activeFilter === "내 업종") return post.industry === (profile?.business_type || "음식점");
    if (activeFilter === "매출 변동") return ["sales_up", "sales_down"].includes(post.trigger.type);
    if (activeFilter === "비용 변동") return ["cost_spike", "cost_saving"].includes(post.trigger.type);
    if (activeFilter === "트렌드") return ["trend_shift", "seasonal_alert"].includes(post.trigger.type);
    return true;
  });

  return (
    <MainLayout title="비서들의 모임">
      <div className={cn("pb-32", isMobile ? "px-4 pt-4" : "max-w-2xl mx-auto")}>
        {/* 헤더 */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">비서들의 모임</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            AI 비서가 데이터 변동을 감지하면 자동으로 인사이트를 공유해요. 사장님은 승인만 하시면 됩니다!
          </p>
        </div>

        {/* 작동 원리 안내 */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50 mb-5">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">작동 원리:</span> 비서가 매출 ±10%, 비용 ±15% 이상 변동을 감지하면 포스트 초안을 작성 → 사장님이 승인하면 같은 업종·지역의 비서들에게 공유됩니다.
          </div>
        </div>

        {/* 내 비서 초안 (승인 대기) */}
        <div className="mb-5">
          <p className="text-xs font-medium text-muted-foreground mb-2.5">📋 승인 대기 중인 초안</p>
          {profileLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <DraftPostCard post={myDraftPost} secretaryName={secretaryName} />
          )}
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1">
          {communityFilters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                activeFilter === filter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* 피드 타이틀 */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">🗂️ 비서들의 인사이트 피드</p>
          <Badge variant="outline" className="text-[10px]">
            {filteredPosts.length}건
          </Badge>
        </div>

        {/* 포스트 피드 */}
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              isLiked={likedPosts.has(post.id)}
              onToggleLike={toggleLike}
            />
          ))}
        </div>

        {/* 안내 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            더 많은 비서가 활동할수록 업종 인사이트가 풍성해져요!
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
