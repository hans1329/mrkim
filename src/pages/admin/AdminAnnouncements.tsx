import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, Megaphone, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  is_active: boolean;
  is_popup: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  notice: "공지",
  update: "업데이트",
  event: "이벤트",
  maintenance: "점검",
};

const TYPE_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  notice: "default",
  update: "secondary",
  event: "outline",
  maintenance: "destructive",
};

export default function AdminAnnouncements() {
  const { isAdmin, loading: authLoading, userId } = useAdminAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: "notice",
    is_active: true,
    is_popup: false,
    start_at: "",
    end_at: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("공지사항을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData({
      title: "",
      content: "",
      type: "notice",
      is_active: true,
      is_popup: false,
      start_at: "",
      end_at: "",
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: Announcement) => {
    setEditing(item);
    setFormData({
      title: item.title,
      content: item.content,
      type: item.type,
      is_active: item.is_active,
      is_popup: item.is_popup,
      start_at: item.start_at ? new Date(item.start_at).toISOString().slice(0, 16) : "",
      end_at: item.end_at ? new Date(item.end_at).toISOString().slice(0, 16) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        is_active: formData.is_active,
        is_popup: formData.is_popup,
        start_at: formData.start_at || null,
        end_at: formData.end_at || null,
        created_by: userId,
      };

      if (editing) {
        const { error } = await supabase
          .from("announcements")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("공지사항이 수정되었습니다");
      } else {
        const { error } = await supabase.from("announcements").insert(payload);
        if (error) throw error;
        toast.success("공지사항이 생성되었습니다");
      }

      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("저장에 실패했습니다");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
      toast.success("삭제되었습니다");
      fetchData();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("삭제에 실패했습니다");
    }
  };

  const filtered = announcements.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return <AdminLayout title="공지사항 관리" loading><div /></AdminLayout>;
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout title="공지사항 관리">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="제목으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            공지 추가
          </Button>
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
                {searchQuery ? "검색 결과가 없습니다" : "등록된 공지사항이 없습니다"}
              </CardContent>
            </Card>
          ) : (
            filtered.map((item) => (
              <Card key={item.id} className={!item.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={TYPE_COLORS[item.type]}>{TYPE_LABELS[item.type]}</Badge>
                        {item.is_popup && <Badge variant="outline">팝업</Badge>}
                        {!item.is_active && <Badge variant="secondary">비활성</Badge>}
                        <CardTitle className="text-base">{item.title}</CardTitle>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{item.content}</p>
                      {(item.start_at || item.end_at) && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                          <CalendarClock className="w-3 h-3" />
                          <span>
                            {item.start_at ? new Date(item.start_at).toLocaleDateString("ko-KR") : "시작일 없음"}
                            {" ~ "}
                            {item.end_at ? new Date(item.end_at).toLocaleDateString("ko-KR") : "종료일 없음"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
              <DialogTitle>{editing ? "공지사항 수정" : "새 공지사항"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>유형</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>상태</Label>
                  <div className="flex items-center gap-4 h-10">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
                      />
                      <span className="text-sm">활성</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={formData.is_popup}
                        onCheckedChange={(c) => setFormData({ ...formData, is_popup: c })}
                      />
                      <span className="text-sm">팝업</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="공지 제목"
                />
              </div>
              <div className="space-y-2">
                <Label>내용</Label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={4}
                  placeholder="공지 내용을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>시작일시</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_at}
                    onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>종료일시</Label>
                  <Input
                    type="datetime-local"
                    value={formData.end_at}
                    onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
              <Button onClick={handleSave}>{editing ? "수정" : "추가"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
