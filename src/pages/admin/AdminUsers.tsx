import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Shield, User } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRoles {
  id: string;
  user_id: string;
  name: string | null;
  nickname: string | null;
  phone: string | null;
  business_name: string | null;
  created_at: string;
  roles: AppRole[];
}

const ROLE_LABELS: Record<AppRole, string> = {
  owner: "사업주",
  manager: "관리자",
  employee: "직원",
  admin: "시스템관리자",
};

const ROLE_COLORS: Record<AppRole, "default" | "secondary" | "destructive" | "outline"> = {
  owner: "default",
  manager: "secondary",
  employee: "outline",
  admin: "destructive",
};

export default function AdminUsers() {
  const { isAdmin, loading: authLoading, userId: currentUserId } = useAdminAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      const usersWithRoles: UserWithRoles[] = (profiles || []).map((profile) => ({
        ...profile,
        roles: (roles || [])
          .filter((r) => r.user_id === profile.user_id)
          .map((r) => r.role),
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("사용자 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleOpenRoleDialog = (user: UserWithRoles) => {
    setSelectedUser(user);
    setSelectedRole("");
    setRoleDialogOpen(true);
  };

  const handleAddRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({
          user_id: selectedUser.user_id,
          role: selectedRole,
        });

      if (error) throw error;
      toast.success(`${ROLE_LABELS[selectedRole]} 권한이 추가되었습니다`);
      setRoleDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("이미 해당 권한을 가지고 있습니다");
      } else {
        console.error("Error adding role:", error);
        toast.error("권한 추가에 실패했습니다");
      }
    }
  };

  const handleRemoveRole = async (user: UserWithRoles, role: AppRole) => {
    // Prevent removing admin role from yourself
    if (user.user_id === currentUserId && role === "admin") {
      toast.error("자신의 관리자 권한은 제거할 수 없습니다");
      return;
    }

    if (!confirm(`${ROLE_LABELS[role]} 권한을 제거하시겠습니까?`)) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.user_id)
        .eq("role", role);

      if (error) throw error;
      toast.success(`${ROLE_LABELS[role]} 권한이 제거되었습니다`);
      fetchUsers();
    } catch (error) {
      console.error("Error removing role:", error);
      toast.error("권한 제거에 실패했습니다");
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (user.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (user.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (user.phone?.includes(searchQuery) ?? false)
  );

  if (authLoading) {
    return (
      <AdminLayout title="사용자 관리" loading>
        <div />
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout title="사용자 관리">
      <div className="space-y-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="이름, 닉네임, 상호명, 전화번호로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>사용자</TableHead>
                    <TableHead>상호명</TableHead>
                    <TableHead>연락처</TableHead>
                    <TableHead>권한</TableHead>
                    <TableHead>가입일</TableHead>
                    <TableHead className="text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        {searchQuery ? "검색 결과가 없습니다" : "등록된 사용자가 없습니다"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.nickname || user.name || "이름 없음"}
                              </div>
                              {user.nickname && user.name && (
                                <div className="text-xs text-muted-foreground">{user.name}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{user.business_name || "-"}</TableCell>
                        <TableCell>{user.phone || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length === 0 ? (
                              <span className="text-muted-foreground text-sm">권한 없음</span>
                            ) : (
                              user.roles.map((role) => (
                                <Badge
                                  key={role}
                                  variant={ROLE_COLORS[role]}
                                  className="cursor-pointer"
                                  onClick={() => handleRemoveRole(user, role)}
                                >
                                  {ROLE_LABELS[role]}
                                  <span className="ml-1 opacity-60">×</span>
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString("ko-KR")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRoleDialog(user)}
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            권한 추가
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Role Dialog */}
        <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                권한 추가 - {selectedUser?.nickname || selectedUser?.name || "사용자"}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="권한을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {(["owner", "manager", "employee", "admin"] as AppRole[]).map((role) => (
                    <SelectItem 
                      key={role} 
                      value={role}
                      disabled={selectedUser?.roles.includes(role)}
                    >
                      {ROLE_LABELS[role]}
                      {selectedUser?.roles.includes(role) && " (보유중)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleAddRole} disabled={!selectedRole}>
                권한 추가
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
