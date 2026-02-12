import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { classifyTransaction, classifyIncomeTransaction } from "@/lib/transactionClassifier";

interface BankTransaction {
  transactionDate: string;
  transactionTime: string | null;
  amount: number;
  type: "income" | "expense";
  description: string;
  balance: string;
  transactionId: string;
  memo: string;
}

interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

export function useBankSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectedId,
      bankId,
      bankName,
      accountNo,
      startDate,
      endDate,
      isInitialSync = false,
    }: {
      connectedId: string;
      bankId: string;
      bankName: string;
      accountNo: string;
      startDate?: string;
      endDate?: string;
      isInitialSync?: boolean;
    }): Promise<SyncResult> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("로그인이 필요합니다");

      const today = new Date();
      let effectiveStartDate = startDate;
      let effectiveEndDate = endDate || today.toISOString().split("T")[0].replace(/-/g, "");

      // startDate가 없으면 마지막 동기화 시점 조회
      if (!effectiveStartDate) {
        if (isInitialSync) {
          // 최초 연동: 3개월치 데이터
          const threeMonthsAgo = new Date(today);
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          effectiveStartDate = threeMonthsAgo.toISOString().split("T")[0].replace(/-/g, "");
        } else {
          // 갱신: 마지막 동기화 시점 이후
          const { data: lastSync } = await supabase
            .from("transactions")
            .select("synced_at")
            .eq("user_id", userData.user.id)
            .eq("source_type", "bank")
            .order("synced_at", { ascending: false })
            .limit(1)
            .single();

          if (lastSync?.synced_at) {
            const lastSyncDate = new Date(lastSync.synced_at);
            effectiveStartDate = lastSyncDate.toISOString().split("T")[0].replace(/-/g, "");
          } else {
            // 동기화 기록이 없으면 15일 전부터
            const fifteenDaysAgo = new Date(today);
            fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
            effectiveStartDate = fifteenDaysAgo.toISOString().split("T")[0].replace(/-/g, "");
          }
        }
      }

      // 1. 코드에프에서 거래 내역 조회
      const { data: response, error: fetchError } = await supabase.functions.invoke(
        "codef-bank",
        {
          body: {
            action: "getTransactions",
            connectedId,
            bankId,
            accountNo,
            startDate: effectiveStartDate,
            endDate: effectiveEndDate,
          },
        }
      );

      if (fetchError || !response?.success) {
        throw new Error(response?.error || fetchError?.message || "거래 내역 조회 실패");
      }

      const transactions: BankTransaction[] = response.transactions || [];
      
      if (transactions.length === 0) {
        return { synced: 0, skipped: 0, errors: 0 };
      }

      // 2. 기존 거래와 중복 체크 (transactionId 기준)
      const txIds = transactions
        .map((tx) => tx.transactionId)
        .filter((id) => id && id.length > 0);

      const { data: existingTxs } = await supabase
        .from("transactions")
        .select("external_tx_id")
        .in("external_tx_id", txIds);

      const existingIds = new Set(existingTxs?.map((t) => t.external_tx_id) || []);

      // 3. 새 거래만 필터링
      const newTransactions = transactions.filter(
        (tx) => tx.transactionId && !existingIds.has(tx.transactionId)
      );

      if (newTransactions.length === 0) {
        return { synced: 0, skipped: transactions.length, errors: 0 };
      }

      // 4. 거래 데이터 변환 및 자동 분류
      const insertData = newTransactions.map((tx: any) => {
        // 설명 우선순위: description > counterpartName > "은행 거래"
        const desc = tx.description || tx.counterpartName || "은행 거래";
        const maskedAccount = accountNo ? `****${accountNo.slice(-4)}` : undefined;

        // 입금(income)인 경우: 매출 vs 비매출 분류
        if (tx.type === "income") {
          const incomeResult = classifyIncomeTransaction(desc);
          return {
            user_id: userData.user.id,
            transaction_date: formatDate(tx.transactionDate),
            transaction_time: tx.transactionTime,
            description: desc,
            amount: tx.amount,
            type: incomeResult.isSales ? "income" : "transfer_in",
            source_type: "bank" as const,
            source_name: bankName,
            source_account: maskedAccount,
            category: incomeResult.incomeCategory,
            category_icon: incomeResult.icon,
            classification_confidence: incomeResult.confidence,
            external_tx_id: tx.transactionId,
            synced_at: new Date().toISOString(),
            memo: tx.memo || null,
            merchant_name: tx.counterpartName || null,
          };
        }

        // 지출(expense)인 경우: 기존 비용 카테고리 분류
        const classification = classifyTransaction(desc);
        return {
          user_id: userData.user.id,
          transaction_date: formatDate(tx.transactionDate),
          transaction_time: tx.transactionTime,
          description: desc,
          amount: tx.amount,
          type: tx.type,
          source_type: "bank" as const,
          source_name: bankName,
          source_account: maskedAccount,
          category: classification.category,
          sub_category: classification.subCategory,
          category_icon: classification.icon,
          classification_confidence: classification.confidence,
          external_tx_id: tx.transactionId,
          synced_at: new Date().toISOString(),
          memo: tx.memo || null,
          merchant_name: tx.counterpartName || null,
        };
      });

      // 5. DB에 저장
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(insertData);

      if (insertError) {
        console.error("Transaction insert error:", insertError);
        throw new Error("거래 저장 중 오류가 발생했습니다");
      }

      return {
        synced: newTransactions.length,
        skipped: transactions.length - newTransactions.length,
        errors: 0,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
    },
  });
}

// YYYYMMDD -> YYYY-MM-DD 변환
function formatDate(dateStr: string): string {
  if (dateStr.includes("-")) return dateStr;
  if (dateStr.length === 8) {
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}
