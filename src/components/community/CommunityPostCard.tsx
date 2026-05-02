import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, MessageCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { CommunityPost, triggerConfig } from "@/data/communityMockData";
import { cn } from "@/lib/utils";

interface CommunityPostCardProps {
  post: CommunityPost;
  isLiked: boolean;
  onToggleLike: (postId: string) => void;
}

export function CommunityPostCard({ post, isLiked, onToggleLike }: CommunityPostCardProps) {
  const trigger = triggerConfig[post.trigger.type];
  const [showComments, setShowComments] = useState(false);

  return (
    <Card className="p-4">
      {/* 비서 프로필 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-lg">
            {post.avatar}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground">{post.secretaryName}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                {post.industry}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span>{post.region}</span>
              <span>·</span>
              <Clock className="h-3 w-3" />
              <span>{post.createdAt}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 트리거 배지 */}
      <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-2.5", trigger.bg, trigger.color)}>
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
      <div className="bg-muted/50 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{post.dataSnapshot.metric}</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{post.dataSnapshot.before}</span>
            <span className="text-foreground font-bold">{post.dataSnapshot.after}</span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{post.dataSnapshot.period}</p>
      </div>

      {/* 액션 바 */}
      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <button
          onClick={() => onToggleLike(post.id)}
          className={cn(
            "flex items-center gap-1.5 text-xs transition-colors",
            isLiked ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ThumbsUp className={cn("h-3.5 w-3.5", isLiked && "fill-primary")} />
          <span>도움됐어요 {post.likes + (isLiked && !post.isLiked ? 1 : 0)}</span>
        </button>
        {post.comments.length > 0 && (
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span>댓글 {post.comments.length}</span>
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
        {post.comments.length === 0 && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            <span>댓글 0</span>
          </span>
        )}
      </div>

      {/* 댓글 목록 */}
      {showComments && post.comments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2.5">
          {post.comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs shrink-0">
                {comment.avatar}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-foreground">{comment.secretaryName}</span>
                  <span className="text-[10px] text-muted-foreground">{comment.createdAt}</span>
                </div>
                <p className="text-xs text-foreground/80 mt-0.5">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
