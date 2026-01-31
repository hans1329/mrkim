import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, ChevronRight, MessageCircle, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";

type ActionPriority = "urgent" | "warning" | "normal";
type ActionStatus = "pending" | "completed" | "postponed";

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: ActionPriority;
  dueText?: string;
  status: ActionStatus;
  actions: {
    primary: { label: string; action: () => void };
    secondary?: { label: string; action: () => void };
  };
}

const priorityConfig = {
  urgent: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    badge: "bg-destructive text-destructive-foreground",
  },
  warning: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    badge: "bg-warning text-warning-foreground",
  },
  normal: {
    icon: CheckCircle2,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    badge: "bg-success text-success-foreground",
  },
};

// Mock action items - 실제로는 AI 엔진에서 생성
const mockActionItems: ActionItem[] = [
  {
    id: "1",
    title: "부가세 신고 준비",
    description: "25일까지 신고 필요합니다. 매입세액 정리를 확인하세요.",
    priority: "urgent",
    dueText: "D-3",
    status: "pending",
    actions: {
      primary: { label: "세무사에게 전달", action: () => {} },
      secondary: { label: "확인 완료", action: () => {} },
    },
  },
  {
    id: "2",
    title: "급여일 준비",
    description: "4대보험료 변동 확인이 필요합니다. 신규 입사자 반영 여부를 체크하세요.",
    priority: "warning",
    dueText: "D-7",
    status: "pending",
    actions: {
      primary: { label: "확인하기", action: () => {} },
      secondary: { label: "다음에", action: () => {} },
    },
  },
  {
    id: "3",
    title: "이번 달 매출 정상",
    description: "전월 대비 12% 증가했습니다. 특별히 조치할 사항이 없습니다.",
    priority: "normal",
    status: "pending",
    actions: {
      primary: { label: "상세 보기", action: () => {} },
    },
  },
];

export function TodayActionsCard() {
  const [items, setItems] = useState<ActionItem[]>(mockActionItems);

  const handleComplete = (id: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, status: "completed" as ActionStatus } : item
      )
    );
  };

  const handlePostpone = (id: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, status: "postponed" as ActionStatus } : item
      )
    );
  };

  const pendingItems = items.filter(item => item.status === "pending");
  const completedCount = items.filter(item => item.status === "completed").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            오늘의 할 일
          </CardTitle>
          {completedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {completedCount}/{items.length} 완료
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {pendingItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
            <p className="text-sm">모든 할 일을 완료했습니다! 🎉</p>
          </div>
        ) : (
          pendingItems.map((item) => {
            const config = priorityConfig[item.priority];
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg border p-3 transition-all",
                  config.bg,
                  config.border
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 shrink-0", config.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{item.title}</span>
                      {item.dueText && (
                        <Badge className={cn("text-[10px] px-1.5 py-0", config.badge)}>
                          {item.dueText}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        variant={item.priority === "urgent" ? "default" : "outline"}
                        className="h-7 text-xs px-3"
                        onClick={() => handleComplete(item.id)}
                      >
                        {item.actions.primary.label}
                      </Button>
                      {item.actions.secondary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-3"
                          onClick={() => handlePostpone(item.id)}
                        >
                          {item.actions.secondary.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* 김비서에게 더 물어보기 */}
        <button className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2">
          <MessageCircle className="h-3.5 w-3.5" />
          김비서에게 더 물어보기
          <ChevronRight className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}
