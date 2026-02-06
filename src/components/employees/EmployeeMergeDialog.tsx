import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { User, ArrowRight, Check, X, Merge } from "lucide-react";
import { formatCurrency } from "@/data/mockData";
import type { Employee } from "@/hooks/useEmployees";

export interface HometaxEmployee {
  name: string;
  external_id: string;
  monthly_salary?: number;
  start_date?: string;
  employee_type?: "정규직" | "계약직" | "알바";
  position?: string;
  department?: string;
}

export interface MergeCandidate {
  hometaxEmployee: HometaxEmployee;
  existingEmployee: Employee;
}

interface EmployeeMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: MergeCandidate | null;
  onMerge: (existingId: string, hometaxData: HometaxEmployee) => void;
  onSkip: (hometaxData: HometaxEmployee) => void;
  onCreateNew: (hometaxData: HometaxEmployee) => void;
  remainingCount?: number;
}

export function EmployeeMergeDialog({
  open,
  onOpenChange,
  candidate,
  onMerge,
  onSkip,
  onCreateNew,
  remainingCount = 0,
}: EmployeeMergeDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!candidate) return null;

  const { hometaxEmployee, existingEmployee } = candidate;

  const handleMerge = async () => {
    setIsProcessing(true);
    try {
      await onMerge(existingEmployee.id, hometaxEmployee);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateNew = async () => {
    setIsProcessing(true);
    try {
      await onCreateNew(hometaxEmployee);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    onSkip(hometaxEmployee);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5 text-primary" />
            동일 직원 확인
          </DialogTitle>
          <DialogDescription>
            홈택스에서 가져온 직원이 이미 등록된 직원과 동일한가요?
            {remainingCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {remainingCount}건 남음
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 홈택스에서 가져온 직원 */}
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="default" className="text-xs">홈택스</Badge>
                <span className="text-xs text-muted-foreground">새로 가져온 데이터</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{hometaxEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {hometaxEmployee.employee_type || "정규직"}
                    {hometaxEmployee.position && ` · ${hometaxEmployee.position}`}
                  </p>
                </div>
                {hometaxEmployee.monthly_salary && (
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(hometaxEmployee.monthly_salary)}</p>
                    <p className="text-xs text-muted-foreground">월급여</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>

          {/* 기존 등록된 직원 */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs">기존 등록</Badge>
                <span className="text-xs text-muted-foreground">수동 입력 데이터</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{existingEmployee.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {existingEmployee.employee_type}
                    {existingEmployee.position && ` · ${existingEmployee.position}`}
                    {existingEmployee.department && ` · ${existingEmployee.department}`}
                  </p>
                </div>
                {existingEmployee.monthly_salary && (
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(existingEmployee.monthly_salary)}</p>
                    <p className="text-xs text-muted-foreground">월급여</p>
                  </div>
                )}
              </div>
              {existingEmployee.start_date && (
                <p className="mt-2 text-xs text-muted-foreground">
                  입사일: {existingEmployee.start_date}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 안내 메시지 */}
          <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">병합 시 적용되는 변경:</p>
            <ul className="space-y-1 text-xs">
              <li>• 홈택스 데이터를 기존 정보에 업데이트</li>
              <li>• 연동 상태가 '자동'으로 변경</li>
              <li>• 기존 수동 입력 정보는 유지</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleMerge}
            disabled={isProcessing}
            className="w-full"
          >
            <Check className="mr-2 h-4 w-4" />
            {isProcessing ? "처리 중..." : "같은 사람입니다 (병합)"}
          </Button>
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              onClick={handleCreateNew}
              disabled={isProcessing}
              className="flex-1"
            >
              다른 사람 (새로 등록)
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isProcessing}
              className="flex-1"
            >
              <X className="mr-1 h-4 w-4" />
              건너뛰기
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
