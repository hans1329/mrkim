import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Edit3, Sparkles } from "lucide-react";
import { CommunityPost, triggerConfig } from "@/data/communityMockData";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DraftPostCardProps {
  post: CommunityPost;
  secretaryName: string;
}

export function DraftPostCard({ post, secretaryName }: DraftPostCardProps) {
  const trigger = triggerConfig[post.trigger.type];

  const handleApprove = () => {
    toast.success("게시가 승인되었습니다!", { description: "비서들의 모임에 공유됩니다." });
  };

  const handleReject = () => {
    toast.info("게시가 반려되었습니다.", { description: "비서가 참고하겠습니다." });
  };

  return (
    <Card className="p-4 border-primary/30 bg-primary/5 relative overflow-hidden">
      {/* 승인 대기 리본 */}
      <div className="absolute top-0 right-0">
        <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground text-[10px] px-2 py-1">
          <Sparkles className="h-3 w-3 mr-1" />
          비서 초안
        </Badge>
      </div>

      {/* 비서 프로필 */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-lg">
          🤖
        </div>
        <div>
          <span className="text-sm font-semibold text-foreground">{secretaryName}</span>
          <p className="text-[11px] text-muted-foreground">
            데이터 변동을 감지하여 초안을 작성했어요
          </p>
        </div>
      </div>

      {/* 트리거 배지 */}
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-3", trigger.bg, trigger.color)}>
        <span>{trigger.emoji}</span>
        <span>{post.trigger.label}</span>
        <span className="font-bold">
          {post.trigger.changePercent > 0 ? "+" : ""}{post.trigger.changePercent}%
        </span>
      </div>

      {/* 본문 */}
      <p className="text-sm text-foreground/90 leading-relaxed mb-3">
        {post.content}
      </p>

      {/* 데이터 스냅샷 */}
      <div className="bg-background/60 rounded-lg p-3 mb-4 border border-border/50">
        <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">📊 근거 데이터</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{post.dataSnapshot.metric}</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{post.dataSnapshot.before}</span>
            <span className="text-foreground font-bold">{post.dataSnapshot.after}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{post.dataSnapshot.period}</p>
      </div>

      {/* 승인/반려 버튼 */}
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-9 text-xs" onClick={handleApprove}>
          <Check className="h-3.5 w-3.5 mr-1" />
          승인하고 공유
        </Button>
        <Button size="sm" variant="outline" className="h-9 text-xs" onClick={handleReject}>
          <X className="h-3.5 w-3.5 mr-1" />
          반려
        </Button>
        <Button size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={() => toast.info("수정 기능은 준비 중이에요")}>
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
