import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TaxAccountCode {
  id: string;
  name: string;
  category: string;
  sub_category: string | null;
  description: string | null;
  vat_deductible_default: boolean;
  is_asset: boolean;
  default_useful_life: number | null;
  tax_limit_type: string | null;
  tax_limit_description: string | null;
  keywords: string[];
  display_order: number;
}

export interface ClassifiedTransaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  merchant_name: string | null;
  category: string | null;
  tax_account_code: string | null;
  tax_account_name: string | null;
  vat_deductible: boolean | null;
  vat_amount: number | null;
  is_fixed_asset: boolean;
  depreciation_method: string | null;
  useful_life_years: number | null;
  tax_classification_status: string;
  ai_confidence_score: number | null;
  business_use_ratio: number | null;
  tax_notes: string | null;
  is_manually_classified: boolean;
}

/** 세무 계정과목 마스터 조회 */
export function useTaxAccountCodes() {
  return useQuery({
    queryKey: ["tax-account-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tax_account_codes")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data as TaxAccountCode[];
    },
    staleTime: 1000 * 60 * 60, // 1시간
  });
}

/** 분류 대상 거래 조회 */
export function useClassifiableTransactions(status?: string) {
  return useQuery({
    queryKey: ["tax-classifiable-transactions", status],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from("transactions")
        .select("id, description, amount, transaction_date, merchant_name, category, tax_account_code, tax_account_name, vat_deductible, vat_amount, is_fixed_asset, depreciation_method, useful_life_years, tax_classification_status, ai_confidence_score, business_use_ratio, tax_notes, is_manually_classified")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .order("transaction_date", { ascending: false });

      if (status && status !== "all") {
        query = query.eq("tax_classification_status", status);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data || []) as ClassifiedTransaction[];
    },
  });
}

/** 분류 현황 통계 (DB 서버사이드 집계 - 1000건 제한 없음) */
export function useClassificationStats() {
  return useQuery({
    queryKey: ["tax-classification-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase.rpc("get_tax_classification_stats" as any, {
        p_user_id: user.id,
      });

      if (error) throw error;
      const result = data as any;
      if (!result) return null;

      return {
        total: Number(result.total) || 0,
        unclassified: Number(result.unclassified) || 0,
        ai_suggested: Number(result.ai_suggested) || 0,
        confirmed: Number(result.confirmed) || 0,
        manual: Number(result.manual) || 0,
        totalExpense: Number(result.totalExpense) || 0,
        vatDeductibleAmount: Number(result.vatDeductibleAmount) || 0,
        vatAmount: Number(result.vatAmount) || 0,
      };
    },
  });
}

/** AI 일괄 분류 실행 */
export function useRunAIClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionIds?: string[]) => {
      const { data, error } = await supabase.functions.invoke("classify-transactions", {
        body: { transactionIds, mode: "batch" },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "분류 실패");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-classifiable-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["tax-classification-stats"] });
    },
  });
}

/** 단건 분류 확인/수정 */
export function useUpdateTaxClassification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      updates,
    }: {
      transactionId: string;
      updates: {
        tax_account_code: string;
        tax_account_name: string;
        vat_deductible: boolean;
        is_fixed_asset?: boolean;
        business_use_ratio?: number;
        tax_notes?: string;
        tax_classification_status: "confirmed" | "manual";
      };
    }) => {
      const { error } = await supabase
        .from("transactions")
        .update({
          ...updates,
          is_manually_classified: updates.tax_classification_status === "manual",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-classifiable-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["tax-classification-stats"] });
    },
  });
}

/** 일괄 확인 처리 */
export function useConfirmAllClassifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인 필요");

      const { error } = await supabase
        .from("transactions")
        .update({
          tax_classification_status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("tax_classification_status", "ai_suggested");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-classifiable-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["tax-classification-stats"] });
    },
  });
}
