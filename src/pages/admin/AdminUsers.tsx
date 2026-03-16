import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Shield, User, Ban, ShieldCheck, UserX, Trash2, Loader2 } from "lucide-react";
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
  is_banned: boolean;
  banned_at: string | null;
  ban_reason: string | null;
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
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | "">("");
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");
      if (rolesError) throw rolesError;

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
    if (isAdmin) fetchUsers();
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
        .insert({ user_id: selectedUser.user_id, role: selectedRole });
      if (error) throw error;
      toast.success(`${ROLE_LABELS[selectedRole]} 권한이 추가되었습니다`);
      setRoleDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("이미 해당 권한을 가지고 있습니다");
      } else {
        toast.error("권한 추가에 실패했습니다");
      }
    }
  };

  const handleRemoveRole = async (user: UserWithRoles, role: AppRole) => {
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
      toast.error("권한 제거에 실패했습니다");
    }
  };

  const handleBanUser = (user: UserWithRoles) => {
    setSelectedUser(user);
    setBanReason("");
    setBanDialogOpen(true);
  };

  const handleConfirmBan = async () => {
    if (!selectedUser) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          is_banned: true,
          banned_at: new Date().toISOString(),
          ban_reason: banReason || null,
        })
        .eq("user_id", selectedUser.user_id);
      if (error) throw error;
      toast.success(`${selectedUser.nickname || selectedUser.name || "사용자"}님이 차단되었습니다`);
      setBanDialogOpen(false);
      fetchUsers();
    } catch (error) {
      toast.error("차단에 실패했습니다");
    }
  };

  const handleUnbanUser = async (user: UserWithRoles) => {
    if (!confirm(`${user.nickname || user.name || "사용자"}님의 차단을 해제하시겠습니까?`)) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_banned: false, banned_at: null, ban_reason: null })
        .eq("user_id", user.user_id);
      if (error) throw error;
      toast.success("차단이 해제되었습니다");
      fetchUsers();
    } catch (error) {
      toast.error("차단 해제에 실패했습니다");
    }
  };

  // 강제 탈퇴 (서버측)
  const handleForceDelete = (user: UserWithRoles) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleConfirmForceDelete = async () => {
    if (!selectedUser) return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account", {
        body: { targetUserId: selectedUser.user_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`${selectedUser.nickname || selectedUser.name || "사용자"}님이 완전 삭제되었습니다`);
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || "강제 탈퇴에 실패했습니다");
    } finally {
      setIsDeleting(false);
    }
  };

  const getUserRoles = (user?: UserWithRoles | null) => user?.roles ?? [];

  const isOrphanedProfile = (user?: UserWithRoles | null) =>
    getUserRoles(user).length === 0 && !user?.name && !user?.business_name && !user?.phone && !user?.nickname;

  const handleCleanupAllOrphaned = async () => {
    const orphaned = users.filter(isOrphanedProfile);
    if (orphaned.length === 0) {
      toast.info("정리할 탈퇴 추정 회원이 없습니다.");
      return;
    }
    if (!confirm(`탈퇴 추정 회원 ${orphaned.length}명을 모두 완전 삭제하시겠습니까?`)) return;
    setIsDeleting(true);
    try {
      for (const user of orphaned) {
        await supabase.functions.invoke("delete-account", {
          body: { targetUserId: user.user_id },
        });
      }
      toast.success(`${orphaned.length}명이 완전 삭제되었습니다.`);
      fetchUsers();
    } catch (error) {
      toast.error("일괄 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (user.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (user.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (user.phone?.includes(searchQuery) ?? false) ||
      (isOrphanedProfile(user) && "탈퇴".includes(searchQuery))
  );

  if (authLoading) {
    return (
      <AdminLayout title="사용자 관리" loading>
        <div />
      </AdminLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout title="사용자 관리">
      <TooltipProvider delayDuration={200}>
        <div className="space-y-6">
          {/* Search & Cleanup */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="이름, 닉네임, 상호명, 전화번호로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {users.filter(isOrphanedProfile).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanupAllOrphaned}
                disabled={isDeleting}
                className="gap-1.5 text-muted-foreground"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                잔여 데이터 일괄 정리 ({users.filter(isOrphanedProfile).length})
              </Button>
            )}
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
                      filteredUsers.map((user) => {
                        const isOrphaned = isOrphanedProfile(user);
                        return (
                          <TableRow
                            key={user.id}
                            className={
                              isOrphaned ? "opacity-50 bg-muted/30" :
                              user.is_banned ? "opacity-60 bg-destructive/5" : ""
                            }
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                  {isOrphaned ? (
                                    <UserX className="w-4 h-4 text-muted-foreground" />
                                  ) : user.is_banned ? (
                                    <Ban className="w-4 h-4 text-destructive" />
                                  ) : (
                                    <User className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {isOrphaned ? (
                                      <span className="text-muted-foreground italic">탈퇴 추정 회원</span>
                                    ) : (
                                      user.nickname || user.name || "이름 없음"
                                    )}
                                    {user.is_banned && !isOrphaned && (
                                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">차단됨</Badge>
                                    )}
                                    {isOrphaned && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">잔여</Badge>
                                    )}
                                  </div>
                                  {!isOrphaned && user.nickname && user.name && (
                                    <div className="text-xs text-muted-foreground">{user.name}</div>
                                  )}
                                  {user.is_banned && user.ban_reason && (
                                    <div className="text-xs text-destructive mt-0.5">사유: {user.ban_reason}</div>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{user.business_name || "-"}</TableCell>
                            <TableCell>{user.phone || "-"}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {getUserRoles(user).length === 0 ? (
                                  <span className="text-muted-foreground text-sm">-</span>
                                ) : (
                                  getUserRoles(user).map((role) => (
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
                              <div className="flex items-center justify-end gap-1">
                                {!isOrphaned && (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() => handleOpenRoleDialog(user)}
                                        >
                                          <Shield className="w-4 h-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>권한 관리</TooltipContent>
                                    </Tooltip>

                                    {user.is_banned ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                            onClick={() => handleUnbanUser(user)}
                                          >
                                            <ShieldCheck className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>차단 해제</TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                                            onClick={() => handleBanUser(user)}
                                            disabled={user.user_id === currentUserId}
                                          >
                                            <Ban className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>차단</TooltipContent>
                                      </Tooltip>
                                    )}
                                  </>
                                )}

                                {/* 강제 탈퇴 (모든 유저에 표시, 자기 자신 제외) */}
                                {user.user_id !== currentUserId && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                                        onClick={() => handleForceDelete(user)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{isOrphaned ? "잔여 데이터 삭제" : "강제 탈퇴"}</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
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
                        disabled={getUserRoles(selectedUser).includes(role)}
                      >
                        {ROLE_LABELS[role]}
                        {getUserRoles(selectedUser).includes(role) && " (보유중)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>취소</Button>
                <Button onClick={handleAddRole} disabled={!selectedRole}>권한 추가</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Ban Dialog */}
          <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Ban className="w-5 h-5 text-destructive" />
                  사용자 차단 - {selectedUser?.nickname || selectedUser?.name || "사용자"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  차단된 사용자는 서비스에 접근할 수 없게 됩니다.
                </p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">차단 사유 (선택)</label>
                  <Textarea
                    placeholder="차단 사유를 입력하세요..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setBanDialogOpen(false)}>취소</Button>
                <Button variant="destructive" onClick={handleConfirmBan}>차단하기</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Force Delete Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  {isOrphanedProfile(selectedUser) ? "잔여 데이터 삭제" : "강제 탈퇴"} - {selectedUser?.nickname || selectedUser?.name || "사용자"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  이 사용자의 <strong>모든 데이터와 계정</strong>이 영구 삭제됩니다.
                </p>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                  <li>프로필, 사업장 정보, 권한</li>
                  <li>거래내역, 직원, AI 대화 기록</li>
                  <li>연동 데이터, 예적금, 자동이체</li>
                  <li>auth 계정 (로그인 불가)</li>
                </ul>
                <p className="text-sm font-medium text-destructive">이 작업은 되돌릴 수 없습니다.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
                  취소
                </Button>
                <Button variant="destructive" onClick={handleConfirmForceDelete} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      삭제 중...
                    </>
                  ) : (
                    "완전 삭제"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </AdminLayout>
  );
}
