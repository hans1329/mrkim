import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, AlertCircle, TrendingUp, CalendarClock, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useConnection } from "@/contexts/ConnectionContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AlertItem {
  id: string;
  type: "warning" | "success" | "info";
  title: string;
  time: string;
  icon: typeof Bell;
}

function useRealAlerts() {
  const { isLoggedIn, userId } = useConnection();

  return useQuery({
    queryKey: ["dashboard-alerts", userId],
    queryFn: async (): Promise<AlertItem[]> => {
      if (!userId) return [];
      const alerts: AlertItem[] = [];
      const now = new Date();

      // 1. 미분류 거래 건수
      const { count: unclassifiedCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("category", null);

      if (unclassifiedCount && unclassifiedCount > 0) {
        alerts.push({
          id: "unclassified",
          type: "info",
          title: `미분류 거래 ${unclassifiedCount}건 확인 필요`,
          time: "지금",
          icon: AlertCircle,
        });
      }

      // 2. 가장 가까운 세금 마감일 표시
      const taxDeadlines = [
        { month: 1, day: 25, label: "부가세 신고" },
        { month: 5, day: 31, label: "종합소득세 신고" },
        { month: 7, day: 25, label: "부가세 신고" },
      ];
      
      let nearest: { diff: number; d: typeof taxDeadlines[0] } | null = null;
      for (const d of taxDeadlines) {
        for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
          const deadline = new Date(year, d.month - 1, d.day);
          const diff = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diff > 0 && (!nearest || diff < nearest.diff)) {
            nearest = { diff, d };
          }
        }
      }
      if (nearest) {
        alerts.push({
          id: `tax-${nearest.d.label}-${nearest.d.month}`,
          type: nearest.diff <= 14 ? "warning" : "info",
          title: `${nearest.d.label} 마감 D-${nearest.diff}`,
          time: `${nearest.d.month}월 ${nearest.d.day}일 마감`,
          icon: CalendarClock,
        });
      }

      // 3. 이번 달 vs 지난 달 지출 비교
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
      // 동기간 비교: 지난달 1일 ~ 지난달 오늘 일자까지
      const currentDay = now.getDate();
      const lastMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
      const clampedDay = Math.min(currentDay, lastMonthLastDay);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, clampedDay).toISOString().split("T")[0];

      const todayStr = now.toISOString().split("T")[0];

      const [thisMonthRes, lastMonthRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("type", "expense")
          .gte("transaction_date", thisMonthStart)
          .lte("transaction_date", todayStr),
        supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("type", "expense")
          .gte("transaction_date", lastMonthStart)
          .lte("transaction_date", lastMonthEnd),
      ]);

      const thisTotal = (thisMonthRes.data || []).reduce((s, t) => s + (t.amount || 0), 0);
      const lastTotal = (lastMonthRes.data || []).reduce((s, t) => s + (t.amount || 0), 0);

      if (lastTotal > 0) {
        const changePercent = Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
        if (changePercent > 20) {
          alerts.push({
            id: "expense-up",
            type: "warning",
            title: `이번 달 지출 ${changePercent}% 증가`,
            time: "전월 동기간 대비",
            icon: TrendingUp,
          });
        } else if (changePercent < -10) {
          alerts.push({
            id: "expense-down",
            type: "success",
            title: `이번 달 지출 ${Math.abs(changePercent)}% 감소`,
            time: "전월 동기간 대비",
            icon: TrendingDown,
          });
        }
      }

      return alerts;
    },
    enabled: isLoggedIn && !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

interface AlertCardProps {
  isLoggedOut?: boolean;
}

export function AlertCard({ isLoggedOut = false }: AlertCardProps) {
  const { data: alerts, isLoading } = useRealAlerts();

  // 로그아웃 상태: 목업 알림 표시
  if (isLoggedOut) {
    const mockAlerts: AlertItem[] = [
      { id: "1", type: "warning", title: "부가세 신고 마감 D-7", time: "2시간 전", icon: CalendarClock },
      { id: "2", type: "success", title: "이번 주 매출 15% 증가", time: "오늘", icon: TrendingUp },
      { id: "3", type: "info", title: "미분류 거래 12건 확인 필요", time: "어제", icon: AlertCircle },
    ];

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            최근 알림
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockAlerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            최근 알림
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            최근 알림
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Bell className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">새로운 알림이 없어요</p>
            <p className="text-xs text-muted-foreground mt-1">중요한 알림이 생기면 여기에 표시됩니다</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          최근 알림
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <AlertRow key={alert.id} alert={alert} />
        ))}
      </CardContent>
    </Card>
  );
}

function AlertRow({ alert }: { alert: AlertItem }) {
  return (
    <div
      className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
    >
      <alert.icon
        className={cn(
          "h-4 w-4 mt-0.5",
          alert.type === "warning" && "text-warning",
          alert.type === "success" && "text-success",
          alert.type === "info" && "text-muted-foreground"
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{alert.title}</p>
        <p className="text-xs text-muted-foreground">{alert.time}</p>
      </div>
    </div>
  );
}
