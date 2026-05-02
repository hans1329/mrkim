import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calculator, ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 2025년 종합소득세 세율표
const TAX_BRACKETS = [
  { limit: 14_000_000, rate: 0.06, deduction: 0 },
  { limit: 50_000_000, rate: 0.15, deduction: 1_260_000 },
  { limit: 88_000_000, rate: 0.24, deduction: 5_760_000 },
  { limit: 150_000_000, rate: 0.35, deduction: 15_440_000 },
  { limit: 300_000_000, rate: 0.38, deduction: 19_940_000 },
  { limit: 500_000_000, rate: 0.40, deduction: 25_940_000 },
  { limit: 1_000_000_000, rate: 0.42, deduction: 35_940_000 },
  { limit: Infinity, rate: 0.45, deduction: 65_940_000 },
];

function calculateIncomeTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome <= bracket.limit) {
      return Math.floor(taxableIncome * bracket.rate - bracket.deduction);
    }
  }
  return 0;
}

function getAppliedBracket(taxableIncome: number) {
  if (taxableIncome <= 0) return null;
  for (const bracket of TAX_BRACKETS) {
    if (taxableIncome <= bracket.limit) {
      return bracket;
    }
  }
  return TAX_BRACKETS[TAX_BRACKETS.length - 1];
}

const formatAmount = (amount: number) => amount.toLocaleString();

