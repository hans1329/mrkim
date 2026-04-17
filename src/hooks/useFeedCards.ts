import { useMemo } from "react";
import { useDashboardStats, useActionData, useRecentTransactions } from "./useDashboardStats";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import baeminLogo from "@/assets/baemin-logo.png";

export interface FeedCard {
  id: string;
  type: "hero" | "standard";
  title: string;
  bigNumber?: string;
  unit?: string;
  change?: { value: string; positive: boolean };
  body?: string;
  action?: string;
  actionRoute?: string;
  time: string;
  date: string; // YYYY-MM-DD
  gradient?: string;
  priority: number; // lower = higher priority
  detail?: string; // 상세 요약 (모달에 표시)
  iconUrl?: string; // 아이콘 이미지 URL
}

function formatMoney(amount: number): { number: string; unit: string } {
  if (amount >= 100_000_000) {
    return { number: (amount / 100_000_000).toFixed(1).replace(/\.0$/, ""), unit: "억원" };
  }
  if (amount >= 10_000) {
    return { number: Math.round(amount / 10_000).toLocaleString(), unit: "만원" };
  }
  return { number: amount.toLocaleString(), unit: "원" };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function daysUntil(month: number, day: number): number {
  const now = new Date();
  const target = new Date(now.getFullYear(), month - 1, day);
  if (target < now) target.setFullYear(target.getFullYear() + 1);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// 부가세 마감일 계산 (1월 25일, 7월 25일)
function getNextVatDeadline(): { dDay: number; label: string } | null {
  const now = new Date();
  const m = now.getMonth() + 1;
  if (m <= 1 || (m === 1 && now.getDate() <= 25)) {
    return { dDay: daysUntil(1, 25), label: "1기 확정" };
  }
  if (m <= 7 || (m === 7 && now.getDate() <= 25)) {
    return { dDay: daysUntil(7, 25), label: "2기 확정" };
  }
  return { dDay: daysUntil(1, 25), label: "1기 확정" };
}

function useSettlementForecast() {
  return useQuery({
    queryKey: ["settlement-forecast-feed"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // KST 기준 오늘
      const now = new Date();
      const kstNow = new Date(now.getTime() + 9 * 3600000);
      const todayStr = kstNow.toISOString().split("T")[0].replace(/-/g, "");
      const futureStr = new Date(kstNow.getTime() + 14 * 86400000)
        .toISOString().split("T")[0].replace(/-/g, "");
      const pastStr = new Date(kstNow.getTime() - 14 * 86400000)
        .toISOString().split("T")[0].replace(/-/g, "");

      // 최근 14일 ~ 향후 14일 범위 내 정산 데이터 조회
      const { data: orders } = await supabase
        .from("delivery_orders")
        .select("settle_dt, settle_amt, platform")
        .eq("user_id", user.id)
        .eq("platform", "baemin")
        .gte("settle_dt", pastStr)
        .lte("settle_dt", futureStr)
        .not("settle_amt", "is", null);

      if (!orders || orders.length === 0) return null;

      const byDate = new Map<string, { total: number; count: number; platform: string }>();
      for (const o of orders) {
        if (!o.settle_dt) continue;
        const existing = byDate.get(o.settle_dt) || { total: 0, count: 0, platform: o.platform };
        existing.total += Number(o.settle_amt) || 0;
        existing.count++;
        byDate.set(o.settle_dt, existing);
      }
      if (byDate.size === 0) return null;

      const sorted = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      // 1) 오늘/미래 정산 우선, 없으면 2) 가장 최근 과거 정산
      const futureOrToday = sorted.find(([d]) => d >= todayStr);
      const target = futureOrToday || sorted[sorted.length - 1];
      const [pickDate, pickInfo] = target;

      const y = pickDate.slice(0, 4);
      const m = pickDate.slice(4, 6);
      const d = pickDate.slice(6, 8);
      const settleDate = new Date(`${y}-${m}-${d}`);
      const todayDate = new Date(`${todayStr.slice(0, 4)}-${todayStr.slice(4, 6)}-${todayStr.slice(6, 8)}`);
      const daysDiff = Math.round((settleDate.getTime() - todayDate.getTime()) / 86400000);

      // 미래 정산 합계 (totalPending)
      const futureEntries = sorted.filter(([d]) => d >= todayStr);
      const totalPending = futureEntries.reduce((sum, [, info]) => sum + info.total, 0);

      return {
        nextDate: `${Number(m)}/${Number(d)}`,
        daysLeft: daysDiff, // 음수면 과거
        nextAmount: pickInfo.total,
        nextCount: pickInfo.count,
        totalPending: totalPending || pickInfo.total,
        totalDates: futureEntries.length || 1,
        platform: pickInfo.platform,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFeedCards() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: actionData, isLoading: actionLoading } = useActionData();
  const { data: recentTx, isLoading: txLoading } = useRecentTransactions();
  const { data: settlement, isLoading: settlementLoading } = useSettlementForecast();

  const isLoading = statsLoading || actionLoading || txLoading || settlementLoading;

  const { todayCards, historyCards } = useMemo(() => {
    const today: FeedCard[] = [];
    const history: FeedCard[] = [];
    const td = todayStr();

    // === TODAY CARDS ===

    // 1. Hero: 오늘 매출 (항상 표시, 0원이어도)
    if (stats) {
      const income = stats.todayIncome;
      const fmt = formatMoney(income);
      const monthFmt = formatMoney(stats.monthlyIncome);

      // 전월 대비 증감률 계산 (통합)
      let changeInfo: { value: string; positive: boolean } | undefined;
      let comparisonBody = `이번 달 누적 ${monthFmt.number}${monthFmt.unit}`;
      if (actionData && actionData.lastMonthIncome > 0) {
        const diff = actionData.thisMonthIncome - actionData.lastMonthIncome;
        const pct = Math.round((diff / actionData.lastMonthIncome) * 100);
        if (Math.abs(pct) >= 5) {
          changeInfo = { value: `${pct > 0 ? "+" : ""}${pct}%`, positive: pct > 0 };
          comparisonBody = `이번 달 누적 ${monthFmt.number}${monthFmt.unit} · 전월 대비 ${pct > 0 ? "증가" : "감소"}`;
        }
      }

      today.push({
        id: "today-income",
        type: "hero",
        title: "오늘 매출",
        bigNumber: fmt.number,
        unit: fmt.unit,
        change: changeInfo,
        body: comparisonBody,
        detail: `오늘 총 매출은 ${fmt.number}${fmt.unit}이며, 이번 달 누적 매출은 ${monthFmt.number}${monthFmt.unit}입니다.${changeInfo ? ` 지난 달 동기간 대비 ${changeInfo.value} 변동했습니다.` : ""} 매출 추이를 확인하고 전월 대비 성과를 점검해보세요.`,
        action: "상세 보기",
        actionRoute: "/transactions",
        time: "실시간",
        date: td,
        gradient: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
        priority: 1,
      });
    }

    // 2. 배민 정산 입금
    if (settlement) {
      const fmt = formatMoney(settlement.nextAmount);
      const isToday = settlement.daysLeft <= 0;
      today.push({
        id: "settlement-forecast",
        type: "hero",
        title: isToday ? "배민 정산 오늘 입금" : `배민 정산 D-${settlement.daysLeft}`,
        bigNumber: fmt.number,
        unit: fmt.unit,
        body: isToday
          ? `오늘 입금 예정 · ${settlement.nextCount}건`
          : `${settlement.nextDate} 입금 예정 · ${settlement.nextCount}건`,
        detail: settlement.totalDates > 1
          ? `총 ${settlement.totalDates}회, ${formatMoney(settlement.totalPending).number}${formatMoney(settlement.totalPending).unit} 정산 대기 중이에요. 현금흐름 계획에 참고하세요.`
          : `정산금이 곧 입금돼요. 현금흐름 계획에 참고하세요.`,
        time: isToday ? "오늘" : "알림",
        date: td,
        gradient: "linear-gradient(135deg, #2AC1BC 0%, #007AFF 100%)",
        iconUrl: baeminLogo,
        priority: isToday ? 2 : 3,
      });
    }

    // 3. 미분류 거래
    if (actionData && actionData.unclassifiedCount > 0) {
      today.push({
        id: "unclassified",
        type: "standard",
        title: "미분류 거래",
        bigNumber: String(actionData.unclassifiedCount),
        unit: "건",
        body: "분류하면 세금 신고가 더 정확해져요",
        detail: `현재 ${actionData.unclassifiedCount}건의 거래가 미분류 상태입니다. 비용을 올바른 계정과목으로 분류하면 부가세 공제와 소득세 경비 처리에 유리합니다.`,
        action: "분류하기",
        actionRoute: "/transactions",
        time: "지금",
        date: td,
        priority: 4,
      });
    }

    // 4. 급여일 알림
    if (actionData && actionData.employeesForSalary.count > 0) {
      const currentDay = new Date().getDate();
      for (const dayGroup of actionData.employeesForSalary.individualDays) {
        const daysLeft = dayGroup.day - currentDay;
        if (daysLeft > 0 && daysLeft <= (actionData.salaryReminderDays || 3)) {
          const fmt = formatMoney(dayGroup.total);
          today.push({
            id: `salary-d${daysLeft}`,
            type: "standard",
            title: `급여일 D-${daysLeft}`,
            bigNumber: fmt.number,
            unit: fmt.unit,
            body: `${dayGroup.count}명 급여 지급 예정`,
            detail: `${dayGroup.day}일 급여일까지 ${daysLeft}일 남았습니다. ${dayGroup.count}명에게 총 ${fmt.number}${fmt.unit}을 지급할 예정이에요. 계좌 잔액을 미리 확인해주세요.`,
            action: "직원 관리",
            actionRoute: "/employees",
            time: "알림",
            date: td,
            gradient: daysLeft <= 1
              ? "linear-gradient(135deg, #FF453A 0%, #FF6B6B 100%)"
              : undefined,
            priority: 2,
          });
        }
      }
    }

    // 5. 오늘 자동이체
    if (actionData && actionData.todayAutoTransfers.count > 0) {
      const fmt = formatMoney(actionData.todayAutoTransfers.totalAmount);
      today.push({
        id: "auto-transfer-today",
        type: "standard",
        title: "오늘 자동이체 예정",
        bigNumber: fmt.number,
        unit: fmt.unit,
        body: actionData.todayAutoTransfers.names.join(", "),
        detail: `오늘 ${actionData.todayAutoTransfers.count}건의 자동이체가 예정되어 있습니다. 총 ${fmt.number}${fmt.unit} (${actionData.todayAutoTransfers.names.join(", ")})`,
        time: "오늘",
        date: td,
        priority: 2,
      });
    }

    // 6. 부가세 마감 알림
    const vat = getNextVatDeadline();
    if (vat && vat.dDay <= 14) {
      today.push({
        id: "vat-deadline",
        type: "standard",
        title: `부가세 마감 D-${vat.dDay}`,
        body: vat.dDay <= 3
          ? "지금 신고하면 가산세 없이 처리할 수 있어요"
          : `${vat.label} 신고 마감이 다가오고 있어요`,
        detail: `부가세 ${vat.label} 신고 마감까지 ${vat.dDay}일 남았습니다. ${vat.dDay <= 3 ? "기한 내 미신고 시 가산세가 부과됩니다. 세무사에게 자료를 전달하거나 직접 홈택스에서 신고를 완료하세요." : "미리 자료를 준비해두면 마감일에 여유롭게 처리할 수 있습니다."}`,
        action: "바로 신고하기",
        time: vat.dDay <= 3 ? "긴급" : "알림",
        date: td,
        gradient: vat.dDay <= 3
          ? "linear-gradient(135deg, #FF9500 0%, #FF453A 100%)"
          : undefined,
        priority: vat.dDay <= 3 ? 1 : 5,
      });
    }

    // 7. 오늘 지출이 크면 알림
    if (stats && stats.todayExpense > 0) {
      const fmt = formatMoney(stats.todayExpense);
      // 오늘 지출 개별 내역 구성
      const todayExpenses = (recentTx?.data || [])
        .filter((tx) => tx.transaction_date === td && tx.type !== "income" && tx.type !== "transfer_in")
        .sort((a, b) => Number(b.amount) - Number(a.amount));
      const expenseLines = todayExpenses.slice(0, 10).map((tx) => {
        const m = formatMoney(Number(tx.amount));
        return `• ${tx.description || "기타"} — ${m.number}${m.unit}`;
      });
      const remaining = todayExpenses.length - expenseLines.length;
      let detailText = expenseLines.join("\n");
      if (remaining > 0) detailText += `\n외 ${remaining}건`;
      if (!detailText) detailText = `오늘 총 ${fmt.number}${fmt.unit}의 지출이 발생했습니다.`;

      today.push({
        id: "today-expense",
        type: "standard",
        title: "오늘 지출",
        bigNumber: fmt.number,
        unit: fmt.unit,
        detail: detailText,
        time: "실시간",
        date: td,
        priority: 6,
      });
    }

    // Sort today cards by priority
    today.sort((a, b) => a.priority - b.priority);

    // === HISTORY CARDS (from recent transactions — last 14 days) ===
    if (recentTx?.hasRealData && recentTx.data.length > 0) {
      // Group by date
      const byDate = new Map<string, { income: number; expense: number; count: number; topIncome: string[]; topExpense: string[] }>();
      for (const tx of recentTx.data) {
        if (tx.transaction_date === td) continue; // skip today
        const existing = byDate.get(tx.transaction_date) || { income: 0, expense: 0, count: 0, topIncome: [], topExpense: [] };
        if (tx.type === "income" || tx.type === "transfer_in") {
          existing.income += Number(tx.amount);
          if (tx.description && existing.topIncome.length < 3 && !existing.topIncome.includes(tx.description)) {
            existing.topIncome.push(tx.description);
          }
        } else {
          existing.expense += Number(tx.amount);
          if (tx.description && existing.topExpense.length < 3 && !existing.topExpense.includes(tx.description)) {
            existing.topExpense.push(tx.description);
          }
        }
        existing.count++;
        byDate.set(tx.transaction_date, existing);
      }

      const sortedDates = Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]));
      // Show up to 7 days of history
      for (const [date, summary] of sortedDates.slice(0, 7)) {
        const d = new Date(date);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        if (summary.income > 0) {
          const fmt = formatMoney(summary.income);
          const merchants = summary.topIncome.length > 0
            ? summary.topIncome.join(", ") + (summary.count > summary.topIncome.length ? ` 외` : "")
            : undefined;
          history.push({
            id: `hist-income-${date}`,
            type: "standard",
            title: `${label} 매출`,
            bigNumber: fmt.number,
            unit: fmt.unit,
            body: merchants,
            time: formatRelativeDate(date),
            date,
            priority: 1,
          });
        }
        if (summary.expense > 0) {
          const fmt = formatMoney(summary.expense);
          const merchants = summary.topExpense.length > 0
            ? summary.topExpense.join(", ") + (summary.count > summary.topExpense.length ? ` 외` : "")
            : undefined;
          history.push({
            id: `hist-expense-${date}`,
            type: "standard",
            title: `${label} 지출`,
            bigNumber: fmt.number,
            unit: fmt.unit,
            body: merchants,
            time: formatRelativeDate(date),
            date,
            priority: 2,
          });
        }
      }
    }

    return { todayCards: today, historyCards: history };
  }, [stats, actionData, recentTx, settlement]);

  return { todayCards, historyCards, isLoading };
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  if (diff <= 7) return `${diff}일 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
