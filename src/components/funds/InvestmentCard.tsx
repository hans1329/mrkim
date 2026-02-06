import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PiggyBank, Landmark, Shield, Plus, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/data/mockData";
import { useSavingsAccounts, SavingsAccountType } from "@/hooks/useSavingsAccounts";
import { Button } from "@/components/ui/button";

interface InvestmentCardProps {
  isLoggedOut?: boolean;
}

// 목업 데이터 (로그아웃 상태용)
const mockSavings = [
  {
    id: "1",
    name: "토스뱅크 파킹",
    type: "parking" as SavingsAccountType,
    amount: 12000000,
    interest_rate: 2.0,
  },
  {
    id: "2",
    name: "케이뱅크 플러스",
    type: "savings" as SavingsAccountType,
    amount: 5000000,
    interest_rate: 3.0,
  },
];

const accountIcons = {
  parking: PiggyBank,
  savings: Landmark,
  deposit: Shield,
};

const accountTypeLabels = {
  parking: "파킹통장",
  savings: "적금",
  deposit: "예금",
};

export function InvestmentCard({ isLoggedOut = false }: InvestmentCardProps) {
  const { accounts, isLoading, totalAmount, totalMonthlyInterest, calculateMonthlyInterest } = useSavingsAccounts();

  // 로그아웃 상태: 목업 데이터 사용
  if (isLoggedOut) {
    const mockTotal = mockSavings.reduce((sum, a) => sum + a.amount, 0);
    const mockMonthlyInterest = mockSavings.reduce(
      (sum, a) => sum + Math.round((a.amount * (a.interest_rate / 100)) / 12),
      0
    );

    return (
      <Card className="opacity-70">
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
          <div className="rounded-lg bg-gradient-to-r from-success/10 via-success/5 to-transparent p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">굴리고 있는 돈</p>
                <p className="text-lg font-bold">{formatCurrency(mockTotal)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">이번 달 이자</p>
                <p className="text-lg font-bold text-success">+{formatCurrency(mockMonthlyInterest)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {mockSavings.map((account) => {
              const Icon = accountIcons[account.type];
              const allocation = Math.round((account.amount / mockTotal) * 100);
              const monthlyInterest = Math.round((account.amount * (account.interest_rate / 100)) / 12);

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
                      <span className="text-xs text-success">월 +{formatCurrency(monthlyInterest)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              💡 로그인하면 실제 저축 계좌 현황을 확인할 수 있어요.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBank className="h-4 w-4 text-success" />
              남는 돈 굴리기
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 빈 상태
  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <PiggyBank className="h-4 w-4 text-success" />
              남는 돈 굴리기
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 mb-3">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium mb-1">아직 등록된 저축 계좌가 없어요</p>
            <p className="text-xs text-muted-foreground mb-4">
              파킹통장, 적금, 예금 계좌를 등록하고<br />이자 수익을 관리해보세요
            </p>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              저축 계좌 추가
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // 실데이터 표시
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
              <p className="text-xs text-muted-foreground">이번 달 예상 이자</p>
              <p className="text-lg font-bold text-success">+{formatCurrency(totalMonthlyInterest)}</p>
            </div>
          </div>
        </div>

        {/* 계좌별 현황 */}
        <div className="space-y-3">
          {accounts.map((account) => {
            const Icon = accountIcons[account.type];
            const allocation = totalAmount > 0 ? Math.round((account.amount / totalAmount) * 100) : 0;
            const monthlyInterest = calculateMonthlyInterest(account.amount, account.interest_rate);

            return (
              <div key={account.id} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{account.name}</p>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {accountTypeLabels[account.type]}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(account.amount)}</p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2 flex-1 mr-2">
                      <Progress value={allocation} className="h-1.5" />
                      <span className="text-xs text-muted-foreground shrink-0">
                        {allocation}% · {account.interest_rate}%
                      </span>
                    </div>
                    <span className="text-xs text-success">월 +{formatCurrency(monthlyInterest)}</span>
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
