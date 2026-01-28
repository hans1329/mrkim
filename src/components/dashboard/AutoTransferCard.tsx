import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AutoTransfer, formatCurrency } from "@/data/mockData";
import { ArrowRight, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AutoTransferCardProps {
  transfers: AutoTransfer[];
}

const statusConfig = {
  pending: {
    label: "대기 중",
    icon: AlertCircle,
    variant: "outline" as const,
  },
  scheduled: {
    label: "예정",
    icon: Clock,
    variant: "secondary" as const,
  },
  completed: {
    label: "완료",
    icon: CheckCircle,
    variant: "default" as const,
  },
};

export function AutoTransferCard({ transfers }: AutoTransferCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">자동이체 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {transfers.map((transfer) => {
          const config = statusConfig[transfer.status];
          const StatusIcon = config.icon;

          return (
            <div
              key={transfer.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border p-3 transition-colors",
                transfer.status === "completed" && "bg-muted/50 opacity-70"
              )}
            >
              {/* 상단: 아이콘, 이름, 상태 뱃지 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm">{transfer.name}</p>
                </div>
                <Badge variant={config.variant} className="gap-1 text-xs">
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              {/* 하단: 수신자, 조건, 금액 */}
              <div className="flex items-center justify-between pl-10">
                <p className="text-xs text-muted-foreground">
                  {transfer.recipient} · {transfer.condition}
                </p>
                <p className="font-semibold text-sm">{formatCurrency(transfer.amount)}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
