import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Landmark, 
  Plus, 
  Wallet, 
  PiggyBank, 
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2
} from "lucide-react";

interface ConnectedAccount {
  id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_holder: string | null;
  account_alias: string | null;
  account_type: string;
  hyphen_connected: boolean;
  codef_connected: boolean;
  is_active: boolean;
}

const BANK_LIST = [
  { code: "004", name: "KB국민은행" },
  { code: "088", name: "신한은행" },
  { code: "020", name: "우리은행" },
  { code: "081", name: "하나은행" },
  { code: "011", name: "NH농협은행" },
  { code: "003", name: "IBK기업은행" },
  { code: "023", name: "SC제일은행" },
  { code: "027", name: "한국씨티은행" },
  { code: "089", name: "케이뱅크" },
  { code: "090", name: "카카오뱅크" },
  { code: "092", name: "토스뱅크" },
];

const ACCOUNT_TYPES = [
  { value: "primary", label: "주거래 계좌", icon: Wallet, description: "매출 입금 및 출금" },
  { value: "parking", label: "파킹통장", icon: PiggyBank, description: "부가세 자동 적립" },
  { value: "salary", label: "급여 계좌", icon: CreditCard, description: "급여 지급용" },
];

export function ConnectedAccountsCard() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 새 계좌 폼 상태
  const [newAccount, setNewAccount] = useState({
    bank_code: "",
    account_number: "",
    account_holder: "",
    account_alias: "",
    account_type: "primary",
  });

  // 계좌 목록 조회
  const fetchAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      toast.error("계좌 정보를 불러오는데 실패했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // 계좌 추가
  const handleAddAccount = async () => {
    if (!newAccount.bank_code || !newAccount.account_number) {
      toast.error("은행과 계좌번호를 입력해주세요");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const bank = BANK_LIST.find(b => b.code === newAccount.bank_code);

      const { error } = await supabase
        .from("connected_accounts")
        .insert({
          user_id: user.id,
          bank_code: newAccount.bank_code,
          bank_name: bank?.name || "",
          account_number: newAccount.account_number,
          account_holder: newAccount.account_holder || null,
          account_alias: newAccount.account_alias || null,
          account_type: newAccount.account_type,
        });

      if (error) throw error;

      toast.success("계좌가 등록되었습니다");
      setIsDialogOpen(false);
      setNewAccount({
        bank_code: "",
        account_number: "",
        account_holder: "",
        account_alias: "",
        account_type: "primary",
      });
      fetchAccounts();
    } catch (error) {
      console.error("Failed to add account:", error);
      toast.error("계좌 등록에 실패했습니다");
    } finally {
      setIsSaving(false);
    }
  };

  // 계좌 삭제 (soft delete)
  const handleDeleteAccount = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("connected_accounts")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("계좌가 삭제되었습니다");
      fetchAccounts();
    } catch (error) {
      console.error("Failed to delete account:", error);
      toast.error("계좌 삭제에 실패했습니다");
    } finally {
      setDeletingId(null);
    }
  };

  const getAccountTypeInfo = (type: string) => {
    return ACCOUNT_TYPES.find(t => t.value === type) || ACCOUNT_TYPES[0];
  };

  const formatAccountNumber = (num: string) => {
    // 마스킹 처리 (앞 4자리, 뒤 4자리만 표시)
    if (num.length <= 8) return num;
    return `${num.slice(0, 4)}****${num.slice(-4)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">연결된 계좌</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">연결된 계좌</CardTitle>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                추가
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>계좌 등록</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>계좌 용도</Label>
                  <Select
                    value={newAccount.account_type}
                    onValueChange={(value) => setNewAccount({ ...newAccount, account_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {ACCOUNT_TYPES.find(t => t.value === newAccount.account_type)?.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>은행 선택</Label>
                  <Select
                    value={newAccount.bank_code}
                    onValueChange={(value) => setNewAccount({ ...newAccount, bank_code: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="은행을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {BANK_LIST.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>계좌번호</Label>
                  <Input
                    placeholder="'-' 없이 입력"
                    value={newAccount.account_number}
                    onChange={(e) => setNewAccount({ 
                      ...newAccount, 
                      account_number: e.target.value.replace(/\D/g, "") 
                    })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>예금주 (선택)</Label>
                  <Input
                    placeholder="예금주명"
                    value={newAccount.account_holder}
                    onChange={(e) => setNewAccount({ ...newAccount, account_holder: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>별칭 (선택)</Label>
                  <Input
                    placeholder="예: 사업용 계좌"
                    value={newAccount.account_alias}
                    onChange={(e) => setNewAccount({ ...newAccount, account_alias: e.target.value })}
                  />
                </div>

                <Button onClick={handleAddAccount} className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  등록하기
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription className="text-xs">
          주거래 계좌와 부가세 파킹통장을 관리합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Landmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">등록된 계좌가 없습니다</p>
            <p className="text-xs mt-1">계좌를 등록하여 자동 자금 관리를 시작하세요</p>
          </div>
        ) : (
          accounts.map((account) => {
            const typeInfo = getAccountTypeInfo(account.account_type);
            const TypeIcon = typeInfo.icon;

            return (
              <div 
                key={account.id} 
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <TypeIcon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {account.account_alias || account.bank_name}
                    </p>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {typeInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {account.bank_name} {formatAccountNumber(account.account_number)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {account.hyphen_connected ? (
                      <Badge variant="outline" className="text-xs gap-1 text-green-600 border-green-200">
                        <CheckCircle2 className="h-3 w-3" />
                        출금동의
                      </Badge>
                    ) : account.account_type === "primary" ? (
                      <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-200">
                        <AlertCircle className="h-3 w-3" />
                        출금동의 필요
                      </Badge>
                    ) : null}
                    {account.codef_connected && (
                      <Badge variant="outline" className="text-xs gap-1 text-blue-600 border-blue-200">
                        <CheckCircle2 className="h-3 w-3" />
                        조회연동
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteAccount(account.id)}
                  disabled={deletingId === account.id}
                >
                  {deletingId === account.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            );
          })
        )}

        {/* 파킹통장 추천 안내 */}
        {accounts.length > 0 && !accounts.some(a => a.account_type === "parking") && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <PiggyBank className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">파킹통장을 등록하세요</p>
                <p className="text-xs text-muted-foreground mt-1">
                  케이뱅크, 토스뱅크 등 고금리 파킹통장을 등록하면
                  부가세를 자동으로 적립하고 이자 수익도 받을 수 있어요!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
