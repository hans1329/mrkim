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

export type TransferType = "fixed" | "percentage";
export type ScheduleType = "manual" | "on_income" | "daily" | "weekly" | "monthly";

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
  // 하이픈 연동 필드
  transfer_type: TransferType;
  amount_percentage: number | null;
  source_account_id: string | null;
  target_account_number: string | null;
  target_bank_name: string | null;
  schedule_type: ScheduleType;
  schedule_day: number | null;
  hyphen_transfer_id: string | null;
  description: string | null;
}

export interface NewDeposit {
  type: DepositType;
  name: string;
  target_amount?: number;
  due_date?: string;
}

export interface NewAutoTransfer {
  name: string;
  transfer_type: TransferType;
  amount?: number;
  amount_percentage?: number;
  recipient: string;
  target_account_number?: string;
  target_bank_name?: string;
  schedule_type: ScheduleType;
  schedule_day?: number;
  condition?: string;
  description?: string;
}

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  manual: "수동 실행",
  on_income: "매출 발생 시",
  daily: "매일",
  weekly: "매주",
  monthly: "매월",
};

export const BANK_LIST = [
  "국민은행", "신한은행", "우리은행", "하나은행", "농협은행",
  "기업은행", "카카오뱅크", "토스뱅크", "케이뱅크", "새마을금고",
  "신협", "우체국", "수협", "부산은행", "대구은행", "광주은행",
  "전북은행", "제주은행", "경남은행",
];

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
    onError: (error: any) => {
      const msg = error?.message || "알 수 없는 오류";
      toast.error(`예치금 추가 실패: ${msg}`);
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

      // condition 필드는 schedule_type 기반으로 자동 생성
      const condition = newTransfer.condition || SCHEDULE_TYPE_LABELS[newTransfer.schedule_type];

      const { error } = await supabase.from("auto_transfers").insert({
        user_id: user.id,
        name: newTransfer.name,
        amount: newTransfer.transfer_type === "fixed" ? (newTransfer.amount || 0) : 0,
        recipient: newTransfer.recipient,
        condition,
        status: "pending",
        transfer_type: newTransfer.transfer_type,
        amount_percentage: newTransfer.transfer_type === "percentage" ? (newTransfer.amount_percentage || null) : null,
        target_account_number: newTransfer.target_account_number || null,
        target_bank_name: newTransfer.target_bank_name || null,
        schedule_type: newTransfer.schedule_type,
        schedule_day: newTransfer.schedule_day || null,
        description: newTransfer.description || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auto-transfers"] });
      toast.success("자동이체 규칙이 추가되었습니다");
    },
    onError: (error: any) => {
      const msg = error?.message || "알 수 없는 오류";
      toast.error(`자동이체 규칙 추가 실패: ${msg}`);
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
