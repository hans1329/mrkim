import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatNumber, getWeeklyData } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCardSync } from "@/hooks/useCardSync";
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

interface WeeklyDataItem {
  name: string;
  매출: number;
  지출: number;
}

export function WeeklyChart() {
  const { profile, loading: profileLoading } = useProfile();
  const [weeklyData, setWeeklyData] = useState<WeeklyDataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [hasRealData, setHasRealData] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const cardSync = useCardSync();

  const fetchWeeklyData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 로그아웃 상태: 목업 데이터 사용
      if (!user) {
        setIsLoggedIn(false);
        setWeeklyData(getWeeklyData());
        setHasRealData(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      // 최근 7일 데이터 조회
      const today = new Date();
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 6);

      const { data: transactions } = await supabase
        .from('transactions')
        .select('transaction_date, type, amount')
        .eq('user_id', user.id)
        .gte('transaction_date', weekAgo.toISOString().split('T')[0])
        .lte('transaction_date', today.toISOString().split('T')[0]);

      // 로그인 상태지만 데이터 없음: 목업 데이터 사용
      if (!transactions || transactions.length === 0) {
        setWeeklyData(getWeeklyData());
        setHasRealData(false);
        setLoading(false);
        return;
      }

      // 요일별 데이터 집계
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      const weekData: { [key: string]: { 매출: number; 지출: number } } = {};

      // 최근 7일 초기화
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dayName = dayNames[date.getDay()];
        weekData[dayName] = { 매출: 0, 지출: 0 };
      }

      // 거래 데이터 집계
      transactions.forEach(tx => {
        const txDate = new Date(tx.transaction_date);
        const dayName = dayNames[txDate.getDay()];
        if (weekData[dayName]) {
          if (tx.type === 'income') {
            weekData[dayName].매출 += tx.amount;
          } else {
            weekData[dayName].지출 += tx.amount;
          }
        }
      });

      // 배열로 변환 (월~일 순서)
      const orderedDays = ['월', '화', '수', '목', '금', '토', '일'];
      const chartData = orderedDays.map(day => ({
        name: day,
        매출: weekData[day]?.매출 || 0,
        지출: weekData[day]?.지출 || 0,
      }));

      setWeeklyData(chartData);
      setHasRealData(true);
    } catch (error) {
      console.error('주간 데이터 조회 실패:', error);
      // 에러 시에도 목업 데이터 표시
      setWeeklyData(getWeeklyData());
      setHasRealData(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWeeklyData();
  }, [fetchWeeklyData]);

  // 로그인 상태에서만 동기화 버튼 활성화
  const handleSync = async () => {
    if (!isLoggedIn) {
      toast.info("로그인 후 이용 가능합니다");
      return;
    }
    
    const connectedId = localStorage.getItem("codef_connected_id");
    const cardCompanyId = localStorage.getItem("codef_card_company");
    const cardCompanyName = localStorage.getItem("codef_card_company_name");

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
        // startDate/endDate 생략 시 hook에서 자동으로 마지막 동기화 시점 이후 데이터 조회
      });

      if (result.synced > 0) {
        toast.success(`${result.synced}건의 새 거래 내역을 동기화했습니다`);
      } else {
        toast.info("새로운 거래 내역이 없습니다");
      }

      // 데이터 새로고침
      await fetchWeeklyData();
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

  // 로그아웃 상태에서만 Sample 워터마크 표시
  const showSampleWatermark = isLoggedIn === false;

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base">주간 매출/지출 현황</CardTitle>
        {isLoggedIn && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[300px] relative">
          {showSampleWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="px-4 py-2 border-2 border-dashed border-muted-foreground/30 rounded-lg -rotate-12">
                <span className="text-muted-foreground/40 font-bold text-lg tracking-widest">
                  Sample
                </span>
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `${Math.round(value / 10000)}만`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-card p-3 shadow-md">
                        <p className="mb-2 font-medium">{label}요일</p>
                        {payload.map((entry, index) => (
                          <p
                            key={index}
                            className="text-sm"
                            style={{ color: entry.color }}
                          >
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
              <Bar
                dataKey="매출"
                fill="hsl(var(--chart-1))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="지출"
                fill="hsl(var(--chart-3))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
