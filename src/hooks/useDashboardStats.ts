import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SummaryStats {
  todayIncome: number;
  todayExpense: number;
  monthlyIncome: number;
  monthlyExpense: number;
}

async function fetchSummaryStats(): Promise<SummaryStats | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const [todayResult, monthlyResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .eq("transaction_date", todayStr),
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .gte("transaction_date", monthStart)
      .lte("transaction_date", todayStr),
  ]);

  let todayIncome = 0, todayExpense = 0;
  if (todayResult.data) {
    todayResult.data.forEach((tx) => {
      if (tx.type === "income" || tx.type === "transfer_in") todayIncome += Number(tx.amount);
      else if (tx.type === "expense") todayExpense += Number(tx.amount);
    });
  }

  let monthlyIncome = 0, monthlyExpense = 0;
  if (monthlyResult.data) {
    monthlyResult.data.forEach((tx) => {
      if (tx.type === "income" || tx.type === "transfer_in") monthlyIncome += Number(tx.amount);
      else if (tx.type === "expense") monthlyExpense += Number(tx.amount);
    });
  }

  return { todayIncome, todayExpense, monthlyIncome, monthlyExpense };
}

export function useDashboardStats(enabled = true) {
  return useQuery({
    queryKey: ["dashboard-summary-stats"],
    queryFn: fetchSummaryStats,
    enabled,
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

// 주간 차트 데이터
interface WeeklyDataItem {
  name: string;
  매출: number;
  지출: number;
}

async function fetchWeeklyData(): Promise<{ data: WeeklyDataItem[]; hasRealData: boolean; startDate: string; endDate: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  const startDateStr = weekAgo.toISOString().split("T")[0];
  const endDateStr = today.toISOString().split("T")[0];

  const { data: transactions } = await supabase
    .from("transactions")
    .select("transaction_date, type, amount")
    .eq("user_id", user.id)
    .gte("transaction_date", startDateStr)
    .lte("transaction_date", endDateStr);

  if (!transactions || transactions.length === 0) {
    return { data: [], hasRealData: false, startDate: startDateStr, endDate: endDateStr };
  }

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  // 날짜 순서대로 7일 생성 (오래된 날 → 오늘)
  const chartData: WeeklyDataItem[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const dayName = dayNames[date.getDay()];

    let 매출 = 0, 지출 = 0;
    transactions.forEach((tx) => {
      if (tx.transaction_date === dateStr) {
        if (tx.type === "income" || tx.type === "transfer_in") 매출 += Number(tx.amount);
        else if (tx.type === "expense") 지출 += Number(tx.amount);
        else 지출 += tx.amount;
      }
    });

    chartData.push({ name: dayName, 매출, 지출 });
  }

  return { data: chartData, hasRealData: true, startDate: startDateStr, endDate: endDateStr };
}

export function useWeeklyChartData(enabled = true) {
  return useQuery({
    queryKey: ["dashboard-weekly-chart"],
    queryFn: fetchWeeklyData,
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

// 최근 거래 내역
interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string | null;
  source_type: string;
  transaction_date: string;
}

async function fetchRecentTransactions(): Promise<{ data: Transaction[]; hasRealData: boolean } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("transactions")
    .select("id, description, amount, type, category, source_type, transaction_date")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw error;

  if (!data || data.length === 0) {
    return { data: [], hasRealData: false };
  }

  return { data: data as Transaction[], hasRealData: true };
}

export function useRecentTransactions(enabled = true) {
  return useQuery({
    queryKey: ["dashboard-recent-transactions"],
    queryFn: fetchRecentTransactions,
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

// 미분류 거래 건수
async function fetchUnclassifiedCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count } = await supabase
    .from("transactions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("category", null);

  return count || 0;
}

export function useUnclassifiedCount(enabled = true) {
  return useQuery({
    queryKey: ["dashboard-unclassified-count"],
    queryFn: fetchUnclassifiedCount,
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

// TodayActionsCard용 - 이번 달 vs 지난 달 매출 비교 + 날짜 기반 할 일
interface ActionData {
  thisMonthIncome: number;
  lastMonthIncome: number;
  unclassifiedCount: number;
  // 급여 관련
  salaryDay: number | null;
  salaryReminderDays: number;
  employeesForSalary: { count: number; totalAmount: number; individualDays: { day: number; count: number; total: number }[] };
  // 자동이체 관련
  todayAutoTransfers: { count: number; totalAmount: number; names: string[] };
}

async function fetchActionData(): Promise<ActionData | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const currentDay = today.getDate();
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0];
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0];

  const [thisMonthResult, lastMonthResult, unclassifiedResult, profileResult, employeesResult, autoTransfersResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .gte("transaction_date", thisMonthStart)
      .lte("transaction_date", todayStr),
    supabase
      .from("transactions")
      .select("amount, type")
      .eq("user_id", user.id)
      .gte("transaction_date", lastMonthStart)
      .lte("transaction_date", lastMonthEnd),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("category", null),
    supabase
      .from("profiles")
      .select("salary_day, salary_reminder_days")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("employees")
      .select("id, name, monthly_salary, hourly_rate, weekly_hours, employee_type, salary_day")
      .eq("user_id", user.id)
      .eq("status", "재직"),
    supabase
      .from("auto_transfers")
      .select("id, name, amount, schedule_type, schedule_day")
      .eq("user_id", user.id)
      .eq("is_active", true),
  ]);

  const thisMonthIncome = (thisMonthResult.data || [])
    .filter((t) => t.type === "income" || t.type === "transfer_in")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const lastMonthIncome = (lastMonthResult.data || [])
    .filter((t) => t.type === "income" || t.type === "transfer_in")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // 급여 계산
  const globalSalaryDay = profileResult.data?.salary_day ?? 10;
  const salaryReminderDays = profileResult.data?.salary_reminder_days ?? 1;
  const employees = employeesResult.data || [];

  // 직원별 급여일 그룹핑
  const salaryDayMap = new Map<number, { count: number; total: number }>();
  for (const emp of employees) {
    const empSalaryDay = emp.salary_day ?? globalSalaryDay;
    let salary = Number(emp.monthly_salary || 0);
    if (!salary && emp.hourly_rate && emp.weekly_hours) {
      salary = Math.round(Number(emp.hourly_rate) * Number(emp.weekly_hours) * 4.345);
    }
    const existing = salaryDayMap.get(empSalaryDay) || { count: 0, total: 0 };
    salaryDayMap.set(empSalaryDay, { count: existing.count + 1, total: existing.total + salary });
  }

  const individualDays = Array.from(salaryDayMap.entries()).map(([day, v]) => ({ day, ...v }));
  const totalSalaryAmount = individualDays.reduce((s, d) => s + d.total, 0);
  const totalSalaryCount = individualDays.reduce((s, d) => s + d.count, 0);

  // 오늘 실행 예정 자동이체
  const autoTransfers = autoTransfersResult.data || [];
  const todayTransfers = autoTransfers.filter((at) => {
    if (at.schedule_type === "monthly" && at.schedule_day === currentDay) return true;
    return false;
  });

  return {
    thisMonthIncome,
    lastMonthIncome,
    unclassifiedCount: unclassifiedResult.count || 0,
    salaryDay: globalSalaryDay,
    salaryReminderDays,
    employeesForSalary: { count: totalSalaryCount, totalAmount: totalSalaryAmount, individualDays },
    todayAutoTransfers: {
      count: todayTransfers.length,
      totalAmount: todayTransfers.reduce((s, t) => s + Number(t.amount), 0),
      names: todayTransfers.map((t) => t.name),
    },
  };
}

export function useActionData(enabled = true) {
  return useQuery({
    queryKey: ["dashboard-action-data"],
    queryFn: fetchActionData,
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}
