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
      if (tx.type === "income") todayIncome += Number(tx.amount);
      else if (tx.type === "expense") todayExpense += Number(tx.amount);
    });
  }

  let monthlyIncome = 0, monthlyExpense = 0;
  if (monthlyResult.data) {
    monthlyResult.data.forEach((tx) => {
      if (tx.type === "income") monthlyIncome += Number(tx.amount);
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

async function fetchWeeklyData(): Promise<{ data: WeeklyDataItem[]; hasRealData: boolean } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 6);

  const { data: transactions } = await supabase
    .from("transactions")
    .select("transaction_date, type, amount")
    .eq("user_id", user.id)
    .gte("transaction_date", weekAgo.toISOString().split("T")[0])
    .lte("transaction_date", today.toISOString().split("T")[0]);

  if (!transactions || transactions.length === 0) {
    return { data: [], hasRealData: false };
  }

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const weekData: { [key: string]: { 매출: number; 지출: number } } = {};

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dayName = dayNames[date.getDay()];
    weekData[dayName] = { 매출: 0, 지출: 0 };
  }

  transactions.forEach((tx) => {
    const txDate = new Date(tx.transaction_date);
    const dayName = dayNames[txDate.getDay()];
    if (weekData[dayName]) {
      if (tx.type === "income") weekData[dayName].매출 += tx.amount;
      else weekData[dayName].지출 += tx.amount;
    }
  });

  const orderedDays = ["월", "화", "수", "목", "금", "토", "일"];
  const chartData = orderedDays.map((day) => ({
    name: day,
    매출: weekData[day]?.매출 || 0,
    지출: weekData[day]?.지출 || 0,
  }));

  return { data: chartData, hasRealData: true };
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

// TodayActionsCard용 - 이번 달 vs 지난 달 매출 비교
interface MonthlyComparison {
  thisMonthIncome: number;
  lastMonthIncome: number;
  unclassifiedCount: number;
}

async function fetchActionData(): Promise<MonthlyComparison | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0];
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0];

  const [thisMonthResult, lastMonthResult, unclassifiedResult] = await Promise.all([
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
  ]);

  const thisMonthIncome = (thisMonthResult.data || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const lastMonthIncome = (lastMonthResult.data || [])
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    thisMonthIncome,
    lastMonthIncome,
    unclassifiedCount: unclassifiedResult.count || 0,
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
