import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Banknote, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { formatCurrency } from "@/data/mockData";

interface LoanInfo {
  availableLimit: number;
  usedAmount: number;
  interestRate: number;
  basedOn: string;
  monthlyRevenue: number;
  creditScore: string;
}

const mockLoanInfo: LoanInfo = {
  availableLimit: 50000000,
  usedAmount: 0,
  interestRate: 5.9,
  basedOn: "최근 3개월 매출",
  monthlyRevenue: 67000000,
  creditScore: "우수",
};

export function LoanCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loanAmount, setLoanAmount] = useState<number[]>([10000000]);
  const [loanPeriod, setLoanPeriod] = useState<number[]>([3]);

  const remainingLimit = mockLoanInfo.availableLimit - mockLoanInfo.usedAmount;
  const usagePercent = Math.round((mockLoanInfo.usedAmount / mockLoanInfo.availableLimit) * 100);
  
  const monthlyPayment = loanAmount[0] / loanPeriod[0] * (1 + mockLoanInfo.interestRate / 100 / 12 * loanPeriod[0]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4 text-primary" />
            단기 대출
          </CardTitle>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
            <Sparkles className="mr-1 h-3 w-3" />
            AI 신용평가
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 대출 한도 현황 */}
        <div className="rounded-lg border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">이용 가능 한도</span>
            <span className="text-lg font-bold text-primary">{formatCurrency(remainingLimit)}</span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>사용 {formatCurrency(mockLoanInfo.usedAmount)}</span>
            <span>한도 {formatCurrency(mockLoanInfo.availableLimit)}</span>
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
            <p className="text-xs text-muted-foreground">신용등급</p>
            <p className="text-sm font-semibold">{mockLoanInfo.creditScore}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2.5 text-center">
            <Clock className="mx-auto h-4 w-4 text-warning mb-1" />
            <p className="text-xs text-muted-foreground">금리</p>
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
              <DialogTitle>단기 대출 신청</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* 대출 금액 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>대출 금액</Label>
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
                  <Label>상환 기간</Label>
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
                  <span className="text-sm text-muted-foreground">월 상환금</span>
                  <span className="font-semibold">{formatCurrency(Math.round(monthlyPayment))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">적용 금리</span>
                  <span className="font-semibold">연 {mockLoanInfo.interestRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">예상 이자</span>
                  <span className="font-semibold text-warning">
                    {formatCurrency(Math.round(monthlyPayment * loanPeriod[0] - loanAmount[0]))}
                  </span>
                </div>
              </div>

              {/* 안내 */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>
                  대출 신청 시 AI가 실시간 매출 데이터를 기반으로 신용평가를 진행합니다. 
                  승인까지 약 1분 소요됩니다.
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
          * 매출 기반 AI 신용평가로 빠른 승인
        </p>
      </CardContent>
    </Card>
  );
}
