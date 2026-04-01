import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber, getWeeklyData } from "@/data/mockData";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCardSync } from "@/hooks/useCardSync";
import { useWeeklyChartData } from "@/hooks/useDashboardStats";
import { useCardConnectionInfo } from "@/hooks/useCardConnectionInfo";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function WeeklyChart() {
  const { profile, loading: profileLoading } = useProfile();
  const { data: weeklyResult, isLoading: loading } = useWeeklyChartData();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const cardSync = useCardSync();
  const cardInfo = useCardConnectionInfo();

  // null = 로그아웃, hasRealData false = 데이터 없음
  const isLoggedIn = weeklyResult !== null && weeklyResult !== undefined;
  const weeklyData = weeklyResult?.hasRealData ? weeklyResult.data : getWeeklyData();
  const hasRealData = weeklyResult?.hasRealData ?? false;

  const handleSync = async () => {
    if (!isLoggedIn) {
      toast.info("로그인 후 이용 가능합니다");
      return;
    }
    
    const connectedId = cardInfo.connectedId;
    const cardCompanyId = cardInfo.cardCompanyId;
    const cardCompanyName = cardInfo.cardCompanyName;

    if (!connectedId || !cardCompanyId) {
      toast.error("연동된 카드 정보가 없습니다. 카드를 먼저 연결해주세요.");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await cardSync.mutateAsync({
        connectedId,
        cardCompanyId,
        cardCompanyName: cardCompanyName || cardCompanyId,
      });

      if (result.synced > 0) {
        toast.success(`${result.synced}건의 새 거래 내역을 동기화했습니다`);
      } else {
        toast.info("새로운 거래 내역이 없습니다");
      }

      queryClient.invalidateQueries({ queryKey: ["dashboard-weekly-chart"] });
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("동기화 중 오류가 발생했습니다");
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading || profileLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">주간 매출/지출 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const showSampleWatermark = !isLoggedIn;

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3 relative">
        <div className="pr-10">
          <CardTitle className="text-base">주간 매출/지출 현황</CardTitle>
          {weeklyResult?.startDate && weeklyResult?.endDate && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {weeklyResult.startDate.replace(/-/g, ".")} ~ {weeklyResult.endDate.replace(/-/g, ".")}
            </p>
          )}
        </div>
        {isLoggedIn && (
          <Button variant="ghost" size="icon" className="h-8 w-8 absolute top-2 right-2" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] relative">
          {showSampleWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="px-4 py-2 border-2 border-dashed border-muted-foreground/30 rounded-lg -rotate-12">
                <span className="text-muted-foreground/40 font-bold text-lg tracking-widest">Sample</span>
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
              <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value) => `${Math.round(value / 10000)}만`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-md">
                        <p className="mb-2 font-medium">{label}요일</p>
                        {payload.map((entry, index) => (
                          <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: ₩{formatNumber(entry.value as number)}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend iconType="circle" align="right" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="매출" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="지출" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
