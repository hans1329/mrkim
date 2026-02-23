import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useUpdateEmployee, useResignEmployee, type Employee } from "@/hooks/useEmployees";

interface EmployeeEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee;
}

export function EmployeeEditDialog({ open, onOpenChange, employee }: EmployeeEditDialogProps) {
  const [form, setForm] = useState({
    name: employee.name,
    phone: employee.phone || "",
    employee_type: employee.employee_type,
    position: employee.position || "",
    department: employee.department || "",
    monthly_salary: employee.monthly_salary || undefined as number | undefined,
    hourly_rate: employee.hourly_rate || undefined as number | undefined,
    weekly_hours: employee.weekly_hours || undefined as number | undefined,
    insurance_national_pension: employee.insurance_national_pension,
    insurance_health: employee.insurance_health,
    insurance_employment: employee.insurance_employment,
    insurance_industrial: employee.insurance_industrial,
    start_date: employee.start_date || "",
    memo: employee.memo || "",
  });

  useEffect(() => {
    setForm({
      name: employee.name,
      phone: employee.phone || "",
      employee_type: employee.employee_type,
      position: employee.position || "",
      department: employee.department || "",
      monthly_salary: employee.monthly_salary || undefined,
      hourly_rate: employee.hourly_rate || undefined,
      weekly_hours: employee.weekly_hours || undefined,
      insurance_national_pension: employee.insurance_national_pension,
      insurance_health: employee.insurance_health,
      insurance_employment: employee.insurance_employment,
      insurance_industrial: employee.insurance_industrial,
      start_date: employee.start_date || "",
      memo: employee.memo || "",
    });
  }, [employee]);

  const updateEmployee = useUpdateEmployee();
  const resignEmployee = useResignEmployee();

  const handleSave = () => {
    if (!form.name) {
      toast.error("이름을 입력해주세요");
      return;
    }

    updateEmployee.mutate(
      {
        id: employee.id,
        name: form.name,
        phone: form.phone || null,
        employee_type: form.employee_type,
        position: form.position || null,
        department: form.department || null,
        monthly_salary: form.monthly_salary || null,
        hourly_rate: form.hourly_rate || null,
        weekly_hours: form.weekly_hours || null,
        insurance_national_pension: form.insurance_national_pension,
        insurance_health: form.insurance_health,
        insurance_employment: form.insurance_employment,
        insurance_industrial: form.insurance_industrial,
        start_date: form.start_date || null,
        memo: form.memo || null,
      } as any,
      {
        onSuccess: () => {
          toast.success("직원 정보가 수정되었습니다");
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(error.message || "수정에 실패했습니다");
        },
      }
    );
  };

  const handleResign = () => {
    resignEmployee.mutate(employee.id, {
      onSuccess: () => {
        toast.success("퇴사 처리되었습니다");
        onOpenChange(false);
      },
      onError: (error) => {
        toast.error(error.message || "퇴사 처리에 실패했습니다");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>직원 정보 편집</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 이름 + 전화번호 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>이름 *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>전화번호</Label>
              <Input
                type="tel"
                placeholder="010-0000-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          {/* 고용형태 + 직책 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>고용형태</Label>
              <Select
                value={form.employee_type}
                onValueChange={(value: "정규직" | "계약직" | "알바") =>
                  setForm({ ...form, employee_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="정규직">정규직</SelectItem>
                  <SelectItem value="계약직">계약직</SelectItem>
                  <SelectItem value="알바">알바</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>직책</Label>
              <Input
                placeholder="매니저"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
          </div>

          {/* 부서 + 급여 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>부서</Label>
              <Select
                value={form.department || ""}
                onValueChange={(value) => setForm({ ...form, department: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="부서 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="경영/관리">경영/관리</SelectItem>
                  <SelectItem value="개발">개발</SelectItem>
                  <SelectItem value="디자인">디자인</SelectItem>
                  <SelectItem value="마케팅">마케팅</SelectItem>
                  <SelectItem value="영업">영업</SelectItem>
                  <SelectItem value="운영">운영</SelectItem>
                  <SelectItem value="인사/총무">인사/총무</SelectItem>
                  <SelectItem value="재무/회계">재무/회계</SelectItem>
                  <SelectItem value="고객지원">고객지원</SelectItem>
                  <SelectItem value="물류/배송">물류/배송</SelectItem>
                  <SelectItem value="주방">주방</SelectItem>
                  <SelectItem value="홀">홀</SelectItem>
                  <SelectItem value="생산/제조">생산/제조</SelectItem>
                  <SelectItem value="기타">기타</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>월급여</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={form.monthly_salary ? form.monthly_salary.toLocaleString() : ""}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^\d]/g, "");
                  setForm({ ...form, monthly_salary: value ? parseInt(value) : undefined });
                }}
              />
            </div>
          </div>

          {/* 입사일 + 메모 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>입사일</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Input
                placeholder="메모"
                value={form.memo}
                onChange={(e) => setForm({ ...form, memo: e.target.value })}
              />
            </div>
          </div>

          {/* 4대보험 */}
          <div className="space-y-2">
            <Label>4대보험 가입</Label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-pension"
                  checked={form.insurance_national_pension}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, insurance_national_pension: !!checked })
                  }
                />
                <label htmlFor="edit-pension" className="text-sm">국민연금</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-health"
                  checked={form.insurance_health}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, insurance_health: !!checked })
                  }
                />
                <label htmlFor="edit-health" className="text-sm">건강보험</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-employment"
                  checked={form.insurance_employment}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, insurance_employment: !!checked })
                  }
                />
                <label htmlFor="edit-employment" className="text-sm">고용보험</label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-industrial"
                  checked={form.insurance_industrial}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, insurance_industrial: !!checked })
                  }
                />
                <label htmlFor="edit-industrial" className="text-sm">산재보험</label>
              </div>
            </div>
          </div>

          {/* 퇴사 처리 영역 */}
          {employee.status === "재직" && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-destructive">퇴사 처리</Label>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    퇴사 처리 시 4대보험 상실신고, 퇴직금 계산, 마지막 급여 정산은 별도 진행이 필요합니다.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="w-full">
                        퇴사 처리
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>퇴사 처리 확인</AlertDialogTitle>
                        <AlertDialogDescription>
                          <strong>{employee.name}</strong> 직원을 퇴사 처리하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>취소</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleResign}
                          disabled={resignEmployee.isPending}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {resignEmployee.isPending ? "처리 중..." : "퇴사 처리"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={updateEmployee.isPending}>
            {updateEmployee.isPending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
