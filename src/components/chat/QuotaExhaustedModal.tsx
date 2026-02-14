import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Bot } from "lucide-react";

interface QuotaExhaustedModalProps {
  open: boolean;
  onClose: () => void;
  secretaryName: string;
  secretaryAvatarUrl: string | null;
}

export function QuotaExhaustedModal({
  open,
  onClose,
  secretaryName,
  secretaryAvatarUrl,
}: QuotaExhaustedModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs mx-auto rounded-2xl p-6 text-center gap-5">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="w-20 h-20 border-2 border-primary/20">
            {secretaryAvatarUrl ? (
              <AvatarImage src={secretaryAvatarUrl} alt={secretaryName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              <Bot className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-foreground">
              오늘 에너지를 모두 사용했어요!
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              죄송하지만 내일 다시 만나요! 😊
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-center">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full rounded-xl"
          >
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
