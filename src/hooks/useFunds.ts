import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DepositType = 
  | "vat"           // 부가세
  | "salary"        // 급여
  | "emergency"     // 비상금
  | "corporate_tax" // 법인세/소득세
  | "insurance"     // 4대보험
  | "rent"          // 임대료/월세
  | "loan"          // 대출 상환
  | "utility"       // 공과금
  | "inventory"     // 재고/원자재
  | "marketing"     // 마케팅/광고
  | "maintenance";  // 시설 유지보수

export interface Deposit {
  id: string;
  user_id: string;
  type: DepositType;
  name: string;
  amount: number;
  target_amount: number | null;
  due_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoTransfer {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  recipient: string;
  condition: string;
  status: "pending" | "scheduled" | "completed";
  is_active: boolean;
  next_execution_at: string | null;
  last_executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewDeposit {
  type: DepositType;
  name: string;
  target_amount?: number;
  due_date?: string;
}

export interface NewAutoTransfer {
  name: string;
  amount: number;
  recipient: string;
  condition: string;
}

export function useDeposits() {
  const queryClient = useQueryClient();

  const { data: deposits = [], isLoading } = useQuery({
    queryKey: ["deposits"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("deposits")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Deposit[];
    },
  });

  const addDeposit = useMutation({
    mutationFn: async (newDeposit: NewDeposit) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { error } = await supabase.from("deposits").insert({
        user_id: user.id,
        type: newDeposit.type,
        name: newDeposit.name,
        amount: 0,
        target_amount: newDeposit.target_amount || null,
        due_date: newDeposit.due_date || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("예치금이 추가되었습니다");
    },
    onError: () => {
      toast.error("예치금 추가에 실패했습니다");
    },
  });

  const updateDeposit = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const { error } = await supabase
        .from("deposits")
        .update({ amount })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
    },
  });

  const deleteDeposit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("deposits")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deposits"] });
      toast.success("예치금이 삭제되었습니다");
    },
  });

  const totalDeposits = deposits.reduce((sum, d) => sum + d.amount, 0);

  return {
    deposits,
    isLoading,
    totalDeposits,
    addDeposit,
    updateDeposit,
    deleteDeposit,
  };
}

export function useAutoTransfers() {
  const queryClient = useQueryClient();

  const { data: autoTransfers = [], isLoading } = useQuery({
    queryKey: ["auto-transfers"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("auto_transfers")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AutoTransfer[];
    },
  });

  const addTransfer = useMutation({
    mutationFn: async (newTransfer: NewAutoTransfer) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const { error } = await supabase.from("auto_transfers").insert({
        user_id: user.id,
        name: newTransfer.name,
        amount: newTransfer.amount,
        recipient: newTransfer.recipient,
        condition: newTransfer.condition || "수동 실행",
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-transfers"] });
      toast.success("자동이체 규칙이 추가되었습니다");
    },
    onError: () => {
      toast.error("자동이체 규칙 추가에 실패했습니다");
    },
  });

  const deleteTransfer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("auto_transfers")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-transfers"] });
      toast.success("자동이체 규칙이 삭제되었습니다");
    },
  });

  return {
    autoTransfers,
    isLoading,
    addTransfer,
    deleteTransfer,
  };
}
