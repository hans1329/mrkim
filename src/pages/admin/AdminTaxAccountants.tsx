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
import { Plus, Pencil, Trash2, Search, Mail, Phone, Building2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface TaxAccountant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  firm_name: string | null;
  region: string | null;
  bio: string | null;
  specialties: string[];
  industry_types: string[];
  pricing_info: Record<string, unknown> | null;
  profile_image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  firm_name: "",
  region: "",
  bio: "",
  specialties: "",
  industry_types: "",
  is_active: true,
};

export default function AdminTaxAccountants() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [accountants, setAccountants] = useState<TaxAccountant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxAccountant | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchAccountants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tax_accountants")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccountants((data as TaxAccountant[]) || []);
    } catch (error) {
      console.error("Error fetching accountants:", error);
      toast.error("세무사 목록을 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchAccountants();
  }, [isAdmin]);

  const handleOpenCreate = () => {
    setEditing(null);
    setFormData(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (acc: TaxAccountant) => {
    setEditing(acc);
    setFormData({
      name: acc.name,
      email: acc.email,
      phone: acc.phone || "",
      firm_name: acc.firm_name || "",
      region: acc.region || "",
      bio: acc.bio || "",
      specialties: (acc.specialties || []).join(", "),
      industry_types: (acc.industry_types || []).join(", "),
      is_active: acc.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const toArray = (str: string) =>
    str.split(",").map((s) => s.trim()).filter(Boolean);

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      toast.error("이름과 이메일은 필수입니다");
      return;
    }

    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        firm_name: formData.firm_name || null,
        region: formData.region || null,
        bio: formData.bio || null,
        specialties: toArray(formData.specialties),
        industry_types: toArray(formData.industry_types),
        is_active: formData.is_active,
      };

      if (editing) {
        const { error } = await supabase
          .from("tax_accountants")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("세무사 정보가 수정되었습니다");
      } else {
        const { error } = await supabase
          .from("tax_accountants")
          .insert(payload);
        if (error) throw error;
        toast.success("세무사가 등록되었습니다");
      }

      setDialogOpen(false);
      fetchAccountants();
    } catch (error) {
      console.error("Error saving accountant:", error);
      toast.error("저장에 실패했습니다");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from("tax_accountants").delete().eq("id", id);
      if (error) throw error;
      toast.success("세무사가 삭제되었습니다");
      fetchAccountants();
    } catch (error) {
      console.error("Error deleting accountant:", error);
      toast.error("삭제에 실패했습니다");
    }
  };

  const handleToggleActive = async (acc: TaxAccountant) => {
    try {
      const { error } = await supabase
        .from("tax_accountants")
        .update({ is_active: !acc.is_active })
        .eq("id", acc.id);
      if (error) throw error;
      toast.success(acc.is_active ? "비활성화되었습니다" : "활성화되었습니다");
      fetchAccountants();
    } catch (error) {
      console.error("Error toggling accountant:", error);
      toast.error("상태 변경에 실패했습니다");
    }
  };

  const filtered = accountants.filter(
    (a) =>
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.firm_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.region || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) {
    return (
      <AdminLayout title="세무사 관리" loading>
        <div />
      </AdminLayout>
    );
  }

  if (!isAdmin) return null;

  return (
    <AdminLayout title="세무사 관리">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="이름, 이메일, 사무소, 지역으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            세무사 등록
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-foreground">{accountants.length}</p>
              <p className="text-sm text-muted-foreground">전체</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-success">{accountants.filter((a) => a.is_active).length}</p>
              <p className="text-sm text-muted-foreground">활성</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{accountants.filter((a) => !a.is_active).length}</p>
              <p className="text-sm text-muted-foreground">비활성</p>
            </CardContent>
          </Card>
        </div>

        {/* List */}
        <div className="space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-36 w-full" />
            </>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {searchQuery ? "검색 결과가 없습니다" : "등록된 세무사가 없습니다"}
              </CardContent>
            </Card>
          ) : (
            filtered.map((acc) => (
              <Card key={acc.id} className={!acc.is_active ? "opacity-60" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">{acc.name}</CardTitle>
                        {acc.firm_name && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {acc.firm_name}
                          </span>
                        )}
                        {!acc.is_active && <Badge variant="secondary">비활성</Badge>}
                      </div>
                      <CardDescription className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {acc.email}
                        </span>
                        {acc.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {acc.phone}
                          </span>
                        )}
                        {acc.region && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {acc.region}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(acc)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(acc.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {acc.bio && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{acc.bio}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(acc.specialties || []).map((s, i) => (
                      <Badge key={i} variant="default" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                    {(acc.industry_types || []).map((t, i) => (
                      <Badge key={`ind-${i}`} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`active-${acc.id}`}
                      checked={acc.is_active}
                      onCheckedChange={() => handleToggleActive(acc)}
                    />
                    <Label htmlFor={`active-${acc.id}`} className="text-sm text-muted-foreground">
                      활성화
                    </Label>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "세무사 정보 수정" : "새 세무사 등록"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="홍길동"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">이메일 *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="tax@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">연락처</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="010-1234-5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firm_name">사무소명</Label>
                  <Input
                    id="firm_name"
                    value={formData.firm_name}
                    onChange={(e) => setFormData({ ...formData, firm_name: e.target.value })}
                    placeholder="○○세무법인"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">지역</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="서울 강남구"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">소개</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="세무사 소개를 입력하세요..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="specialties">전문 분야 (쉼표 구분)</Label>
                <Input
                  id="specialties"
                  value={formData.specialties}
                  onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
                  placeholder="부가세, 종합소득세, 법인세"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry_types">담당 업종 (쉼표 구분)</Label>
                <Input
                  id="industry_types"
                  value={formData.industry_types}
                  onChange={(e) => setFormData({ ...formData, industry_types: e.target.value })}
                  placeholder="음식점, 카페, 소매업"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label className="text-sm">{formData.is_active ? "활성" : "비활성"}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSave}>{editing ? "수정" : "등록"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
