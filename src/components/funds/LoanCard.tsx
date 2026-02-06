import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Banknote, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Zap
} from "lucide-react";
import { formatCurrency } from "@/data/mockData";

interface LoanInfo {
  availableLimit: number;
  usedAmount: number;
  interestRate: number;
  monthlyRevenue: number;
  creditScore: string;
}

const mockLoanInfo: LoanInfo = {
  availableLimit: 50000000,
  usedAmount: 0,
  interestRate: 5.9,
  monthlyRevenue: 67000000,
  creditScore: "우수",
};

export function LoanCard() {
  const { isEnabled, isLoading } = useSiteSettings();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState<number[]>([10000000]);
  const [loanPeriod, setLoanPeriod] = useState<number[]>([3]);

  // 관리자가 비활성화한 경우 렌더링하지 않음
  if (isLoading) return null;
  if (!isEnabled("loan_card_visible")) return null;

  const remainingLimit = mockLoanInfo.availableLimit - mockLoanInfo.usedAmount;
  const usagePercent = Math.round((mockLoanInfo.usedAmount / mockLoanInfo.availableLimit) * 100);
  
  const monthlyPayment = loanAmount[0] / loanPeriod[0] * (1 + mockLoanInfo.interestRate / 100 / 12 * loanPeriod[0]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4 text-primary" />
            급할 때 빌리기
          </CardTitle>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
            <Zap className="mr-1 h-3 w-3" />
            1분 승인
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 대출 한도 현황 */}
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">빌릴 수 있는 금액</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(remainingLimit)}</span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>사용 중 {formatCurrency(mockLoanInfo.usedAmount)}</span>
            <span>최대 {formatCurrency(mockLoanInfo.availableLimit)}</span>
          </div>
        </div>

        {/* 신용 정보 */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <TrendingUp className="mx-auto h-4 w-4 text-success mb-1" />
            <p className="text-xs text-muted-foreground">월 매출</p>
            <p className="text-sm font-semibold">₩{Math.round(mockLoanInfo.monthlyRevenue / 10000)}만</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <CheckCircle2 className="mx-auto h-4 w-4 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">내 등급</p>
            <p className="text-sm font-semibold">{mockLoanInfo.creditScore}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <Clock className="mx-auto h-4 w-4 text-warning mb-1" />
            <p className="text-xs text-muted-foreground">이자율</p>
            <p className="text-sm font-semibold">연 {mockLoanInfo.interestRate}%</p>
          </div>
        </div>

        {/* 대출 신청 버튼 */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              대출 신청하기
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>급할 때 빌리기</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 대출 금액 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>얼마나 빌릴까요?</Label>
                  <span className="text-lg font-bold">{formatCurrency(loanAmount[0])}</span>
                </div>
                <Slider
                  value={loanAmount}
                  onValueChange={setLoanAmount}
                  min={1000000}
                  max={remainingLimit}
                  step={1000000}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₩100만</span>
                  <span>{formatCurrency(remainingLimit)}</span>
                </div>
              </div>

              {/* 대출 기간 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>언제까지 갚을까요?</Label>
                  <span className="text-lg font-bold">{loanPeriod[0]}개월</span>
                </div>
                <Slider
                  value={loanPeriod}
                  onValueChange={setLoanPeriod}
                  min={1}
                  max={12}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1개월</span>
                  <span>12개월</span>
                </div>
              </div>

              {/* 예상 상환 정보 */}
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">매달 갚을 금액</span>
                  <span className="font-semibold">{formatCurrency(Math.round(monthlyPayment))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">이자율</span>
                  <span className="font-semibold">연 {mockLoanInfo.interestRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">총 이자</span>
                  <span className="font-semibold text-warning">
                    {formatCurrency(Math.round(monthlyPayment * loanPeriod[0] - loanAmount[0]))}
                  </span>
                </div>
              </div>

              {/* 안내 */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  사장님 매출 데이터를 보고 한도를 정해드려요. 
                  신청하면 1분 안에 결과를 알려드립니다.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>
                신청하기
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 안내 문구 */}
        <p className="text-xs text-muted-foreground text-center">
          * 매출 기록 보고 1분 안에 승인 여부 알려드려요
        </p>
      </CardContent>
    </Card>
  );
}
