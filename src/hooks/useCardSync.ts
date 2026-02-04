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
    }: {
      connectedId: string;
      cardCompanyId: string;
      cardCompanyName: string;
      startDate?: string;
      endDate?: string;
    }): Promise<SyncResult> => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("로그인이 필요합니다");

      // 1. 코드에프에서 거래 내역 조회
      const { data: response, error: fetchError } = await supabase.functions.invoke(
        "codef-card",
        {
          body: {
            action: "getTransactions",
            connectedId,
            cardCompanyId,
            startDate,
            endDate,
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

      // 2. 기존 거래와 중복 체크 (approval_no 기준)
      const approvalNos = transactions
        .map((tx) => tx.approvalNo)
        .filter((no) => no && no.length > 0);

      const { data: existingTxs } = await supabase
        .from("transactions")
        .select("external_tx_id")
        .in("external_tx_id", approvalNos);

      const existingIds = new Set(existingTxs?.map((t) => t.external_tx_id) || []);

      // 3. 새 거래만 필터링
      const newTransactions = transactions.filter(
        (tx) => tx.approvalNo && !existingIds.has(tx.approvalNo)
      );

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
