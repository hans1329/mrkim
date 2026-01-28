import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Deposit, formatCurrency } from "@/data/mockData";
import { Wallet, Receipt, ShieldAlert } from "lucide-react";

interface DepositCardProps {
  deposits: Deposit[];
}

const depositIcons = {
  vat: Receipt,
  salary: Wallet,
  emergency: ShieldAlert,
};

const depositLabels = {
  vat: "부가세",
  salary: "급여",
  emergency: "비상금",
};

export function DepositCard({ deposits }: DepositCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">예치금 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deposits.map((deposit) => {
          const Icon = depositIcons[deposit.type];
          const progress = deposit.targetAmount
            ? Math.round((deposit.amount / deposit.targetAmount) * 100)
            : 100;

          return (
            <div key={deposit.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{deposit.name}</p>
                    {deposit.dueDate && (
                      <p className="text-xs text-muted-foreground">
                        {deposit.dueDate} 납부 예정
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(deposit.amount)}</p>
                  {deposit.targetAmount && (
                    <p className="text-xs text-muted-foreground">
                      / {formatCurrency(deposit.targetAmount)}
                    </p>
                  )}
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
