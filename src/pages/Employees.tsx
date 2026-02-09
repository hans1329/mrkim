import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/data/mockData";
import { Plus, Users, Wallet, Shield, User, LinkIcon, Heart } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { PraiseDialog } from "@/components/employees/PraiseDialog";
import {
  useEmployees,
  useEmployeeStats,
  useAddEmployee,
  useResignEmployee,
  type Employee,
  type EmployeeInsert,
} from "@/hooks/useEmployees";

export default function Employees() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResignDialogOpen, setIsResignDialogOpen] = useState(false);
  const [isPraiseDialogOpen, setIsPraiseDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState<EmployeeInsert>({
    name: "",
    phone: "",
    employee_type: "정규직",
    position: "",
    department: "",
    monthly_salary: undefined,
    insurance_national_pension: true,
    insurance_health: true,
    insurance_employment: true,
    insurance_industrial: true,
  });

  const { data: employees, isLoading } = useEmployees();
  const { data: stats, isLoading: isStatsLoading } = useEmployeeStats();
  const addEmployee = useAddEmployee();
  const resignEmployee = useResignEmployee();

  const handleAddEmployee = () => {
    if (!newEmployee.name) {
      toast.error("이름을 입력해주세요");
      return;
    }

    addEmployee.mutate(newEmployee, {
      onSuccess: () => {
        toast.success("직원이 등록되었습니다");
        setNewEmployee({
          name: "",
          phone: "",
          employee_type: "정규직",
          position: "",
          department: "",
          monthly_salary: undefined,
          insurance_national_pension: true,
          insurance_health: true,
          insurance_employment: true,
          insurance_industrial: true,
        });
        setIsAddDialogOpen(false);
      },
      onError: (error) => {
        toast.error(error.message || "등록에 실패했습니다");
      },
    });
  };

  const handleResign = () => {
    if (!selectedEmployee) return;

    resignEmployee.mutate(selectedEmployee.id, {
      onSuccess: () => {
        toast.success("퇴사 처리되었습니다");
        setIsResignDialogOpen(false);
        setSelectedEmployee(null);
      },
      onError: (error) => {
        toast.error(error.message || "퇴사 처리에 실패했습니다");
      },
    });
  };

  const isEmpty = !isLoading && (!employees || employees.length === 0);

  return (
    <MainLayout title="직원 관리" subtitle="직원 정보를 관리하세요" showBackButton>
      <div className="space-y-4">
        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-xs text-muted-foreground">재직</p>
              {isStatsLoading ? (
                <Skeleton className="h-5 w-10 mx-auto mt-0.5" />
              ) : (
                <p className="text-sm font-bold">{stats?.activeCount || 0}명</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Wallet className="mx-auto h-5 w-5 text-green-600" />
              <p className="mt-1 text-xs text-muted-foreground">총 급여</p>
              {isStatsLoading ? (
                <Skeleton className="h-5 w-12 mx-auto mt-0.5" />
              ) : (
                <p className="text-sm font-bold">
                  ₩{Math.round((stats?.totalSalary || 0) / 10000)}만
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Shield className="mx-auto h-5 w-5 text-amber-500" />
              <p className="mt-1 text-xs text-muted-foreground">4대보험</p>
              {isStatsLoading ? (
                <Skeleton className="h-5 w-10 mx-auto mt-0.5" />
              ) : (
                <p className="text-sm font-bold">{stats?.insuredCount || 0}명</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 직원 추가 버튼 */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              직원 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>새 직원 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>이름 *</Label>
                  <Input
                    placeholder="홍길동"
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>전화번호</Label>
                  <Input
                    type="tel"
                    placeholder="010-0000-0000"
                    value={newEmployee.phone || ""}
                    onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>고용형태</Label>
                  <Select
                    value={newEmployee.employee_type}
                    onValueChange={(value: "정규직" | "계약직" | "알바") =>
                      setNewEmployee({ ...newEmployee, employee_type: value })
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
                    value={newEmployee.position || ""}
                    onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>부서</Label>
                  <Select
                    value={newEmployee.department || ""}
                    onValueChange={(value) => setNewEmployee({ ...newEmployee, department: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="부서 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="운영">운영</SelectItem>
                      <SelectItem value="주방">주방</SelectItem>
                      <SelectItem value="홀">홀</SelectItem>
                      <SelectItem value="관리">관리</SelectItem>
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
                    value={newEmployee.monthly_salary ? newEmployee.monthly_salary.toLocaleString() : ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, "");
                      setNewEmployee({
                        ...newEmployee,
                        monthly_salary: value ? parseInt(value) : undefined,
                      });
                    }}
                  />
                </div>
              </div>

              {/* 4대보험 체크박스 */}
              <div className="space-y-2">
                <Label>4대보험 가입</Label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pension"
                      checked={newEmployee.insurance_national_pension}
                      onCheckedChange={(checked) =>
                        setNewEmployee({ ...newEmployee, insurance_national_pension: !!checked })
                      }
                    />
                    <label htmlFor="pension" className="text-sm">국민연금</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="health"
                      checked={newEmployee.insurance_health}
                      onCheckedChange={(checked) =>
                        setNewEmployee({ ...newEmployee, insurance_health: !!checked })
                      }
                    />
                    <label htmlFor="health" className="text-sm">건강보험</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="employment"
                      checked={newEmployee.insurance_employment}
                      onCheckedChange={(checked) =>
                        setNewEmployee({ ...newEmployee, insurance_employment: !!checked })
                      }
                    />
                    <label htmlFor="employment" className="text-sm">고용보험</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="industrial"
                      checked={newEmployee.insurance_industrial}
                      onCheckedChange={(checked) =>
                        setNewEmployee({ ...newEmployee, insurance_industrial: !!checked })
                      }
                    />
                    <label htmlFor="industrial" className="text-sm">산재보험</label>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAddEmployee}
                className="w-full"
                disabled={addEmployee.isPending}
              >
                {addEmployee.isPending ? "등록 중..." : "등록하기"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 직원 목록 */}
        {isLoading ? (
          <Card>
            <CardContent className="divide-y p-0">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-4 w-16 mb-1 ml-auto" />
                    <Skeleton className="h-3 w-20 ml-auto" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : isEmpty ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Users className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="mb-1 font-semibold text-base">등록된 직원이 없습니다</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                직원을 등록하면 급여 및 4대보험을 관리할 수 있습니다
              </p>
              <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                직원 추가
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y p-0">
              {employees?.map((employee) => (
                <div
                  key={employee.id}
                  className={`flex items-center justify-between p-4 ${
                    employee.status === "퇴사" ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{employee.name}</p>
                        <Badge
                          variant={employee.status === "재직" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {employee.status}
                        </Badge>
                        {employee.source === "hometax" && (
                          <Badge variant="secondary" className="text-[10px]">
                            <LinkIcon className="h-2.5 w-2.5 mr-0.5" />
                            자동
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {employee.employee_type}
                        {employee.position && ` · ${employee.position}`}
                        {employee.department && ` · ${employee.department}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {employee.status === "재직" && employee.phone && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEmployee(employee);
                          setIsPraiseDialogOpen(true);
                        }}
                      >
                        <Heart className="h-4 w-4 text-pink-500" />
                      </Button>
                    )}
                    <div
                      className={`text-right ${employee.status === "재직" ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (employee.status === "재직") {
                          setSelectedEmployee(employee);
                          setIsResignDialogOpen(true);
                        }
                      }}
                    >
                      <p className="font-semibold">
                        {employee.monthly_salary
                          ? formatCurrency(employee.monthly_salary)
                          : "-"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {employee.start_date ? `${employee.start_date} 입사` : "입사일 미등록"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 퇴사 확인 다이얼로그 */}
        <Dialog open={isResignDialogOpen} onOpenChange={setIsResignDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>퇴사 처리 확인</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground">
                <strong>{selectedEmployee?.name}</strong> 직원을 퇴사 처리하시겠습니까?
              </p>
              <div className="mt-4 rounded-lg bg-muted p-4">
                <p className="text-sm font-medium">퇴사 처리 시 진행되는 절차:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>✅ 4대보험 상실신고 (별도 진행 필요)</li>
                  <li>✅ 퇴직금 계산 (별도 확인 필요)</li>
                  <li>✅ 마지막 급여 정산 (별도 확인 필요)</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResignDialogOpen(false)}>
                취소
              </Button>
              <Button
                variant="destructive"
                onClick={handleResign}
                disabled={resignEmployee.isPending}
              >
                {resignEmployee.isPending ? "처리 중..." : "퇴사 처리"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 칭찬하기 다이얼로그 */}
        {selectedEmployee?.phone && (
          <PraiseDialog
            open={isPraiseDialogOpen}
            onOpenChange={setIsPraiseDialogOpen}
            employeeName={selectedEmployee.name}
            employeePhone={selectedEmployee.phone}
          />
        )}
      </div>
    </MainLayout>
  );
}
