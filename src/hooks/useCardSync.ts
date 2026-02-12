import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { classifyTransaction } from "@/lib/transactionClassifier";

interface CodefTransaction {
  transactionDate: string;
  transactionTime: string | null;
  amount: number;
  merchantName: string;
  merchantCategory: string;
  description: string;
  cardNo: string;
  cardName: string;
  status: string;
  approvalNo: string;
  installment: string;
}

interface SyncResult {
  synced: number;
  skipped: number;
  errors: number;
}

export function useCardSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectedId,
      cardCompanyId,
      cardCompanyName,
      startDate,
      endDate,
      isInitialSync = false,
    }: {
      connectedId: string;
      cardCompanyId: string;
      cardCompanyName: string;
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
            .eq("source_type", "card")
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
        "codef-card",
        {
          body: {
            action: "getTransactions",
            connectedId,
            cardCompanyId,
            startDate: effectiveStartDate,
            endDate: effectiveEndDate,
          },
        }
      );

      if (fetchError || !response?.success) {
        throw new Error(response?.error || fetchError?.message || "거래 내역 조회 실패");
      }

      const transactions: CodefTransaction[] = response.transactions || [];
      
      if (transactions.length === 0) {
        return { synced: 0, skipped: 0, errors: 0 };
      }

      // 2. 기존 거래와 중복 체크 (external_tx_id + 복합키 기반)
      const approvalNos = transactions
        .map((tx) => tx.approvalNo)
        .filter((no) => no && no.length > 0);

      // external_tx_id 기반 체크
      const { data: existingByTxId } = await supabase
        .from("transactions")
        .select("external_tx_id")
        .in("external_tx_id", approvalNos);

      const existingIds = new Set(existingByTxId?.map((t) => t.external_tx_id) || []);

      // 복합키 기반 체크 (재연동 시 approvalNo가 달라질 수 있음)
      const dateRange = transactions.map((tx) => tx.transactionDate);
      const uniqueDates = [...new Set(dateRange)];
      const { data: existingByComposite } = await supabase
        .from("transactions")
        .select("transaction_date, amount, description, source_type")
        .eq("source_type", "card")
        .in("transaction_date", uniqueDates);

      const compositeKeys = new Set(
        (existingByComposite || []).map(
          (t) => `${t.transaction_date}|${t.amount}|${t.description}|${t.source_type}`
        )
      );

      // 3. 새 거래만 필터링 (두 가지 중복 체크 모두 통과해야 함)
      const newTransactions = transactions.filter((tx) => {
        if (!tx.approvalNo) return false;
        if (existingIds.has(tx.approvalNo)) return false;
        const desc = tx.description || tx.merchantName || "카드 결제";
        const key = `${tx.transactionDate}|${tx.amount}|${desc}|card`;
        if (compositeKeys.has(key)) return false;
        return true;
      });

      if (newTransactions.length === 0) {
        return { synced: 0, skipped: transactions.length, errors: 0 };
      }

      // 4. 거래 데이터 변환 및 자동 분류
      const insertData = newTransactions.map((tx) => {
        const classification = classifyTransaction(tx.description || tx.merchantName);
        
        return {
          user_id: userData.user.id,
          transaction_date: tx.transactionDate,
          transaction_time: tx.transactionTime,
          description: tx.description || tx.merchantName || "카드 결제",
          amount: tx.amount,
          type: "expense" as const,
          source_type: "card" as const,
          source_name: cardCompanyName,
          source_account: tx.cardNo ? `****${tx.cardNo.slice(-4)}` : undefined,
          category: classification.category,
          sub_category: classification.subCategory,
          category_icon: classification.icon,
          classification_confidence: classification.confidence,
          external_tx_id: tx.approvalNo,
          synced_at: new Date().toISOString(),
          merchant_name: tx.merchantName,
          merchant_category: tx.merchantCategory,
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

// 카드 연동 정보 조회
export function useConnectedCards() {
  return useMutation({
    mutationFn: async ({
      connectedId,
      cardCompanyId,
    }: {
      connectedId: string;
      cardCompanyId: string;
    }) => {
      const { data: response, error } = await supabase.functions.invoke(
        "codef-card",
        {
          body: {
            action: "getCards",
            connectedId,
            cardCompanyId,
          },
        }
      );

      if (error || !response?.success) {
        throw new Error(response?.error || error?.message || "카드 목록 조회 실패");
      }

      return response.cards || [];
    },
  });
}
