import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/data/mockData";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
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
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const fetchWeeklyData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

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

        if (!transactions || transactions.length === 0) {
          setHasData(false);
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
        setHasData(true);
      } catch (error) {
        console.error('주간 데이터 조회 실패:', error);
        setHasData(false);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyData();
  }, []);

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

  // 데이터가 없는 경우 빈 상태 표시
  if (!hasData) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">주간 매출/지출 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              아직 거래 내역이 없어요
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              카드나 계좌를 연동하면 주간 현황을 확인할 수 있어요
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">주간 매출/지출 현황</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] relative">
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
