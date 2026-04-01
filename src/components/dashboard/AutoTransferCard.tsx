import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AutoTransferCardProps {
  isLoggedOut?: boolean;
}

function useAutoTransfers() {
  return useQuery({
    queryKey: ["dashboard-auto-transfers"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("auto_transfers")
        .select("id, name, amount, status, schedule_type, schedule_day, is_active, transfer_type, amount_percentage")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

function getScheduleLabel(type: string, day: number | null) {
  switch (type) {
    case "daily": return "매일";
    case "weekly": return `매주 ${["일","월","화","수","목","금","토"][day ?? 0]}요일`;
    case "monthly": return `매월 ${day ?? 1}일`;
    case "on_income": return "수입 발생 시";
    default: return "수동 실행";
  }
}

export function AutoTransferCard({ isLoggedOut = false }: AutoTransferCardProps) {
  const navigate = useNavigate();
  const { data: transfers, isLoading } = useAutoTransfers();

  // 로그아웃 상태: 목업 자동이체 현황 표시
  if (isLoggedOut) {
    const mockTransfers = [
      { id: "1", name: "부가세 적립", amount: 130000, status: "completed", date: "매주 금요일" },
      { id: "2", name: "급여 이체", amount: 12500000, status: "pending", date: "매월 25일" },
    ];

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            자동이체 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mockTransfers.map((transfer) => (
            <div key={transfer.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                {transfer.status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                ) : (
                  <Clock className="h-4 w-4 text-warning" />
                )}
                <div>
                  <p className="text-sm font-medium">{transfer.name}</p>
                  <p className="text-xs text-muted-foreground">{transfer.date}</p>
                </div>
              </div>
              <span className={cn(
                "text-sm font-semibold",
                transfer.status === "completed" ? "text-success" : "text-foreground"
              )}>
                ₩{transfer.amount.toLocaleString()}
              </span>
            </div>
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
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            자동이체 현황
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!transfers || transfers.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">자동이체 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              등록된 자동이체가 없어요
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              자금관리에서 자동이체 규칙을 추가하세요
            </p>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button size="sm" variant="outline" className="rounded-full w-full" onClick={() => navigate("/funds")}>
            자동이체 추가하기
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          자동이체 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transfers.map((transfer) => (
          <div key={transfer.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {transfer.status === "completed" ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <Clock className="h-4 w-4 text-warning" />
              )}
              <div>
                <p className="text-sm font-medium">{transfer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getScheduleLabel(transfer.schedule_type, transfer.schedule_day)}
                </p>
              </div>
            </div>
            <span className={cn(
              "text-sm font-semibold",
              transfer.status === "completed" ? "text-success" : "text-foreground"
            )}>
              {transfer.transfer_type === "percentage"
                ? `${transfer.amount_percentage ?? 10}%`
                : `₩${transfer.amount.toLocaleString()}`}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
