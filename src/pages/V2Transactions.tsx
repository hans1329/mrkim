import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, TrendingUp, TrendingDown, Plus, Trash2, CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTransactions, useTransactionStats, useAddTransaction, useDeleteTransaction, type TransactionInsert } from "@/hooks/useTransactions";
import { formatCurrency } from "@/data/mockData";
import { Skeleton } from "@/components/ui/skeleton";
import { format, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";

const PERIOD_OPTIONS = [
  { key: "1m", label: "1개월" },
  { key: "3m", label: "3개월" },
  { key: "6m", label: "6개월" },
  { key: "all", label: "전체" },
] as const;

const FILTER_OPTIONS = [
  { key: "all", label: "전체" },
  { key: "income", label: "매출" },
  { key: "expense", label: "지출" },
] as const;

const PAGE_SIZE = 50;

export default function V2Transactions() {
  const navigate = useNavigate();
  const [periodPreset, setPeriodPreset] = useState<"1m" | "3m" | "6m" | "all">("3m");
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const dateRange = useMemo(() => {
    if (periodPreset === "all") return { startDate: undefined, endDate: undefined };
    const months = periodPreset === "1m" ? 1 : periodPreset === "3m" ? 3 : 6;
    const start = subMonths(new Date(), months);
    return { startDate: format(start, "yyyy-MM-dd"), endDate: format(new Date(), "yyyy-MM-dd") };
  }, [periodPreset]);

  const { data: transactions, isLoading } = useTransactions({
    type: filter === "all" ? undefined : filter,
    searchTerm: searchTerm || undefined,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const { data: stats, isLoading: isStatsLoading } = useTransactionStats({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const deleteTransaction = useDeleteTransaction();

  const visibleTransactions = useMemo(
    () => transactions?.slice(0, visibleCount) ?? [],
    [transactions, visibleCount],
  );
  const hasMore = (transactions?.length ?? 0) > visibleCount;

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof visibleTransactions>();
    for (const tx of visibleTransactions) {
      const date = tx.transaction_date || "unknown";
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(tx);
    }
    return Array.from(map.entries());
  }, [visibleTransactions]);

  const handleDelete = () => {
    if (!deleteTargetId) return;
    deleteTransaction.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("삭제 완료"); setDeleteTargetId(null); },
      onError: () => toast.error("삭제 실패"),
    });
  };

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: "#0A0A0F" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3"
        style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
        <div className="flex items-center justify-between">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <ArrowLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.8)" }} />
          </motion.button>
          <h1 className="text-[17px] font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
            매출 / 매입
          </h1>
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSearchOpen(!searchOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: searchOpen ? "rgba(0,122,255,0.15)" : "rgba(255,255,255,0.06)" }}>
            <Search className="w-4.5 h-4.5" style={{ color: searchOpen ? "#007AFF" : "rgba(255,255,255,0.6)" }} />
          </motion.button>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3">
              <input
                autoFocus
                placeholder="거래처 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 rounded-xl px-4 text-[14px] outline-none"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 pb-32">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mt-1">
          <SummaryBox label="매출" value={stats?.totalIncome} loading={isStatsLoading} color="#30D158" />
          <SummaryBox label="지출" value={stats?.totalExpense} loading={isStatsLoading} color="#FF453A" />
          <SummaryBox label="순이익" value={stats?.netProfit} loading={isStatsLoading} color="#007AFF" />
        </div>

        {/* Period filter */}
        <div className="flex gap-1.5 mt-4">
          {PERIOD_OPTIONS.map((p) => (
            <motion.button key={p.key} whileTap={{ scale: 0.95 }}
              onClick={() => { setPeriodPreset(p.key); setVisibleCount(PAGE_SIZE); }}
              className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors"
              style={{
                background: periodPreset === p.key ? "rgba(0,122,255,0.15)" : "rgba(255,255,255,0.04)",
                color: periodPreset === p.key ? "#007AFF" : "rgba(255,255,255,0.4)",
                border: `1px solid ${periodPreset === p.key ? "rgba(0,122,255,0.3)" : "rgba(255,255,255,0.06)"}`,
              }}>
              {p.label}
            </motion.button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-1.5 mt-2">
          {FILTER_OPTIONS.map((f) => (
            <motion.button key={f.key} whileTap={{ scale: 0.95 }}
              onClick={() => { setFilter(f.key); setVisibleCount(PAGE_SIZE); }}
              className="flex-1 py-2 rounded-xl text-[12px] font-semibold transition-colors"
              style={{
                background: filter === f.key ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                color: filter === f.key ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)",
                border: `1px solid ${filter === f.key ? "rgba(255,255,255,0.12)" : "transparent"}`,
              }}>
              {f.label}
            </motion.button>
          ))}
        </div>

        {/* Transactions list */}
        <div className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-1 py-2">
                  <Skeleton className="h-9 w-9 rounded-full bg-white/5 shrink-0" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 bg-white/5 mb-1.5" />
                    <Skeleton className="h-3 w-1/2 bg-white/5" />
                  </div>
                  <Skeleton className="h-4 w-16 bg-white/5" />
                </div>
              ))}
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-[15px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                거래 내역이 없습니다
              </p>
              <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                카드/계좌를 연동하면 자동 수집됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {grouped.map(([date, txs]) => (
                <div key={date}>
                  {/* Date header */}
                  <div className="sticky top-[68px] z-10 py-2 flex items-center gap-2"
                    style={{ background: "#0A0A0F" }}>
                    <span className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>
                      {formatDateHeader(date)}
                    </span>
                    <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.04)" }} />
                  </div>

                  {/* Transaction items */}
                  {txs.map((tx) => (
                    <motion.div key={tx.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-3 py-2.5 px-1 group"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      {/* Icon */}
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: (tx.type === "income" || tx.type === "transfer_in")
                            ? "rgba(48,209,88,0.1)" : "rgba(255,69,58,0.1)",
                        }}>
                        {tx.category_icon ? (
                          <span className="text-sm">{tx.category_icon}</span>
                        ) : (tx.type === "income" || tx.type === "transfer_in") ? (
                          <TrendingUp className="w-4 h-4" style={{ color: "#30D158" }} />
                        ) : (
                          <TrendingDown className="w-4 h-4" style={{ color: "#FF453A" }} />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate" style={{ color: "rgba(255,255,255,0.9)" }}>
                          {tx.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                            {tx.category || "미분류"}
                          </span>
                          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
                          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>
                            {tx.source_type === "card" ? "카드" : tx.source_type === "delivery" ? "배달" : "계좌"}
                          </span>
                          {tx.source_name && (
                            <>
                              <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
                              <span className="text-[11px] truncate" style={{ color: "rgba(255,255,255,0.15)" }}>
                                {tx.source_name}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[14px] font-bold tabular-nums"
                          style={{
                            color: (tx.type === "income" || tx.type === "transfer_in") ? "#30D158" : "#FF453A",
                          }}>
                          {(tx.type === "income" || tx.type === "transfer_in") ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </span>
                        <motion.button whileTap={{ scale: 0.85 }}
                          onClick={() => setDeleteTargetId(tx.id)}
                          className="w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(255,69,58,0.1)" }}>
                          <Trash2 className="w-3 h-3" style={{ color: "#FF453A" }} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))}

              {/* Load more / count */}
              <div className="flex flex-col items-center gap-2 pt-4 pb-8">
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.2)" }}>
                  {visibleCount >= (transactions?.length ?? 0)
                    ? `총 ${(transactions?.length ?? 0).toLocaleString()}건`
                    : `${visibleCount.toLocaleString()} / ${(transactions?.length ?? 0).toLocaleString()}건`}
                </span>
                {hasMore && (
                  <motion.button whileTap={{ scale: 0.97 }}
                    onClick={() => setVisibleCount((p) => p + PAGE_SIZE)}
                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.7)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}>
                    더 보기 ({Math.min(PAGE_SIZE, (transactions?.length ?? 0) - visibleCount)}건)
                  </motion.button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {deleteTargetId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center pb-10"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={() => setDeleteTargetId(null)}>
            <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="w-[calc(100%-32px)] max-w-sm rounded-2xl p-5"
              style={{ background: "#1C1C1E", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="text-[15px] font-semibold text-center" style={{ color: "rgba(255,255,255,0.9)" }}>
                이 거래를 삭제하시겠습니까?
              </p>
              <p className="text-[13px] text-center mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                이 작업은 되돌릴 수 없습니다
              </p>
              <div className="flex gap-2 mt-5">
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => setDeleteTargetId(null)}
                  className="flex-1 py-3 rounded-xl text-[14px] font-semibold"
                  style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}>
                  취소
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl text-[14px] font-semibold"
                  style={{ background: "rgba(255,69,58,0.15)", color: "#FF453A" }}>
                  삭제
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SummaryBox({ label, value, loading, color }: { label: string; value?: number; loading: boolean; color: string }) {
  return (
    <div className="rounded-2xl p-3"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
      <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>{label}</p>
      {loading ? (
        <Skeleton className="h-5 w-full mt-1.5 bg-white/5" />
      ) : (
        <p className="text-[15px] font-bold mt-1 tabular-nums truncate" style={{ color }}>
          {formatCurrency(value || 0)}
        </p>
      )}
    </div>
  );
}

function formatDateHeader(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return format(d, "M월 d일 (EEE)", { locale: ko });
  } catch {
    return dateStr;
  }
}
