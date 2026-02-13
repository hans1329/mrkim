import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartyPopper, Sparkles } from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  userName?: string;
  onStart: () => void;
}

export function WelcomeModal({ open, userName, onStart }: WelcomeModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onStart()}>
      <DialogContent 
        className="sm:max-w-md text-center border-0 bg-gradient-to-b from-primary to-primary/90"
      >
        <div className="flex flex-col items-center gap-6 py-6">
          {/* 축하 아이콘 */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary-foreground/20 flex items-center justify-center">
              <PartyPopper className="w-10 h-10 text-primary-foreground" />
            </div>
            <Sparkles className="w-6 h-6 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
            <Sparkles className="w-4 h-4 text-yellow-300 absolute -bottom-1 -left-1 animate-pulse delay-150" />
          </div>

          {/* 축하 메시지 */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary-foreground">
              가입을 축하합니다! 🎉
            </h2>
            <p className="text-primary-foreground/80">
              {userName ? `${userName}님, ` : ""}AI 비서와 함께<br />
              더 스마트한 사업 관리를 시작하세요
            </p>
          </div>

          {/* 시작 버튼 */}
          <Button 
            onClick={onStart}
            className="w-full max-w-xs h-12 bg-white text-primary hover:bg-white/90 font-semibold text-base"
          >
            시작하기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
