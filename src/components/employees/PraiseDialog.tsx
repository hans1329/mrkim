import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import {
  useEmployeePraises,
  useAddPraise,
  PRAISE_TAGS,
} from "@/hooks/useEmployeePraises";

interface PraiseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeName: string;
  employeePhone: string;
}

export function PraiseDialog({
  open,
  onOpenChange,
  employeeName,
  employeePhone,
}: PraiseDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const { data: praises, isLoading } = useEmployeePraises(employeeName, employeePhone);
  const addPraise = useAddPraise();

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (selectedTags.length === 0 && !comment.trim()) {
      toast.error("태그 또는 코멘트를 입력해주세요");
      return;
    }

    addPraise.mutate(
      {
        employee_name: employeeName,
        employee_phone: employeePhone,
        tags: selectedTags,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("칭찬이 등록되었습니다 🎉");
          setSelectedTags([]);
          setComment("");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error.message || "등록에 실패했습니다");
        },
      }
    );
  };

  // 태그별 집계
  const tagCounts: Record<string, number> = {};
  praises?.forEach((p) => {
    p.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            {employeeName} 칭찬하기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 기존 칭찬 요약 */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : praises && praises.length > 0 ? (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                받은 칭찬 {praises.length}개
              </p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(tagCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([tag, count]) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag} ×{count}
                    </Badge>
                  ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              아직 칭찬 기록이 없습니다. 첫 번째 칭찬을 남겨보세요!
            </p>
          )}

          {/* 칭찬 태그 선택 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">칭찬 태그 선택</p>
            <div className="flex flex-wrap gap-2">
              {PRAISE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    selectedTags.includes(tag)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted"
                  }`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* 자유 코멘트 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">한마디 (선택)</p>
            <Textarea
              placeholder="칭찬 한마디를 남겨주세요..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            닫기
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addPraise.isPending || (selectedTags.length === 0 && !comment.trim())}
          >
            <ThumbsUp className="mr-1.5 h-4 w-4" />
            {addPraise.isPending ? "등록 중..." : "칭찬 등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
