import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, Eye, MessageSquare, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Feedback {
  id: string;
  user_id: string | null;
  user_email: string | null;
  category: string;
  subject: string;
  content: string;
  status: string;
  admin_notes: string | null;
  responded_at: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "대기중",
  in_progress: "처리중",
  resolved: "해결됨",
  closed: "종료",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "destructive",
  in_progress: "secondary",
  resolved: "default",
  closed: "outline",
};

const CATEGORY_LABELS: Record<string, string> = {
  general: "일반",
  bug: "버그",
  feature: "기능 요청",
  billing: "결제",
  other: "기타",
};

export default function AdminFeedback() {
  const { isAdmin, loading: authLoading, userId } = useAdminAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Feedback | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_feedback")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast.error("피드백 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const handleOpenDetail = (item: Feedback) => {
    setSelected(item);
    setAdminNotes(item.admin_notes || "");
    setNewStatus(item.status);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    try {
      const { error } = await supabase
        .from("user_feedback")
        .update({
          status: newStatus,
          admin_notes: adminNotes,
          responded_by: userId,
          responded_at: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (error) throw error;
      toast.success("피드백이 업데이트되었습니다");
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error updating:", error);
      toast.error("업데이트에 실패했습니다");
    }
  };

  const filtered = feedbacks.filter((f) => {
    const matchesSearch =
      f.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = feedbacks.filter((f) => f.status === "pending").length;
  const inProgressCount = feedbacks.filter((f) => f.status === "in_progress").length;

  if (authLoading) {
    return <AdminLayout title="피드백/문의 관리" loading><div /></AdminLayout>;
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout title="피드백/문의 관리">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className={pendingCount > 0 ? "border-destructive" : ""}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertCircle className={pendingCount > 0 ? "w-5 h-5 text-destructive" : "w-5 h-5 text-muted-foreground"} />
                <div>
                  <div className="text-2xl font-bold">{pendingCount}</div>
                  <p className="text-xs text-muted-foreground">대기중</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{inProgressCount}</div>
                  <p className="text-xs text-muted-foreground">처리중</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <div>
                  <div className="text-2xl font-bold">
                    {feedbacks.filter((f) => f.status === "resolved").length}
                  </div>
                  <p className="text-xs text-muted-foreground">해결됨</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{feedbacks.length}</div>
                  <p className="text-xs text-muted-foreground">전체</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="제목 또는 내용으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <>
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery || statusFilter !== "all" ? "검색 결과가 없습니다" : "피드백이 없습니다"}
              </CardContent>
            </Card>
          ) : (
            filtered.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleOpenDetail(item)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                        <Badge variant="outline">{CATEGORY_LABELS[item.category]}</Badge>
                        <span className="font-medium">{item.subject}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{item.content}</p>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleString("ko-KR")}
                        {item.user_email && ` · ${item.user_email}`}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge variant={STATUS_COLORS[selected?.status || "pending"]}>
                  {STATUS_LABELS[selected?.status || "pending"]}
                </Badge>
                <Badge variant="outline">{CATEGORY_LABELS[selected?.category || "general"]}</Badge>
              </DialogTitle>
            </DialogHeader>
            {selected && (
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-muted-foreground">제목</Label>
                  <p className="font-medium">{selected.subject}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">내용</Label>
                  <p className="whitespace-pre-wrap bg-muted/50 p-3 rounded-lg mt-1">{selected.content}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">작성일</Label>
                    <p>{new Date(selected.created_at).toLocaleString("ko-KR")}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">작성자</Label>
                    <p>{selected.user_email || "비회원"}</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>상태 변경</Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>관리자 메모</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      rows={3}
                      placeholder="처리 내용을 메모하세요..."
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>닫기</Button>
              <Button onClick={handleSave}>저장</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
