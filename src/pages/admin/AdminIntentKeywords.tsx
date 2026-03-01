import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Brain, Search, Tag } from "lucide-react";

interface IntentKeyword {
  id: string;
  intent: string;
  intent_label: string;
  keywords: string[];
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormData {
  intent: string;
  intent_label: string;
  keywords_text: string;
  description: string;
  is_active: boolean;
}

const defaultForm: FormData = {
  intent: "",
  intent_label: "",
  keywords_text: "",
  description: "",
  is_active: true,
};

export default function AdminIntentKeywords() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(defaultForm);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ["admin-intent-keywords"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("intent_keywords")
        .select("*")
        .order("intent_label");
      if (error) throw error;
      return data as IntentKeyword[];
    },
    enabled: isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const keywordsArray = formData.keywords_text
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      const payload = {
        intent: formData.intent,
        intent_label: formData.intent_label,
        keywords: keywordsArray,
        description: formData.description || null,
        is_active: formData.is_active,
      };

      if (editingId) {
        const { error } = await supabase
          .from("intent_keywords")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("intent_keywords")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-intent-keywords"] });
      toast.success(editingId ? "수정되었습니다" : "추가되었습니다");
      closeDialog();
    },
    onError: (err: any) => toast.error(err.message || "저장 실패"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("intent_keywords")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-intent-keywords"] });
      toast.success("삭제되었습니다");
    },
    onError: (err: any) => toast.error(err.message || "삭제 실패"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm);
    setDialogOpen(true);
  };

  const openEdit = (item: IntentKeyword) => {
    setEditingId(item.id);
    setForm({
      intent: item.intent,
      intent_label: item.intent_label,
      keywords_text: item.keywords.join(", "),
      description: item.description || "",
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  };

  const filtered = keywords.filter(
    (k) =>
      !searchQuery ||
      k.intent_label.includes(searchQuery) ||
      k.intent.includes(searchQuery) ||
      k.keywords.some((kw) => kw.includes(searchQuery))
  );

  return (
    <AdminLayout title="AI 학습 관리" loading={authLoading}>
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">의도 키워드 관리</CardTitle>
                  <CardDescription>
                    사용자 발화를 인식하는 키워드를 추가/수정하여 AI 비서의 이해도를 향상시킵니다
                  </CardDescription>
                </div>
              </div>
              <Button onClick={openCreate} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                의도 추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="의도명 또는 키워드로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchQuery ? "검색 결과가 없습니다" : "등록된 의도가 없습니다"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((item) => (
              <Card
                key={item.id}
                className={!item.is_active ? "opacity-50" : ""}
              >
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {item.intent_label}
                        </h3>
                        <Badge variant="outline" className="text-xs font-mono">
                          {item.intent}
                        </Badge>
                        {!item.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            비활성
                          </Badge>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {item.keywords.map((kw, i) => (
                          <Badge
                            key={i}
                            variant="secondary"
                            className="text-xs"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(item)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("정말 삭제하시겠습니까?"))
                            deleteMutation.mutate(item.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "의도 수정" : "새 의도 추가"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>의도 코드 (영문)</Label>
                <Input
                  placeholder="sales_inquiry"
                  value={form.intent}
                  onChange={(e) =>
                    setForm({ ...form, intent: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>표시 이름</Label>
                <Input
                  placeholder="매출 조회"
                  value={form.intent_label}
                  onChange={(e) =>
                    setForm({ ...form, intent_label: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>키워드 (쉼표로 구분)</Label>
              <Textarea
                placeholder="매출, 매상, 벌이, 장사, 수입, 돈벌..."
                value={form.keywords_text}
                onChange={(e) =>
                  setForm({ ...form, keywords_text: e.target.value })
                }
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                사용자가 말할 수 있는 모든 표현을 쉼표로 구분하여 입력하세요
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>설명 (선택)</Label>
              <Input
                placeholder="매출/수익 관련 질문"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label>활성화</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              취소
            </Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={
                !form.intent || !form.intent_label || !form.keywords_text || saveMutation.isPending
              }
            >
              {saveMutation.isPending ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
