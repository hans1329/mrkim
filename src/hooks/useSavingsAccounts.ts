import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SavingsAccountType = "parking" | "savings" | "deposit";

export interface SavingsAccount {
  id: string;
  user_id: string;
  name: string;
  type: SavingsAccountType;
  bank_name: string | null;
  amount: number;
  interest_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewSavingsAccount {
  name: string;
  type: SavingsAccountType;
  bank_name?: string;
  amount?: number;
  interest_rate?: number;
}

export function useSavingsAccounts() {
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["savings-accounts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("savings_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as SavingsAccount[];
    },
    // 기본 캐싱 설정 사용
  });

  const addAccount = useMutation({
    mutationFn: async (newAccount: NewSavingsAccount) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { error } = await supabase.from("savings_accounts").insert({
        user_id: user.id,
        name: newAccount.name,
        type: newAccount.type,
        bank_name: newAccount.bank_name || null,
        amount: newAccount.amount || 0,
        interest_rate: newAccount.interest_rate || 0,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-accounts"] });
      toast.success("저축 계좌가 추가되었습니다");
    },
    onError: () => {
      toast.error("저축 계좌 추가에 실패했습니다");
    },
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase
        .from("savings_accounts")
        .update({ amount })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-accounts"] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("savings_accounts")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savings-accounts"] });
      toast.success("저축 계좌가 삭제되었습니다");
    },
  });

  // 월 이자 계산 (연 이자율 기준)
  const calculateMonthlyInterest = (amount: number, annualRate: number) => {
    return Math.round((amount * (annualRate / 100)) / 12);
  };

  const totalAmount = accounts.reduce((sum, a) => sum + a.amount, 0);
  const totalMonthlyInterest = accounts.reduce(
    (sum, a) => sum + calculateMonthlyInterest(a.amount, a.interest_rate),
    0
  );

  return {
    accounts,
    isLoading,
    totalAmount,
    totalMonthlyInterest,
    calculateMonthlyInterest,
    addAccount,
    updateAccount,
    deleteAccount,
  };
}
