import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConnection } from "@/contexts/ConnectionContext";

/**
 * 대시보드 접속 시 실데이터를 기반으로 notifications 테이블에 알림을 자동 생성합니다.
 * 중복 방지를 위해 동일 타입의 알림은 하루에 한 번만 생성됩니다.
 */
export function useNotificationGenerator() {
  const { isLoggedIn, userId, isAnyConnected } = useConnection();
  const hasRun = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || !userId || hasRun.current) return;
    hasRun.current = true;

    generateNotifications(userId, isAnyConnected);
  }, [isLoggedIn, userId, isAnyConnected]);
}

async function generateNotifications(userId: string, isAnyConnected: boolean) {
  try {
    // 오늘 이미 생성된 알림 타입 조회 (중복 방지)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: existingToday } = await supabase
      .from("notifications")
      .select("title")
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString());

    const existingTitles = new Set((existingToday || []).map((n) => n.title));

    const newNotifications: Array<{
      user_id: string;
      type: string;
      title: string;
      message: string;
    }> = [];

    const addIfNew = (type: string, title: string, message: string) => {
      if (!existingTitles.has(title)) {
        newNotifications.push({ user_id: userId, type, title, message });
      }
    };

    // 1. 세금 마감일 알림 (D-14 이내)
    const now = new Date();
    const taxDeadlines = [
      { month: 1, day: 25, label: "부가세 신고" },
      { month: 5, day: 31, label: "종합소득세 신고" },
      { month: 7, day: 25, label: "부가세 신고" },
    ];

    for (const d of taxDeadlines) {
      for (const year of [now.getFullYear(), now.getFullYear() + 1]) {
        const deadline = new Date(year, d.month - 1, d.day);
        const diff = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diff > 0 && diff <= 14) {
          addIfNew(
            "warning",
            `${d.label} 마감 D-${diff}`,
            `${d.month}월 ${d.day}일까지 ${d.label}을 완료해주세요.`
          );
        }
      }
    }

    if (isAnyConnected) {
      // 2. 미분류 거래 알림
      const { count: unclassifiedCount } = await supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("category", null);

      if (unclassifiedCount && unclassifiedCount >= 5) {
        addIfNew(
          "info",
          `미분류 거래 ${unclassifiedCount}건 확인 필요`,
          "거래 내역에서 카테고리를 지정하면 더 정확한 분석이 가능합니다."
        );
      }

      // 3. 이번 달 vs 지난 달 지출 비교
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        .toISOString()
        .split("T")[0];
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        .toISOString()
        .split("T")[0];

      const [thisMonthRes, lastMonthRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("type", "expense")
          .gte("transaction_date", thisMonthStart),
        supabase
          .from("transactions")
          .select("amount")
          .eq("user_id", userId)
          .eq("type", "expense")
          .gte("transaction_date", lastMonthStart)
          .lte("transaction_date", lastMonthEnd),
      ]);

      const thisTotal = (thisMonthRes.data || []).reduce(
        (s, t) => s + (t.amount || 0),
        0
      );
      const lastTotal = (lastMonthRes.data || []).reduce(
        (s, t) => s + (t.amount || 0),
        0
      );

      if (lastTotal > 0) {
        const changePercent = Math.round(
          ((thisTotal - lastTotal) / lastTotal) * 100
        );
        if (changePercent > 20) {
          addIfNew(
            "warning",
            `이번 달 지출 ${changePercent}% 증가`,
            `전월 대비 지출이 ${changePercent}% 증가했습니다. 지출 내역을 확인해보세요.`
          );
        } else if (changePercent < -10) {
          addIfNew(
            "success",
            `이번 달 지출 ${Math.abs(changePercent)}% 감소`,
            `전월 대비 지출이 줄었어요! 잘 관리하고 계시네요.`
          );
        }
      }

      // 4. 새 세금계산서 알림 (최근 24시간 내 동기화된)
      const yesterday = new Date(
        now.getTime() - 24 * 60 * 60 * 1000
      ).toISOString();
      const { count: newInvoiceCount } = await supabase
        .from("tax_invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("synced_at", yesterday);

      if (newInvoiceCount && newInvoiceCount > 0) {
        addIfNew(
          "info",
          `새 세금계산서 ${newInvoiceCount}건 수집`,
          "홈택스에서 새로운 세금계산서가 수집되었습니다."
        );
      }
    }

    // 일괄 삽입
    if (newNotifications.length > 0) {
      const { error } = await supabase
        .from("notifications")
        .insert(newNotifications);
      if (error) {
        console.error("Failed to insert notifications:", error);
      }
    }
  } catch (error) {
    console.error("Notification generation error:", error);
  }
}
