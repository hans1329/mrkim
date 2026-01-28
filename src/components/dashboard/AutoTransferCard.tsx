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
                "flex items-center justify-between rounded-lg border p-3 transition-colors",
                transfer.status === "completed" && "bg-muted/50 opacity-70"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{transfer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {transfer.recipient} · {transfer.condition}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold">{formatCurrency(transfer.amount)}</p>
                <Badge variant={config.variant} className="gap-1">
                  <StatusIcon className="h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
