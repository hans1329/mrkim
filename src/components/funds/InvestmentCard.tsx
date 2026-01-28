import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PiggyBank, Landmark, Shield } from "lucide-react";
import { formatCurrency } from "@/data/mockData";

interface SavingsAccount {
  id: string;
  name: string;
  type: "parking" | "savings" | "deposit";
  amount: number;
  interestRate: number;
  monthlyInterest: number;
}

const mockSavings: SavingsAccount[] = [
  {
    id: "1",
    name: "토스뱅크 파킹",
    type: "parking",
    amount: 12000000,
    interestRate: 2.0,
    monthlyInterest: 20000,
  },
  {
    id: "2",
    name: "케이뱅크 플러스",
    type: "savings",
    amount: 5000000,
    interestRate: 3.0,
    monthlyInterest: 12500,
  },
];

const accountIcons = {
  parking: PiggyBank,
  savings: Landmark,
  deposit: Shield,
};

export function InvestmentCard() {
  const totalAmount = mockSavings.reduce((sum, a) => sum + a.amount, 0);
  const totalMonthlyInterest = mockSavings.reduce((sum, a) => sum + a.monthlyInterest, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <PiggyBank className="h-4 w-4 text-success" />
            남는 돈 굴리기
          </CardTitle>
          <Badge variant="outline" className="text-success border-success/30 bg-success/10">
            안전하게 이자 받기
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 총 현황 */}
        <div className="rounded-lg bg-gradient-to-r from-success/10 via-success/5 to-transparent p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">굴리고 있는 돈</p>
              <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">이번 달 이자</p>
              <p className="text-lg font-bold text-success">+{formatCurrency(totalMonthlyInterest)}</p>
            </div>
          </div>
        </div>

        {/* 계좌별 현황 */}
        <div className="space-y-3">
          {mockSavings.map((account) => {
            const Icon = accountIcons[account.type];
            const allocation = Math.round((account.amount / totalAmount) * 100);

            return (
              <div key={account.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{account.name}</p>
                    <p className="text-sm font-semibold">{formatCurrency(account.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Progress value={allocation} className="h-1.5" />
                      <span className="text-xs text-muted-foreground shrink-0">{allocation}%</span>
                    </div>
                    <span className="text-xs text-success">월 +₩{Math.round(account.monthlyInterest / 1000) * 1000 / 1000}천</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 안내 문구 */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 안 쓰는 돈은 파킹통장에 자동으로 옮겨서 이자를 받아요. 
            필요할 땐 언제든 바로 꺼내 쓸 수 있어요.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
