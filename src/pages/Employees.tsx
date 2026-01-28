import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { mockEmployees, Employee, formatCurrency } from "@/data/mockData";
import { Plus, Users, Wallet, Shield, UserMinus, User } from "lucide-react";

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>(mockEmployees);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isResignDialogOpen, setIsResignDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    position: "",
    department: "",
    salary: "",
  });

  const activeEmployees = employees.filter((e) => e.status === "재직");
  const totalSalary = activeEmployees.reduce((sum, e) => sum + e.salary, 0);

  const handleAddEmployee = () => {
    if (!newEmployee.name || !newEmployee.position || !newEmployee.salary) return;

    const employee: Employee = {
      id: Date.now().toString(),
      name: newEmployee.name,
      position: newEmployee.position,
      department: newEmployee.department || "미지정",
      salary: parseInt(newEmployee.salary),
      joinDate: new Date().toISOString().split("T")[0],
      insuranceStatus: "가입",
      status: "재직",
    };

    setEmployees([...employees, employee]);
    setNewEmployee({ name: "", position: "", department: "", salary: "" });
    setIsAddDialogOpen(false);
  };

  const handleResign = () => {
    if (!selectedEmployee) return;

    setEmployees(
      employees.map((e) =>
        e.id === selectedEmployee.id ? { ...e, status: "퇴사" as const } : e
      )
    );
    setIsResignDialogOpen(false);
    setSelectedEmployee(null);
  };

  return (
    <MainLayout title="직원 관리" subtitle="직원 정보를 관리하세요">
      <div className="space-y-4">
        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-xs text-muted-foreground">재직</p>
              <p className="text-sm font-bold">{activeEmployees.length}명</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Wallet className="mx-auto h-5 w-5 text-success" />
              <p className="mt-1 text-xs text-muted-foreground">총 급여</p>
              <p className="text-sm font-bold">₩{Math.round(totalSalary / 10000)}만</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Shield className="mx-auto h-5 w-5 text-warning" />
              <p className="mt-1 text-xs text-muted-foreground">4대보험</p>
              <p className="text-sm font-bold">
                {activeEmployees.filter((e) => e.insuranceStatus === "가입").length}명
              </p>
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 직원 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>이름</Label>
                <Input
                  placeholder="홍길동"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>직책</Label>
                <Input
                  placeholder="매니저"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>부서</Label>
                <Select
                  value={newEmployee.department}
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
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>급여 (월)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newEmployee.salary}
                  onChange={(e) => setNewEmployee({ ...newEmployee, salary: e.target.value })}
                />
              </div>
              <Button onClick={handleAddEmployee} className="w-full">
                등록하기
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* 직원 목록 */}
        <Card>
          <CardContent className="divide-y p-0">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className={`flex items-center justify-between p-4 ${employee.status === "퇴사" ? "opacity-50" : ""}`}
                onClick={() => {
                  if (employee.status === "재직") {
                    setSelectedEmployee(employee);
                    setIsResignDialogOpen(true);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{employee.name}</p>
                      <Badge variant={employee.status === "재직" ? "default" : "outline"} className="text-xs">
                        {employee.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {employee.position} · {employee.department}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(employee.salary)}</p>
                  <p className="text-xs text-muted-foreground">{employee.joinDate} 입사</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

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
                  <li>✅ 4대보험 상실신고</li>
                  <li>✅ 퇴직금 계산</li>
                  <li>✅ 마지막 급여 정산</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResignDialogOpen(false)}>
                취소
              </Button>
              <Button variant="destructive" onClick={handleResign}>
                퇴사 처리
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
