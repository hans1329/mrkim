import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { classifyTransaction, classifyIncomeTransaction } from "@/lib/transactionClassifier";

export interface Transaction {
  id: string;
  user_id: string;
  transaction_date: string;
  transaction_time: string | null;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer_in";
  source_type: "card" | "bank";
  source_name: string | null;
  source_account: string | null;
  category: string | null;
  sub_category: string | null;
  category_icon: string | null;
  classification_confidence: "high" | "medium" | "low" | null;
  is_manually_classified: boolean;
  external_tx_id: string | null;
  synced_at: string | null;
  merchant_name: string | null;
  merchant_category: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionInsert {
  transaction_date: string;
  transaction_time?: string;
  description: string;
  amount: number;
  type: "income" | "expense" | "transfer_in";
  source_type: "card" | "bank";
  source_name?: string;
  source_account?: string;
  category?: string;
  sub_category?: string;
  category_icon?: string;
  classification_confidence?: "high" | "medium" | "low";
  is_manually_classified?: boolean;
  external_tx_id?: string;
  merchant_name?: string;
  memo?: string;
}

export interface TransactionUpdate {
  category?: string;
  sub_category?: string;
  category_icon?: string;
  classification_confidence?: "high" | "medium" | "low";
  is_manually_classified?: boolean;
  memo?: string;
}

export interface TransactionFilters {
  type?: "income" | "expense" | "transfer_in";
  category?: string;
  startDate?: string;
  endDate?: string;
  sourceType?: "card" | "bank";
  searchTerm?: string;
}

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: async () => {
      // Supabase 기본 1000건 제한 → 페이지네이션으로 전체 조회
      const PAGE_SIZE = 1000;
      let allData: Transaction[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("transactions")
          .select("*")
          .order("transaction_date", { ascending: false })
          .order("transaction_time", { ascending: false, nullsFirst: true })
          .range(from, from + PAGE_SIZE - 1);

        if (filters?.type) {
          query = query.eq("type", filters.type);
        }
        if (filters?.category) {
          query = query.eq("category", filters.category);
        }
        if (filters?.sourceType) {
          query = query.eq("source_type", filters.sourceType);
        }
        if (filters?.startDate) {
          query = query.gte("transaction_date", filters.startDate);
        }
        if (filters?.endDate) {
          query = query.lte("transaction_date", filters.endDate);
        }
        if (filters?.searchTerm) {
          query = query.or(
            `description.ilike.%${filters.searchTerm}%,merchant_name.ilike.%${filters.searchTerm}%`
          );
        }

        const { data, error } = await query;
        if (error) throw error;

        allData = allData.concat(data as Transaction[]);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }

      return allData;
    },
  });
}

export function useTransactionStats(filters?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ["transaction-stats", filters],
    queryFn: async () => {
      // 페이지네이션으로 전체 통계 데이터 조회
      const PAGE_SIZE = 1000;
      let allData: Pick<Transaction, "type" | "amount" | "category" | "category_icon" | "transaction_date">[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from("transactions")
          .select("type, amount, category, category_icon, transaction_date")
          .range(from, from + PAGE_SIZE - 1);

        if (filters?.startDate) {
          query = query.gte("transaction_date", filters.startDate);
        }
        if (filters?.endDate) {
          query = query.lte("transaction_date", filters.endDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        allData = allData.concat(data as any[]);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }

      const transactions = allData;

      // 데이터 기간 계산
      const dates = transactions.map((t) => t.transaction_date).filter(Boolean).sort();
      const dateFrom = dates[0] || null;
      const dateTo = dates[dates.length - 1] || null;

      const totalIncome = transactions
        .filter((t) => t.type === "income" || t.type === "transfer_in")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalExpense = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      // 카테고리별 통계
      const categoryStats = new Map<string, { amount: number; count: number; icon: string }>();
      transactions
        .filter((t) => t.type === "expense" && t.category)
        .forEach((t) => {
          const existing = categoryStats.get(t.category!) || { amount: 0, count: 0, icon: t.category_icon || "📋" };
          categoryStats.set(t.category!, {
            amount: existing.amount + t.amount,
            count: existing.count + 1,
            icon: t.category_icon || existing.icon,
          });
        });

      return {
        totalIncome,
        totalExpense,
        netProfit: totalIncome - totalExpense,
        dateFrom,
        dateTo,
        categoryStats: Array.from(categoryStats.entries())
          .map(([category, data]) => ({ category, ...data }))
          .sort((a, b) => b.amount - a.amount),
      };
    },
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransactionInsert) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("로그인이 필요합니다");

      // 자동 분류 적용 (수동 분류가 아닌 경우)
      let finalInput = { ...input };
      if (!input.is_manually_classified && !input.category) {
        if (input.type === "expense") {
          const classification = classifyTransaction(input.description);
          finalInput = {
            ...finalInput,
            category: classification.category,
            sub_category: classification.subCategory,
            category_icon: classification.icon,
            classification_confidence: classification.confidence,
          };
        } else {
          const incomeResult = classifyIncomeTransaction(input.description);
          finalInput = {
            ...finalInput,
            category: incomeResult.incomeCategory,
            category_icon: incomeResult.icon,
            classification_confidence: incomeResult.confidence,
          };
        }
      }

      const { data, error } = await supabase
        .from("transactions")
        .insert({
          ...finalInput,
          user_id: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-weekly-chart"] });
    },
  });
}

