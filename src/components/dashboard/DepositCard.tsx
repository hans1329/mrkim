import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface DepositCardProps {
  isLoggedOut?: boolean;
}

function useDeposits() {
  return useQuery({
    queryKey: ["dashboard-deposits"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("deposits")
        .select("id, name, amount, target_amount, type, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

function formatCurrency(amount: number) {
  if (amount >= 100000000) return `₩${(amount / 100000000).toFixed(1)}억`;
  if (amount >= 10000) return `₩${Math.round(amount / 10000).toLocaleString()}만`;
  return `₩${amount.toLocaleString()}`;
}

export function DepositCard({ isLoggedOut = false }: DepositCardProps) {
  const navigate = useNavigate();
  const { data: deposits, isLoading } = useDeposits();

  // 로그아웃 상태: 목업 예치금 현황 표시
  if (isLoggedOut) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-primary" />
            예치금 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-primary">₩3,250,000</p>
            <p className="text-xs text-muted-foreground">총 적립금</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">부가세 적립</span>
                <span className="font-medium">₩2,600,000</span>
              </div>
              <Progress value={80} className="h-2" />
              <p className="text-xs text-muted-foreground">목표 대비 80%</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">급여 적립</span>
                <span className="font-medium">₩650,000</span>
              </div>
              <Progress value={52} className="h-2" />
              <p className="text-xs text-muted-foreground">목표 대비 52%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-success/10">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-xs text-success">지난 달 대비 +₩450,000</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <PiggyBank className="h-4 w-4 text-primary" />
            예치금 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-32 mx-auto" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!deposits || deposits.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">예치금 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <PiggyBank className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              등록된 예치금이 없어요
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              자금관리에서 예치금을 추가하세요
            </p>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button size="sm" variant="outline" className="rounded-full w-full" onClick={() => navigate("/funds")}>
            예치금 추가하기
          </Button>
        </CardFooter>
      </Card>
    );
  }

  const totalAmount = deposits.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <PiggyBank className="h-4 w-4 text-primary" />
          예치금 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-lg md:text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-muted-foreground">총 적립금</p>
        </div>
        <div className="space-y-3">
          {deposits.slice(0, 3).map((deposit) => {
            const progress = deposit.target_amount && deposit.target_amount > 0
              ? Math.min(100, Math.round((Number(deposit.amount) / Number(deposit.target_amount)) * 100))
              : null;

            return (
              <div key={deposit.id} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{deposit.name}</span>
                  <span className="font-medium">{formatCurrency(Number(deposit.amount))}</span>
                </div>
                {progress !== null && (
                  <>
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground">목표 대비 {progress}%</p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
