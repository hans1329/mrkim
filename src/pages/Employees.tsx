import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Plus, Users, Wallet, Shield, UserMinus, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    <MainLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">직원 관리</h1>
            <p className="text-muted-foreground">직원 정보와 급여를 관리하세요</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
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
        </div>

        {/* 요약 카드 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">재직 인원</p>
                <p className="text-xl font-bold">{activeEmployees.length}명</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Wallet className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 급여</p>
                <p className="text-xl font-bold">{formatCurrency(totalSalary)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <Shield className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">4대보험 가입</p>
                <p className="text-xl font-bold">
                  {activeEmployees.filter((e) => e.insuranceStatus === "가입").length}명
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 직원 목록 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">직원 목록</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>직책</TableHead>
                  <TableHead>부서</TableHead>
                  <TableHead>입사일</TableHead>
                  <TableHead>4대보험</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">급여</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id} className={employee.status === "퇴사" ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.position}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.joinDate}</TableCell>
                    <TableCell>
                      <Badge variant={employee.insuranceStatus === "가입" ? "default" : "secondary"}>
                        {employee.insuranceStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.status === "재직" ? "default" : "outline"}>
                        {employee.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(employee.salary)}
                    </TableCell>
                    <TableCell>
                      {employee.status === "재직" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setIsResignDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              퇴사 처리
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
