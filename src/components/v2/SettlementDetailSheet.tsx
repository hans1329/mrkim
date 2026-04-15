import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import baeminLogo from "@/assets/baemin-logo.png";

interface SettlementDetailSheetProps {
  open: boolean;
  onClose: () => void;
}

interface SettlementGroup {
  date: string;
  displayDate: string;
  daysLeft: number;
  total: number;
  count: number;
  orders: { order_no: string; order_name: string | null; settle_amt: number; order_dt: string | null }[];
}

function useSettlementDetails(open: boolean) {
  return useQuery({
    queryKey: ["settlement-details"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0].replace(/-/g, "");
      const futureStr = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0].replace(/-/g, "");

      const { data: orders } = await supabase
        .from("delivery_orders")
        .select("order_no, order_name, settle_dt, settle_amt, order_dt, platform")
        .eq("user_id", user.id)
        .gte("settle_dt", todayStr)
        .lte("settle_dt", futureStr)
        .not("settle_amt", "is", null)
        .order("settle_dt", { ascending: true });

      if (!orders || orders.length === 0) return [];

      const groups = new Map<string, SettlementGroup>();
      for (const o of orders) {
        if (!o.settle_dt) continue;
        const y = o.settle_dt.slice(0, 4);
        const m = o.settle_dt.slice(4, 6);
        const d = o.settle_dt.slice(6, 8);
        const settleDate = new Date(`${y}-${m}-${d}`);
        const daysLeft = Math.ceil((settleDate.getTime() - today.getTime()) / 86400000);

        const existing = groups.get(o.settle_dt) || {
          date: o.settle_dt,
          displayDate: `${Number(m)}월 ${Number(d)}일`,
          daysLeft,
          total: 0,
          count: 0,
          orders: [],
        };
        existing.total += Number(o.settle_amt) || 0;
        existing.count++;
        existing.orders.push({
          order_no: o.order_no,
          order_name: o.order_name,
          settle_amt: Number(o.settle_amt) || 0,
          order_dt: o.order_dt,
        });
        groups.set(o.settle_dt, existing);
      }

      return Array.from(groups.values());
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
}

function formatAmount(amount: number): string {
  return amount.toLocaleString() + "원";
}

export function SettlementDetailSheet({ open, onClose }: SettlementDetailSheetProps) {
  const { data: groups, isLoading } = useSettlementDetails(open);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const totalAmount = groups?.reduce((sum, g) => sum + g.total, 0) || 0;
  const totalCount = groups?.reduce((sum, g) => sum + g.count, 0) || 0;

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/80 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md max-h-[85dvh] flex flex-col rounded-t-[10px] border border-white/10 transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
        style={{ background: "#0A0A0F" }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-5 pb-4 pt-1 flex items-center gap-3">
          <img src={baeminLogo} alt="배민" className="w-9 h-9 rounded-lg" />
          <div>
            <h2 className="text-[16px] font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
              배민 정산 예정
            </h2>
            {!isLoading && groups && groups.length > 0 && (
              <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {groups.length}일 · {totalCount}건 · {formatAmount(totalAmount)}
              </p>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-5 pb-8 flex-1">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
                  <Skeleton className="h-4 w-24 bg-white/5 mb-3" />
                  <Skeleton className="h-5 w-32 bg-white/5 mb-2" />
                  <Skeleton className="h-3 w-20 bg-white/5" />
                </div>
              ))}
            </div>
          ) : !groups || groups.length === 0 ? (
            <div className="text-center py-10" style={{ color: "rgba(255,255,255,0.3)" }}>
              <p className="text-[14px]">예정된 정산 내역이 없어요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.date}
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Date header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                        {group.displayDate}
                      </span>
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: group.daysLeft <= 0
                            ? "rgba(48,209,88,0.15)"
                            : group.daysLeft <= 3
                              ? "rgba(255,149,0,0.15)"
                              : "rgba(255,255,255,0.06)",
                          color: group.daysLeft <= 0
                            ? "#30D158"
                            : group.daysLeft <= 3
                              ? "#FF9500"
                              : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {group.daysLeft <= 0 ? "오늘" : `D-${group.daysLeft}`}
                      </span>
                    </div>
                    <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      {group.count}건
                    </span>
                  </div>

                  {/* Total */}
                  <div className="text-[18px] font-bold mb-3" style={{ color: "rgba(255,255,255,0.95)" }}>
                    {formatAmount(group.total)}
                  </div>

                  {/* Order list (collapsed, show top 3) */}
                  <div className="space-y-1.5">
                    {group.orders.slice(0, 5).map((order) => (
                      <div
                        key={order.order_no}
                        className="flex items-center justify-between text-[12px]"
                      >
                        <span className="truncate max-w-[60%]" style={{ color: "rgba(255,255,255,0.4)" }}>
                          {order.order_name || `주문 ${order.order_no.slice(-6)}`}
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>
                          {formatAmount(order.settle_amt)}
                        </span>
                      </div>
                    ))}
                    {group.orders.length > 5 && (
                      <p className="text-[11px] pt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                        외 {group.orders.length - 5}건
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