export interface BulkUploadProgress {
  phase: "dedup" | "uploading" | "refreshing";
  current: number;
  total: number;
  percent: number;
}

export function useBulkAddTransactions(onProgress?: (p: BulkUploadProgress) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inputs: TransactionInsert[]) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("로그인이 필요합니다");
      const userId = userData.user.id;

      // 중복 체크 phase
      onProgress?.({ phase: "dedup", current: 0, total: inputs.length, percent: 0 });

      const dates = [...new Set(inputs.map((i) => i.transaction_date))];
      const existingKeys = new Set<string>();

      if (dates.length > 0) {
        const minDate = dates.sort()[0];
        const maxDate = dates.sort()[dates.length - 1];
        
        const PAGE_SIZE = 1000;
        let from = 0;
        let hasMore = true;

        while (hasMore) {
          const { data: existing } = await supabase
            .from("transactions")
            .select("transaction_date, amount, description")
            .eq("user_id", userId)
            .gte("transaction_date", minDate)
            .lte("transaction_date", maxDate)
            .range(from, from + PAGE_SIZE - 1);

          (existing || []).forEach((tx) => {
            existingKeys.add(`${tx.transaction_date}|${tx.amount}|${tx.description}`);
          });

          hasMore = (existing?.length || 0) === PAGE_SIZE;
          from += PAGE_SIZE;
        }
      }

      const rows = inputs
        .filter((input) => {
          const key = `${input.transaction_date}|${input.amount}|${input.description}`;
          return !existingKeys.has(key);
        })
        .map((input) => {
          let finalInput = { ...input };
          if (!input.is_manually_classified && !input.category) {
            if (input.type === "expense") {
              const classification = classifyTransaction(input.description);
              finalInput = {
                ...finalInput,
                category: classification.category,
                sub_category: classification.subCategory,
                category_icon: classification.icon,
                classification_confidence: classification.confidence,
              };
            } else {
              const incomeResult = classifyIncomeTransaction(input.description);
              finalInput = {
                ...finalInput,
                category: incomeResult.incomeCategory,
                category_icon: incomeResult.icon,
                classification_confidence: incomeResult.confidence,
              };
            }
          }
          return { ...finalInput, user_id: userId, source_type: input.source_type || "card" };
        });

      const skipped = inputs.length - rows.length;

      if (rows.length === 0) {
        return { inserted: 0, skipped };
      }

      // 업로드 phase
      const BATCH_SIZE = 500;
      let totalInserted = 0;

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase
          .from("transactions")
          .insert(batch)
          .select("id");

        if (error) throw new Error(`배치 ${Math.floor(i / BATCH_SIZE) + 1} 실패: ${error.message}`);
        totalInserted += data?.length || 0;

        onProgress?.({
          phase: "uploading",
          current: totalInserted,
          total: rows.length,
          percent: Math.round((totalInserted / rows.length) * 100),
        });

        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // 리프레시 phase
      onProgress?.({ phase: "refreshing", current: 0, total: 0, percent: 100 });

      return { inserted: totalInserted, skipped };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-recent-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary-stats"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-weekly-chart"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TransactionUpdate }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
    },
  });
}

export function useClassifyTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionIds?: string[]) => {
      // 미분류 또는 기타비용으로 분류된 거래 조회 (수동 분류 제외)
      // 지출 거래만 분류 대상 (매출/입금은 비용 분류 대상이 아님)
      let query = supabase
        .from("transactions")
        .select("id, description, type")
        .eq("type", "expense")
        .or("category.is.null,category.eq.기타비용")
        .neq("is_manually_classified", true);

      if (transactionIds?.length) {
        query = query.in("id", transactionIds);
      }

      const { data: unclassified, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      if (!unclassified?.length) return { classified: 0 };

      // 일괄 분류 및 업데이트
      const updates = unclassified.map((tx) => {
        const result = classifyTransaction(tx.description);
        return {
          id: tx.id,
          category: result.category,
          sub_category: result.subCategory,
          category_icon: result.icon,
          classification_confidence: result.confidence,
        };
      });

      // 개별 업데이트 (Supabase는 bulk update를 직접 지원하지 않음)
      for (const update of updates) {
        const { id, ...data } = update;
        await supabase.from("transactions").update(data).eq("id", id);
      }

      return { classified: updates.length };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
    },
  });
}
