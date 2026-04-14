import { useMemo } from "react";
import { useDashboardStats, useActionData, useRecentTransactions } from "./useDashboardStats";

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

export function useFeedCards() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: actionData, isLoading: actionLoading } = useActionData();
  const { data: recentTx, isLoading: txLoading } = useRecentTransactions();

  const isLoading = statsLoading || actionLoading || txLoading;

  const { todayCards, historyCards } = useMemo(() => {
    const today: FeedCard[] = [];
    const history: FeedCard[] = [];
    const td = todayStr();

    // === TODAY CARDS ===

    // 1. Hero: 어제 매출 (or 오늘 매출)
    if (stats) {
      const income = stats.todayIncome;
      if (income > 0) {
        const fmt = formatMoney(income);
        const monthFmt = formatMoney(stats.monthlyIncome);
        today.push({
          id: "today-income",
          type: "hero",
          title: "오늘 매출",
          bigNumber: fmt.number,
          unit: fmt.unit,
          body: `이번 달 누적 ${monthFmt.number}${monthFmt.unit}`,
          action: "상세 보기",
          actionRoute: "/transactions",
          time: "실시간",
          date: td,
          gradient: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
          priority: 1,
        });
      } else {
        // 매출이 아직 없으면 이번 달 누적 표시
        if (stats.monthlyIncome > 0) {
          const fmt = formatMoney(stats.monthlyIncome);
          today.push({
            id: "month-income",
            type: "hero",
            title: "이번 달 매출",
            bigNumber: fmt.number,
            unit: fmt.unit,
            action: "상세 보기",
            actionRoute: "/transactions",
            time: "오늘 기준",
            date: td,
            gradient: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
            priority: 1,
          });
        }
      }
    }

    // 2. 매출 비교 (이번 달 vs 지난 달)
    if (actionData && actionData.lastMonthIncome > 0) {
      const diff = actionData.thisMonthIncome - actionData.lastMonthIncome;
      const pct = Math.round((diff / actionData.lastMonthIncome) * 100);
      if (Math.abs(pct) >= 5) {
        const fmt = formatMoney(actionData.thisMonthIncome);
        today.push({
          id: "month-comparison",
          type: "standard",
          title: "이번 달 매출 추이",
          bigNumber: fmt.number,
          unit: fmt.unit,
          change: { value: `${pct > 0 ? "+" : ""}${pct}%`, positive: pct > 0 },
          body: `지난 달 동기간 대비 ${pct > 0 ? "증가" : "감소"}했어요`,
          time: "오늘 기준",
          date: td,
          priority: 3,
        });
      }
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
      today.push({
        id: "today-expense",
        type: "standard",
        title: "오늘 지출",
        bigNumber: fmt.number,
        unit: fmt.unit,
        time: "실시간",
        date: td,
        priority: 6,
      });
    }

    // Sort today cards by priority
    today.sort((a, b) => a.priority - b.priority);

    // === HISTORY CARDS (from recent transactions) ===
    if (recentTx?.hasRealData && recentTx.data.length > 0) {
      // Group by date, create summary cards for past dates
      const byDate = new Map<string, { income: number; expense: number; count: number }>();
      for (const tx of recentTx.data) {
        if (tx.transaction_date === td) continue; // skip today
        const existing = byDate.get(tx.transaction_date) || { income: 0, expense: 0, count: 0 };
        if (tx.type === "income") existing.income += Number(tx.amount);
        else existing.expense += Number(tx.amount);
        existing.count++;
        byDate.set(tx.transaction_date, existing);
      }

      const sortedDates = Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]));
      for (const [date, summary] of sortedDates) {
        const d = new Date(date);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        if (summary.income > 0) {
          const fmt = formatMoney(summary.income);
          history.push({
            id: `hist-income-${date}`,
            type: "standard",
            title: `${label} 매출`,
            bigNumber: fmt.number,
            unit: fmt.unit,
            time: formatRelativeDate(date),
            date,
            priority: 1,
          });
        }
        if (summary.expense > 0) {
          const fmt = formatMoney(summary.expense);
          history.push({
            id: `hist-expense-${date}`,
            type: "standard",
            title: `${label} 지출`,
            bigNumber: fmt.number,
            unit: fmt.unit,
            time: formatRelativeDate(date),
            date,
            priority: 2,
          });
        }
      }
    }

    return { todayCards: today, historyCards: history };
  }, [stats, actionData, recentTx]);

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
