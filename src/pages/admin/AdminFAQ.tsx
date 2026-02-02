import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminFAQ() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState({
    question: "",
    answer: "",
    keywords: "",
    priority: 0,
    is_active: true,
  });

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("service_faq")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFaqs(data || []);
    } catch (error) {
      console.error("Error fetching FAQs:", error);
      toast.error("FAQ 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchFaqs();
    }
  }, [isAdmin]);

  const handleOpenCreate = () => {
    setEditingFaq(null);
    setFormData({
      question: "",
      answer: "",
      keywords: "",
      priority: 0,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      question: faq.question,
      answer: faq.answer,
      keywords: faq.keywords.join(", "),
      priority: faq.priority,
      is_active: faq.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const keywordsArray = formData.keywords
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);

      if (editingFaq) {
        // Update
        const { error } = await supabase
          .from("service_faq")
          .update({
            question: formData.question,
            answer: formData.answer,
            keywords: keywordsArray,
            priority: formData.priority,
            is_active: formData.is_active,
          })
          .eq("id", editingFaq.id);

        if (error) throw error;
        toast.success("FAQ가 수정되었습니다");
      } else {
        // Create
        const { error } = await supabase
          .from("service_faq")
          .insert({
            question: formData.question,
            answer: formData.answer,
            keywords: keywordsArray,
            priority: formData.priority,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success("FAQ가 생성되었습니다");
      }

      setDialogOpen(false);
      fetchFaqs();
    } catch (error) {
      console.error("Error saving FAQ:", error);
      toast.error("FAQ 저장에 실패했습니다");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      const { error } = await supabase
        .from("service_faq")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("FAQ가 삭제되었습니다");
      fetchFaqs();
    } catch (error) {
      console.error("Error deleting FAQ:", error);
      toast.error("FAQ 삭제에 실패했습니다");
    }
  };

  const handleToggleActive = async (faq: FAQ) => {
    try {
      const { error } = await supabase
        .from("service_faq")
        .update({ is_active: !faq.is_active })
        .eq("id", faq.id);

      if (error) throw error;
      toast.success(faq.is_active ? "비활성화되었습니다" : "활성화되었습니다");
      fetchFaqs();
    } catch (error) {
      console.error("Error toggling FAQ:", error);
      toast.error("상태 변경에 실패했습니다");
    }
  };

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.keywords.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (authLoading) {
    return (
      <AdminLayout title="FAQ 관리" loading>
        <div />
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout title="FAQ 관리">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="질문 또는 키워드로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            FAQ 추가
          </Button>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : filteredFaqs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다" : "등록된 FAQ가 없습니다"}
              </CardContent>
            </Card>
          ) : (
            filteredFaqs.map((faq) => (
              <Card key={faq.id} className={!faq.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{faq.question}</CardTitle>
                        {!faq.is_active && (
                          <Badge variant="secondary">비활성</Badge>
                        )}
                        {faq.priority > 0 && (
                          <Badge variant="outline">우선순위: {faq.priority}</Badge>
                        )}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {faq.answer}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(faq)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(faq.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {faq.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Switch
                      id={`active-${faq.id}`}
                      checked={faq.is_active}
                      onCheckedChange={() => handleToggleActive(faq)}
                    />
                    <Label htmlFor={`active-${faq.id}`} className="text-sm text-muted-foreground">
                      활성화
                    </Label>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingFaq ? "FAQ 수정" : "새 FAQ 추가"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="question">질문</Label>
                <Input
                  id="question"
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="예: 김비서가 뭐예요?"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="answer">답변 (Markdown 지원)</Label>
                <Textarea
                  id="answer"
                  value={formData.answer}
                  onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                  placeholder="답변 내용을 입력하세요..."
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">키워드 (쉼표로 구분)</Label>
                <Input
                  id="keywords"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="예: 소개, 김비서, 서비스"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">우선순위</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>상태</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <span className="text-sm">
                      {formData.is_active ? "활성" : "비활성"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave}>
                {editingFaq ? "수정" : "추가"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
