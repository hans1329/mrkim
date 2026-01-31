import { useState } from "react";
import { AlertTriangle, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UrgentAlert {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

// Mock urgent alerts - 실제로는 AI 엔진에서 생성
const mockUrgentAlerts: UrgentAlert[] = [
  {
    id: "1",
    title: "부가세 신고 마감 임박",
    description: "1월 25일까지 부가세 신고를 완료해야 합니다.",
    actionLabel: "확인하기",
    onAction: () => {},
  },
];

export function UrgentAlertBanner() {
  const [alerts, setAlerts] = useState<UrgentAlert[]>(mockUrgentAlerts);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visibleAlerts = alerts.filter(alert => !dismissed.includes(alert.id));

  if (visibleAlerts.length === 0) return null;

  const currentAlert = visibleAlerts[0];

  const handleDismiss = (id: string) => {
    setDismissed(prev => [...prev, id]);
  };

  return (
    <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-semibold text-sm text-destructive">
                {currentAlert.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentAlert.description}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 -mt-1 -mr-1"
              onClick={() => handleDismiss(currentAlert.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs mt-2"
            onClick={currentAlert.onAction}
          >
            {currentAlert.actionLabel}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
      
      {visibleAlerts.length > 1 && (
        <div className="mt-2 pt-2 border-t border-destructive/20">
          <span className="text-xs text-muted-foreground">
            +{visibleAlerts.length - 1}개의 알림이 더 있습니다
          </span>
        </div>
      )}
    </div>
  );
}
