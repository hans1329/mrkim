import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertTriangle, ChevronRight, MessageCircle, CalendarClock, Link2, TrendingUp, TrendingDown, FileText, Tags } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useChat } from "@/contexts/ChatContext";

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
  const { openChat } = useChat();
  const { profile, loading } = useProfile();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // 연동 상태 확인
  const isAnyConnected = profile?.hometax_connected || profile?.card_connected || profile?.account_connected;
  
  // 실데이터 기반 할 일 생성
  useEffect(() => {
    const fetchActionItems = async () => {
      // 로그아웃 상태: 목업 할 일 표시
      if (isLoggedOut) {
        setItems([
          {
            id: "vat-mock",
            title: "부가세 신고 준비",
            description: "1월 25일까지 부가세 신고가 필요합니다. 매입/매출 세금계산서를 확인하세요.",
            priority: "warning",
            dueText: "D-7",
            status: "pending",
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
            priority: "normal",
            status: "pending",
            icon: Tags,
            actions: {
              primary: { label: "분류하기", action: () => {} },
              secondary: { label: "나중에", action: () => {} },
            },
          },
        ]);
        setDataLoading(false);
        return;
      }

      if (loading) return;
      
      setDataLoading(true);
      
      // 미연동 시 연동 안내
      if (!isAnyConnected) {
        setItems([{
          id: "connection",
          title: "김비서에게 데이터 연동하기",
          description: "국세청, 카드, 계좌를 연동하면 실시간으로 매출/지출을 분석해드려요.",
          priority: "urgent",
          dueText: "D-0",
          status: "pending",
          icon: Link2,
          actions: {
            primary: { 
              label: "연동 시작하기", 
              action: () => navigate("/onboarding") 
            },
          },
        }]);
        setDataLoading(false);
        return;
      }
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setDataLoading(false);
          return;
        }
        
        const actionItems: ActionItem[] = [];
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        
        // 1. 부가세 신고 일정 체크 (1월, 4월, 7월, 10월 25일)
        const vatMonths = [1, 4, 7, 10];
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();
        
        if (vatMonths.includes(currentMonth) && currentDay <= 25) {
          const daysUntilDeadline = 25 - currentDay;
          const priority: ActionPriority = daysUntilDeadline <= 3 ? "urgent" : daysUntilDeadline <= 7 ? "warning" : "normal";
          
          actionItems.push({
            id: "vat",
            title: "부가세 신고 준비",
            description: `${currentMonth}월 25일까지 부가세 신고가 필요합니다. 매입/매출 세금계산서를 확인하세요.`,
            priority,
            dueText: daysUntilDeadline === 0 ? "오늘" : `D-${daysUntilDeadline}`,
            status: "pending",
            icon: FileText,
            actions: {
              primary: { label: "세금계산서 확인", action: () => navigate("/reports?tab=tax") },
              secondary: { label: "확인 완료", action: () => {} },
            },
          });
        }
        
        // 2. 이번 달 매출/지출 비교
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0];
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0];
        
        const [thisMonthResult, lastMonthResult] = await Promise.all([
          supabase
            .from("transactions")
            .select("amount, type")
            .eq("user_id", user.id)
            .gte("transaction_date", thisMonthStart)
            .lte("transaction_date", todayStr),
          supabase
            .from("transactions")
            .select("amount, type")
            .eq("user_id", user.id)
            .gte("transaction_date", lastMonthStart)
            .lte("transaction_date", lastMonthEnd),
        ]);
        
        const thisMonthIncome = (thisMonthResult.data || [])
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const lastMonthIncome = (lastMonthResult.data || [])
          .filter(t => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        if (lastMonthIncome > 0 && thisMonthIncome > 0) {
          const changePercent = Math.round(((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100);
          
          if (changePercent >= 10) {
            actionItems.push({
              id: "sales-up",
              title: "이번 달 매출 증가 🎉",
              description: `전월 대비 ${changePercent}% 증가했습니다. 좋은 흐름을 유지하세요!`,
              priority: "normal",
              status: "pending",
              icon: TrendingUp,
              actions: {
                primary: { label: "상세 보기", action: () => navigate("/reports?tab=sales") },
              },
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
        
        // 3. 미분류 거래 확인
        const { count: unclassifiedCount } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .is("category", null);
        
        if (unclassifiedCount && unclassifiedCount > 0) {
          actionItems.push({
            id: "unclassified",
            title: `미분류 거래 ${unclassifiedCount}건`,
            description: "거래를 분류하면 더 정확한 리포트를 받을 수 있어요.",
            priority: unclassifiedCount >= 10 ? "warning" : "normal",
            status: "pending",
            icon: Tags,
            actions: {
              primary: { label: "분류하기", action: () => navigate("/transactions") },
              secondary: { label: "나중에", action: () => {} },
            },
          });
        }
        
        // 4. 모든 할 일이 없으면 긍정 메시지
        if (actionItems.length === 0) {
          actionItems.push({
            id: "all-good",
            title: "오늘은 특별히 할 일이 없어요",
            description: "모든 것이 순조롭습니다. 김비서가 계속 모니터링하고 있어요.",
            priority: "normal",
            status: "pending",
            icon: CheckCircle2,
            actions: {
              primary: { label: "리포트 보기", action: () => navigate("/reports") },
            },
          });
        }
        
        setItems(actionItems);
      } catch (error) {
        console.error("Error fetching action items:", error);
      } finally {
        setDataLoading(false);
      }
    };
    
    fetchActionItems();
  }, [loading, isAnyConnected, navigate, isLoggedOut]);

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

  const isLoading = loading || dataLoading;

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
                  {completedCount}/{items.length} 완료
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
              // 커스텀 아이콘이 있으면 사용, 없으면 우선순위 기본 아이콘
              const Icon = item.icon || config.icon;

              return (
                <div
                  key={item.id}
                  className="py-3 first:pt-0 last:pb-0 border-b border-border/30 last:border-b-0"
                >
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
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <Button
                          size="sm"
                          variant={item.priority === "urgent" ? "default" : "outline"}
                          className="h-9 text-xs rounded-full w-full"
                          onClick={() => {
                            item.actions.primary.action();
                            if (item.id !== "connection") {
                              handleComplete(item.id);
                            }
                          }}
                        >
                          {item.actions.primary.label}
                        </Button>
                        {item.actions.secondary ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs rounded-full w-full"
                            onClick={() => handlePostpone(item.id)}
                          >
                            {item.actions.secondary.label}
                          </Button>
                        ) : (
                          <div />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* 김비서에게 더 물어보기 */}
          <button 
            className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            onClick={() => openChat()}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {profile?.secretary_name || "김비서"}에게 더 물어보기
            <ChevronRight className="h-3 w-3" />
          </button>
        </CardContent>
      )}
    </Card>
  );
}