import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingOverlayProps {
  children: ReactNode;
  isConnected: boolean;
  connectionType: "hometax" | "card" | "account";
  onConnect?: () => void;
}

const connectionLabels = {
  hometax: "국세청",
  card: "카드",
  account: "계좌",
};

export function OnboardingOverlay({
  children,
  isConnected,
  connectionType,
  onConnect,
}: OnboardingOverlayProps) {
  if (isConnected) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* 블러 처리된 콘텐츠 */}
      <div className="blur-[6px] pointer-events-none select-none">
        {children}
      </div>

      {/* 오버레이 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg">
        <div className="text-center space-y-3 p-4">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-muted">
            <Link2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {connectionLabels[connectionType]} 연결이 필요해요
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              데이터를 연결하면 자동으로 분석해드려요
            </p>
          </div>
          <Button size="sm" onClick={onConnect} className="mt-2">
            연결하기
          </Button>
        </div>
      </div>
    </div>
  );
}
