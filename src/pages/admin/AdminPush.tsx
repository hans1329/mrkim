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
import { Plus, Send, Clock, Search, Users, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface PushCampaign {
  id: string;
  title: string;
  message: string;
  target_type: string;
  target_roles: string[] | null;
  scheduled_at: string | null;
  sent_at: string | null;
  status: string;
  sent_count: number;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  scheduled: "예약됨",
  sent: "발송완료",
  cancelled: "취소됨",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  scheduled: "outline",
  sent: "default",
  cancelled: "destructive",
};

export default function AdminPush() {
  const { isAdmin, loading: authLoading, userId } = useAdminAuth();
  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    target_type: "all",
    scheduled_at: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("push_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("캠페인 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const handleOpenCreate = () => {
    setFormData({
      title: "",
      message: "",
      target_type: "all",
      scheduled_at: "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (sendNow: boolean = false) => {
    try {
      const payload = {
        title: formData.title,
        message: formData.message,
        target_type: formData.target_type,
        scheduled_at: formData.scheduled_at || null,
        status: sendNow ? "sent" : formData.scheduled_at ? "scheduled" : "draft",
        sent_at: sendNow ? new Date().toISOString() : null,
        created_by: userId,
      };

      const { error } = await supabase.from("push_campaigns").insert(payload);
      if (error) throw error;

      toast.success(sendNow ? "푸시 알림이 발송되었습니다" : "캠페인이 저장되었습니다");
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("저장에 실패했습니다");
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("캠페인을 취소하시겠습니까?")) return;
    try {
      const { error } = await supabase
        .from("push_campaigns")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
      toast.success("캠페인이 취소되었습니다");
      fetchData();
    } catch (error) {
      console.error("Error cancelling:", error);
      toast.error("취소에 실패했습니다");
    }
  };

  const filtered = campaigns.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return <AdminLayout title="푸시 알림 관리" loading><div /></AdminLayout>;
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout title="푸시 알림 관리">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="캠페인 제목으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            캠페인 생성
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{campaigns.filter((c) => c.status === "sent").length}</div>
              <p className="text-xs text-muted-foreground">발송 완료</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{campaigns.filter((c) => c.status === "scheduled").length}</div>
              <p className="text-xs text-muted-foreground">예약됨</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{campaigns.filter((c) => c.status === "draft").length}</div>
              <p className="text-xs text-muted-foreground">초안</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">총 발송 수</p>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다" : "등록된 캠페인이 없습니다"}
              </CardContent>
            </Card>
          ) : (
            filtered.map((item) => (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={STATUS_COLORS[item.status]}>{STATUS_LABELS[item.status]}</Badge>
                        <Badge variant="outline">
                          <Users className="w-3 h-3 mr-1" />
                          {item.target_type === "all" ? "전체" : item.target_type}
                        </Badge>
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                        {item.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            예약: {new Date(item.scheduled_at).toLocaleString("ko-KR")}
                          </span>
                        )}
                        {item.sent_at && (
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-success" />
                            발송: {new Date(item.sent_at).toLocaleString("ko-KR")}
                          </span>
                        )}
                        {item.sent_count > 0 && <span>발송 수: {item.sent_count}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === "scheduled" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(item.id)}
                          className="text-destructive"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          취소
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>새 푸시 캠페인</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="알림 제목"
                />
              </div>
              <div className="space-y-2">
                <Label>메시지</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={3}
                  placeholder="알림 내용"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>대상</Label>
                  <Select
                    value={formData.target_type}
                    onValueChange={(v) => setFormData({ ...formData, target_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 사용자</SelectItem>
                      <SelectItem value="role">특정 역할</SelectItem>
                      <SelectItem value="specific">특정 사용자</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>예약 발송</Label>
                  <Input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
              <Button variant="secondary" onClick={() => handleSave(false)}>
                <Clock className="w-4 h-4 mr-2" />
                저장
              </Button>
              <Button onClick={() => handleSave(true)}>
                <Send className="w-4 h-4 mr-2" />
                즉시 발송
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
