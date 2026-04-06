import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useConnectionDrawer } from "@/contexts/ConnectionDrawerContext";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, ChevronRight, MessageCircle, CalendarClock, Link2, TrendingUp, TrendingDown, FileText, Tags, Wallet, ArrowLeftRight, Banknote } from "lucide-react";
import { cn, josa } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useChat } from "@/contexts/ChatContext";
import { useConnection } from "@/contexts/ConnectionContext";
import { useActionData } from "@/hooks/useDashboardStats";
import { formatCurrency } from "@/data/mockData";

type ActionPriority = "urgent" | "warning" | "normal";
type ActionStatus = "pending" | "completed" | "postponed";

interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: ActionPriority;
  dueText?: string;
  status: ActionStatus;
  icon?: React.ElementType;
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

interface TodayActionsCardProps {
  isLoggedOut?: boolean;
}

export function TodayActionsCard({ isLoggedOut = false }: TodayActionsCardProps) {
  const navigate = useNavigate();
  const { openDrawer } = useConnectionDrawer();
  const { openChat } = useChat();
  const { profile, profileLoading: loading, isAnyConnected } = useConnection();
  const [statusOverrides, setStatusOverrides] = useState<Record<string, ActionStatus>>({});
  
  const secretaryName = profile?.secretary_name || "김비서";
  
  // React Query 캐싱 적용
  const { data: actionData, isLoading: actionLoading } = useActionData(
    !isLoggedOut && !loading && !!isAnyConnected
  );

  // 액션 아이템 생성 (메모이제이션)
  const items = useMemo(() => {
    if (isLoggedOut) {
      return [
        {
          id: "vat-mock",
          title: "부가세 신고 준비",
          description: "1월 25일까지 부가세 신고가 필요합니다. 매입/매출 세금계산서를 확인하세요.",
          priority: "warning" as ActionPriority,
          dueText: "D-7",
          status: "pending" as ActionStatus,
          icon: FileText,
          actions: {
            primary: { label: "세금계산서 확인", action: () => {} },
            secondary: { label: "확인 완료", action: () => {} },
          },
        },
        {
          id: "unclassified-mock",
          title: "미분류 거래 12건",
          description: "거래를 분류하면 더 정확한 리포트를 받을 수 있어요.",
          priority: "normal" as ActionPriority,
          status: "pending" as ActionStatus,
          icon: Tags,
          actions: {
            primary: { label: "분류하기", action: () => {} },
            secondary: { label: "나중에", action: () => {} },
          },
        },
      ];
    }

    if (!isAnyConnected && !loading) {
      return [{
        id: "connection",
        title: `${secretaryName}에게 데이터 연동하기`,
        description: "국세청, 카드, 계좌를 연동하면 실시간으로 매출/지출을 분석해드려요.",
        priority: "urgent" as ActionPriority,
        dueText: "D-0",
        status: "pending" as ActionStatus,
        icon: Link2,
        actions: {
          primary: { label: "연동 시작하기", action: () => openDrawer("hometax") },
        },
      }];
    }

    if (!actionData) return [];

    const actionItems: ActionItem[] = [];
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // 1. 세금 납부 마감일 (당일 포함 + 3일 이내)
    const taxDeadlines = [
      { month: 1, day: 25, label: "부가세 납부", navTab: "tax" },
      { month: 3, day: 31, label: "법인세 납부", navTab: "tax" },
      { month: 5, day: 31, label: "종합소득세 납부", navTab: "expense" },
      { month: 7, day: 25, label: "부가세 납부", navTab: "tax" },
      { month: 10, day: 25, label: "부가세 예정 납부", navTab: "tax" },
    ];

    for (const td of taxDeadlines) {
      if (currentMonth === td.month) {
        const daysUntil = td.day - currentDay;
        if (daysUntil >= 0 && daysUntil <= 7) {
          const priority: ActionPriority = daysUntil === 0 ? "urgent" : daysUntil <= 3 ? "warning" : "normal";
          actionItems.push({
            id: `tax-${td.month}-${td.day}`,
            title: daysUntil === 0 ? `오늘 ${td.label} 마감일입니다` : `${td.label} 마감 D-${daysUntil}`,
            description: `${currentMonth}월 ${td.day}일까지 ${td.label}을 완료해주세요.`,
            priority,
            dueText: daysUntil === 0 ? "오늘" : `D-${daysUntil}`,
            status: "pending",
            icon: Banknote,
            actions: {
              primary: { label: "세금 확인", action: () => navigate(`/reports?tab=${td.navTab}`) },
              secondary: { label: "완료", action: () => {} },
            },
          });
        }
      }
    }

    // 2. 급여 지급일 알림 (D-day 및 리마인더)
    if (actionData.employeesForSalary.count > 0) {
      const reminderDays = actionData.salaryReminderDays;
      
      for (const dayGroup of actionData.employeesForSalary.individualDays) {
        const daysUntil = dayGroup.day - currentDay;
        
        if (daysUntil === 0) {
          // 오늘이 급여일
          actionItems.push({
            id: `salary-today-${dayGroup.day}`,
            title: `오늘 급여 지급일입니다`,
            description: `${dayGroup.count}명, 총 ${formatCurrency(dayGroup.total)} 지급 예정`,
            priority: "urgent",
            dueText: "오늘",
            status: "pending",
            icon: Wallet,
            actions: {
              primary: { label: "직원 관리", action: () => navigate("/employees") },
              secondary: { label: "지급 완료", action: () => {} },
            },
          });
        } else if (daysUntil > 0 && daysUntil <= reminderDays) {
          // 급여일 임박 리마인더
          actionItems.push({
            id: `salary-remind-${dayGroup.day}`,
            title: `급여 지급 D-${daysUntil}`,
            description: `${dayGroup.count}명, 총 ${formatCurrency(dayGroup.total)} 지급 예정 (매월 ${dayGroup.day}일)`,
            priority: "warning",
            dueText: `D-${daysUntil}`,
            status: "pending",
            icon: Wallet,
            actions: {
              primary: { label: "직원 확인", action: () => navigate("/employees") },
              secondary: { label: "확인 완료", action: () => {} },
            },
          });
        }
      }
    }

    // 3. 오늘 예정 자동이체
    if (actionData.todayAutoTransfers.count > 0) {
      actionItems.push({
        id: "auto-transfer-today",
        title: `오늘 자동이체 ${actionData.todayAutoTransfers.count}건 예정`,
        description: `총 ${formatCurrency(actionData.todayAutoTransfers.totalAmount)} · ${actionData.todayAutoTransfers.names.join(", ")}`,
        priority: "warning",
        dueText: "오늘",
        status: "pending",
        icon: ArrowLeftRight,
        actions: {
          primary: { label: "이체 확인", action: () => navigate("/funds") },
          secondary: { label: "확인 완료", action: () => {} },
        },
      });
    }

    // 4. 매출 비교
    if (actionData.lastMonthIncome > 0 && actionData.thisMonthIncome > 0) {
      const changePercent = Math.round(((actionData.thisMonthIncome - actionData.lastMonthIncome) / actionData.lastMonthIncome) * 100);
      if (changePercent >= 10) {
        actionItems.push({
          id: "sales-up",
          title: "이번 달 매출 증가 🎉",
          description: `전월 대비 ${changePercent}% 증가했습니다. 좋은 흐름을 유지하세요!`,
          priority: "normal",
          status: "pending",
          icon: TrendingUp,
          actions: { primary: { label: "상세 보기", action: () => navigate("/reports?tab=sales") } },
        });
      } else if (changePercent <= -10) {
        actionItems.push({
          id: "sales-down",
          title: "매출 감소 주의",
          description: `전월 대비 ${Math.abs(changePercent)}% 감소했습니다. 원인을 분석해보세요.`,
          priority: "warning",
          status: "pending",
          icon: TrendingDown,
          actions: {
            primary: { label: "분석 보기", action: () => navigate("/reports?tab=sales") },
            secondary: { label: "다음에", action: () => {} },
          },
        });
      }
    }

    // 5. 미분류 거래
    if (actionData.unclassifiedCount > 0) {
      actionItems.push({
        id: "unclassified",
        title: `미분류 거래 ${actionData.unclassifiedCount}건`,
        description: "거래를 분류하면 더 정확한 리포트를 받을 수 있어요.",
        priority: actionData.unclassifiedCount >= 10 ? "warning" : "normal",
        status: "pending",
        icon: Tags,
        actions: {
          primary: { label: "분류하기", action: () => navigate("/transactions") },
          secondary: { label: "나중에", action: () => {} },
        },
      });
    }

    // 6. 모든 할 일 없으면 긍정 메시지
    if (actionItems.length === 0) {
      actionItems.push({
        id: "all-good",
        title: "오늘은 특별히 할 일이 없어요",
        description: `모든 것이 순조롭습니다. ${josa(secretaryName, "이/가")} 계속 모니터링하고 있어요.`,
        priority: "normal",
        status: "pending",
        icon: CheckCircle2,
        actions: { primary: { label: "리포트 보기", action: () => navigate("/reports") } },
      });
    }

    // 우선순위 정렬: urgent → warning → normal
    const priorityOrder = { urgent: 0, warning: 1, normal: 2 };
    actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return actionItems;
  }, [isLoggedOut, isAnyConnected, loading, actionData, secretaryName, navigate]);

  // 상태 오버라이드 적용
  const itemsWithStatus = items.map(item => ({
    ...item,
    status: statusOverrides[item.id] || item.status,
  }));

  const handleComplete = (id: string) => {
    setStatusOverrides(prev => ({ ...prev, [id]: "completed" }));
  };

  const handlePostpone = (id: string) => {
    setStatusOverrides(prev => ({ ...prev, [id]: "postponed" }));
  };

  const pendingItems = itemsWithStatus.filter(item => item.status === "pending");
  const completedCount = itemsWithStatus.filter(item => item.status === "completed").length;

  const isLoading = loading || actionLoading;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          {isLoading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                오늘의 할 일
              </CardTitle>
              {completedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {completedCount}/{itemsWithStatus.length} 완료
                </Badge>
              )}
            </>
          )}
        </div>
      </CardHeader>
      {isLoading ? (
        <CardContent className="space-y-3 pt-0">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </CardContent>
      ) : (
        <CardContent className="space-y-3 pt-0">
          {pendingItems.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-sm">모든 할 일을 완료했습니다! 🎉</p>
            </div>
          ) : (
            pendingItems.map((item) => {
              const config = priorityConfig[item.priority];
              const Icon = item.icon || config.icon;

              return (
                <div key={item.id} className="py-3 first:pt-0 last:pb-0 border-b border-border/30 last:border-b-0 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5 shrink-0", item.id === "connection" ? "text-primary" : config.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{item.title}</span>
                        {item.dueText && (
                          <Badge className={cn("text-[10px] px-1.5 py-0", item.id === "connection" ? "bg-primary text-primary-foreground" : config.badge)}>
                            {item.dueText}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      )}
      {!isLoading && pendingItems.length > 0 && (
        <CardFooter className="flex-col gap-2 pt-0">
          <button 
            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={() => openChat()}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {secretaryName}에게 더 물어보기
            <ChevronRight className="h-3 w-3" />
          </button>
          {pendingItems.map((item) => (
            <div key={`btn-${item.id}`} className={cn("w-full", item.actions.secondary ? "grid grid-cols-2 gap-2" : "")}>
              <Button
                size="sm"
                variant={item.priority === "urgent" ? "default" : "outline"}
                className="h-9 rounded-full w-full"
                onClick={() => {
                  item.actions.primary.action();
                  if (item.id !== "connection") handleComplete(item.id);
                }}
              >
                {item.actions.primary.label}
              </Button>
              {item.actions.secondary && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 rounded-full w-full border border-border/50"
                  onClick={() => handlePostpone(item.id)}
                >
                  {item.actions.secondary.label}
                </Button>
              )}
            </div>
          ))}
        </CardFooter>
      )}
    </Card>
  );
}
