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
  counterpartName?: string;
}

interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
  updated?: number;
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
      clientType = "P",
    }: {
      connectedId: string;
      bankId: string;
      bankName: string;
      accountNo: string;
      startDate?: string;
      endDate?: string;
      isInitialSync?: boolean;
      clientType?: "P" | "B";
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
            clientType,
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

      // 2. 기존 거래와 중복 체크 (external_tx_id + 복합키 기반)
      const txIds = transactions
        .map((tx) => tx.transactionId)
        .filter((id) => id && id.length > 0);

      // external_tx_id 기반 체크
      const { data: existingByTxId } = await supabase
        .from("transactions")
        .select("id, external_tx_id, type, category, is_manually_classified")
        .in("external_tx_id", txIds);

      const existingTxIdMap = new Map(
        (existingByTxId || []).map((t) => [t.external_tx_id, t])
      );

      // 복합키 기반 체크 (재연동 시 transactionId가 달라질 수 있음)
      const dateRange = transactions.map((tx) => formatDate(tx.transactionDate));
      const uniqueDates = [...new Set(dateRange)];
      const { data: existingByComposite } = await supabase
        .from("transactions")
        .select("id, transaction_date, amount, description, source_type, type, category, is_manually_classified")
        .eq("source_type", "bank")
        .in("transaction_date", uniqueDates);

      const compositeMap = new Map(
        (existingByComposite || []).map(
          (t) => [`${t.transaction_date}|${t.amount}|${t.description}|${t.source_type}`, t]
        )
      );

      // 3. 분류: 새 거래 vs 기존 거래(분류 업데이트 대상)
      const newTransactions: BankTransaction[] = [];
      const updateTargets: { id: string; type: string; category: string; category_icon: string; classification_confidence: string }[] = [];

      for (const tx of transactions) {
        if (!tx.transactionId) continue;
        const desc = tx.description || tx.counterpartName || "은행 거래";
        const key = `${formatDate(tx.transactionDate)}|${tx.amount}|${desc}|bank`;

        // 기존 거래 찾기 (external_tx_id 또는 복합키)
        const existingByExternalId = existingTxIdMap.get(tx.transactionId);
        const existingByKey = compositeMap.get(key);
        const existing = existingByExternalId || existingByKey;

        if (existing) {
          // 수동 분류된 건은 건드리지 않음
          if (existing.is_manually_classified) continue;

          // 입금 거래의 분류가 달라졌으면 업데이트
          if (tx.type === "income") {
            const incomeResult = classifyIncomeTransaction(desc);
            const newType = incomeResult.isSales ? "income" : "transfer_in";
            if (existing.type !== newType || existing.category !== incomeResult.incomeCategory) {
              updateTargets.push({
                id: existing.id,
                type: newType,
                category: incomeResult.incomeCategory,
                category_icon: incomeResult.icon,
                classification_confidence: incomeResult.confidence,
              });
            }
          }
        } else {
          newTransactions.push(tx);
        }
      }

      // 4. 기존 거래 분류 업데이트
      let updated = 0;
      for (const target of updateTargets) {
        const { error } = await supabase
          .from("transactions")
          .update({
            type: target.type,
            category: target.category,
            category_icon: target.category_icon,
            classification_confidence: target.classification_confidence,
            synced_at: new Date().toISOString(),
          })
          .eq("id", target.id);
        if (!error) updated++;
      }

      if (newTransactions.length === 0) {
        return { synced: 0, skipped: transactions.length - updateTargets.length, errors: 0, updated };
      }

      // 5. 새 거래 데이터 변환 및 자동 분류
      const insertData = newTransactions.map((tx: any) => {
        const desc = tx.description || tx.counterpartName || "은행 거래";
        const maskedAccount = accountNo ? `****${accountNo.slice(-4)}` : undefined;

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

      // 6. DB에 저장
      const { error: insertError } = await supabase
        .from("transactions")
        .insert(insertData);

      if (insertError) {
        console.error("Transaction insert error:", insertError);
        throw new Error("거래 저장 중 오류가 발생했습니다");
      }

      return {
        synced: newTransactions.length,
        skipped: transactions.length - newTransactions.length - updateTargets.length,
        errors: 0,
        updated,
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