const formatShortAmount = (amount: number) => {
  if (amount >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억`;
  if (amount >= 10_000) return `${Math.floor(amount / 10_000).toLocaleString()}만`;
  return amount.toLocaleString();
};

// 천 단위 콤마 입력 핸들러
function parseNumberInput(value: string): number {
  return parseInt(value.replace(/,/g, ""), 10) || 0;
}

function formatNumberInput(value: number): string {
  if (value === 0) return "";
  return value.toLocaleString();
}

interface IncomeTaxEstimateSectionProps {
  salesTotal: number;
  purchaseTotal: number;
}

export function IncomeTaxEstimateSection({ salesTotal, purchaseTotal }: IncomeTaxEstimateSectionProps) {
  const [showSimulator, setShowSimulator] = useState(false);
  
  // 시뮬레이터 입력값
  const [personalDeduction, setPersonalDeduction] = useState(1_500_000); // 기본공제 150만원
  const [pensionDeduction, setPensionDeduction] = useState(0);
  const [healthDeduction, setHealthDeduction] = useState(0);
  const [otherDeduction, setOtherDeduction] = useState(0);

  // 기본 자동 계산 (매출 - 매입 = 소득금액 추정)
  const estimatedIncome = Math.max(salesTotal - purchaseTotal, 0);
  
  // 기본 계산 (소득공제 없이)
  const basicTax = calculateIncomeTax(estimatedIncome);
  const basicBracket = getAppliedBracket(estimatedIncome);

  // 시뮬레이터 계산 (소득공제 적용)
  const totalDeductions = personalDeduction + pensionDeduction + healthDeduction + otherDeduction;
  const simulatedTaxable = Math.max(estimatedIncome - totalDeductions, 0);
  const simulatedTax = calculateIncomeTax(simulatedTaxable);
  const simulatedBracket = getAppliedBracket(simulatedTaxable);
  const taxSaving = basicTax - simulatedTax;

  // 지방소득세 (종합소득세의 10%)
  const localTaxBasic = Math.floor(basicTax * 0.1);
  const localTaxSimulated = Math.floor(simulatedTax * 0.1);

  if (salesTotal === 0 && purchaseTotal === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            종합소득세 예상
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            세금계산서 데이터가 동기화되면 종합소득세 예상 금액을 확인할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          종합소득세 예상
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[260px]">
                <p className="text-xs">
                  세금계산서 매출-매입 기준 간이 추정이며, 
                  실제 세액과 차이가 있을 수 있습니다. 
                  법인사업자는 법인세가 적용됩니다.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 기본 자동 계산 결과 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">매출 합계</span>
            <span className="font-medium">₩{formatAmount(salesTotal)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">매입 합계 (필요경비)</span>
            <span className="font-medium text-red-500">-₩{formatAmount(purchaseTotal)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">추정 소득금액</span>
            <span className="font-semibold">₩{formatAmount(estimatedIncome)}</span>
          </div>
          
          {basicBracket && (
            <div className="text-xs text-muted-foreground text-right">
              적용세율 {(basicBracket.rate * 100)}%
            </div>
          )}

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">예상 종합소득세</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  + 지방소득세 ₩{formatShortAmount(localTaxBasic)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  ₩{formatShortAmount(basicTax)}
                </p>
                <p className="text-xs text-muted-foreground">
                  합계 ₩{formatShortAmount(basicTax + localTaxBasic)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 상세 시뮬레이션 토글 */}
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={() => setShowSimulator(!showSimulator)}
        >
          {showSimulator ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {showSimulator ? "시뮬레이션 닫기" : "상세 시뮬레이션"}
        </Button>

        {showSimulator && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              소득공제 항목을 입력하면 더 정확한 예상 세액을 확인할 수 있습니다.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">기본공제 (본인+부양가족)</Label>
                <Input
                  type="text"
                  placeholder="1,500,000"
                  value={formatNumberInput(personalDeduction)}
                  onChange={(e) => setPersonalDeduction(parseNumberInput(e.target.value))}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">1인당 150만원</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">국민연금 납부액</Label>
                <Input
                  type="text"
                  placeholder="0"
                  value={formatNumberInput(pensionDeduction)}
                  onChange={(e) => setPensionDeduction(parseNumberInput(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">건강보험료 납부액</Label>
                <Input
                  type="text"
                  placeholder="0"
                  value={formatNumberInput(healthDeduction)}
                  onChange={(e) => setHealthDeduction(parseNumberInput(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">기타 소득공제</Label>
                <Input
                  type="text"
                  placeholder="0"
                  value={formatNumberInput(otherDeduction)}
                  onChange={(e) => setOtherDeduction(parseNumberInput(e.target.value))}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">추정 소득금액</span>
                <span>₩{formatAmount(estimatedIncome)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">소득공제 합계</span>
                <span className="text-red-500">-₩{formatAmount(totalDeductions)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium">
                <span>과세표준</span>
                <span>₩{formatAmount(simulatedTaxable)}</span>
              </div>
              {simulatedBracket && (
                <div className="text-xs text-muted-foreground text-right">
                  적용세율 {(simulatedBracket.rate * 100)}%
                </div>
              )}
            </div>

            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">시뮬레이션 결과</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    + 지방소득세 ₩{formatShortAmount(localTaxSimulated)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    ₩{formatShortAmount(simulatedTax)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    합계 ₩{formatShortAmount(simulatedTax + localTaxSimulated)}
                  </p>
                </div>
              </div>
              {taxSaving > 0 && (
                <div className="mt-3 pt-3 border-t border-primary/10">
                  <p className="text-xs text-green-600 font-medium">
                    💰 소득공제로 약 ₩{formatShortAmount(taxSaving)} 절세 효과
                  </p>
                </div>
              )}
            </div>

            {/* 세율표 참고 */}
            <details className="text-xs">
              <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                2025년 종합소득세 세율표 보기
              </summary>
              <div className="mt-2 rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left p-2 font-medium">과세표준</th>
                      <th className="text-right p-2 font-medium">세율</th>
                      <th className="text-right p-2 font-medium">누진공제</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TAX_BRACKETS.map((b, i) => {
                      const prevLimit = i === 0 ? 0 : TAX_BRACKETS[i - 1].limit;
                      const isActive = simulatedTaxable > prevLimit && simulatedTaxable <= b.limit;
                      return (
                        <tr key={i} className={cn(
                          "border-t border-border/50",
                          isActive && "bg-primary/5 font-medium"
                        )}>
                          <td className="p-2">
                            {b.limit === Infinity 
                              ? `${formatShortAmount(prevLimit)} 초과`
                              : `~${formatShortAmount(b.limit)}`
                            }
                          </td>
                          <td className="text-right p-2">{(b.rate * 100)}%</td>
                          <td className="text-right p-2">
                            {b.deduction > 0 ? `${formatShortAmount(b.deduction)}` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
