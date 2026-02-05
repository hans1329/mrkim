import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRightLeft, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoTransferCardProps {
  isLoggedOut?: boolean;
}

export function AutoTransferCard({ isLoggedOut = false }: AutoTransferCardProps) {
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
            <div
              key={transfer.id}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
            >
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

  // 로그인 상태: 준비 중 표시
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
            자동이체 기능 준비 중
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            부가세 적립, 급여 이체 자동화가 곧 추가됩니다
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
