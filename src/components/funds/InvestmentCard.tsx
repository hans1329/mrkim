import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Shield, Landmark, PiggyBank, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/data/mockData";

interface InvestmentAsset {
  id: string;
  name: string;
  type: "mmf" | "bond" | "deposit";
  amount: number;
  returnRate: number;
  expectedReturn: number;
}

const mockInvestments: InvestmentAsset[] = [
  {
    id: "1",
    name: "MMF 운용",
    type: "mmf",
    amount: 12000000,
    returnRate: 3.2,
    expectedReturn: 32000,
  },
  {
    id: "2",
    name: "국채 (3개월)",
    type: "bond",
    amount: 5000000,
    returnRate: 3.5,
    expectedReturn: 14583,
  },
];

const assetIcons = {
  mmf: PiggyBank,
  bond: Landmark,
  deposit: Shield,
};

export function InvestmentCard() {
  const totalInvested = mockInvestments.reduce((sum, a) => sum + a.amount, 0);
  const totalExpectedReturn = mockInvestments.reduce((sum, a) => sum + a.expectedReturn, 0);
  const avgReturnRate = mockInvestments.reduce((sum, a) => sum + a.returnRate * a.amount, 0) / totalInvested;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-success" />
            예치금 운용 현황
          </CardTitle>
          <Badge variant="outline" className="text-success border-success/30 bg-success/10">
            연 {avgReturnRate.toFixed(1)}% 수익
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 총 운용 현황 */}
        <div className="rounded-lg bg-gradient-to-r from-success/10 via-success/5 to-transparent p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">총 운용 자산</p>
              <p className="text-lg font-bold">{formatCurrency(totalInvested)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">이번 달 예상 수익</p>
              <p className="text-lg font-bold text-success">+{formatCurrency(totalExpectedReturn)}</p>
            </div>
          </div>
        </div>

        {/* 자산별 현황 */}
        <div className="space-y-3">
          {mockInvestments.map((asset) => {
            const Icon = assetIcons[asset.type];
            const allocation = Math.round((asset.amount / totalInvested) * 100);

            return (
              <div key={asset.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{asset.name}</p>
                    <p className="text-sm font-semibold">{formatCurrency(asset.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Progress value={allocation} className="h-1.5" />
                      <span className="text-xs text-muted-foreground shrink-0">{allocation}%</span>
                    </div>
                    <span className="text-xs text-success">연 {asset.returnRate}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 안내 문구 */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 유휴 자금은 MMF, 국채 등 안전 자산에 자동 운용되어 추가 수익을 창출합니다. 
            필요 시 언제든 출금 가능합니다.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
