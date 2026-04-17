import { useMemo, useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTransactions } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/skeleton";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const HOUR_BUCKETS = Array.from({ length: 24 }, (_, h) => h);

// === KST 유틸 (UTC 변환 없이 순수 산술로 요일 계산) ===
function kstDayOfWeek(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}
function getDowFromIsoDate(s: string): number | null {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return kstDayOfWeek(Number(m[1]), Number(m[2]), Number(m[3]));
}
function getHourFromTime(s: string | null): number {
  if (!s) return -1;
  const m = String(s).match(/^(\d{1,2})/);
  if (!m) return -1;
  const h = Number(m[1]);
  return h >= 0 && h < 24 ? h : -1;
}
function getDowFromOrderDt(s: string | null): number | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  return kstDayOfWeek(Number(m[1]), Number(m[2]), Number(m[3]));
}
function getHourFromOrderTm(s: string | null): number {
  if (!s) return -1;
  const m = String(s).padStart(6, "0").match(/^(\d{2})/);
  if (!m) return -1;
  const h = Number(m[1]);
  return h >= 0 && h < 24 ? h : -1;
}

function useDeliveryOrdersForPattern() {
  return useQuery({
    queryKey: ["sales-pattern-delivery-orders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const PAGE_SIZE = 1000;
      let all: { order_dt: string | null; order_tm: string | null; total_amt: number | null; platform: string }[] = [];
      let from = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("delivery_orders")
          .select("order_dt, order_tm, total_amt, platform")
          .eq("user_id", user.id)
          .in("platform", ["baemin", "coupangeats"])
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        all = all.concat(data || []);
        hasMore = (data?.length || 0) === PAGE_SIZE;
        from += PAGE_SIZE;
      }
      return all;
    },
    staleTime: 1000 * 60 * 3,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });
}

type DailyStat = { day: number; total: number; count: number; avg: number };
type HourlyStat = { hour: number; total: number; count: number };

const fmtMan = (won: number) => `₩${(won / 10000).toFixed(1)}만`;

const glass = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

export default function V2SalesPattern() {
  const navigate = useNavigate();
  const { data: transactions, isLoading: loading } = useTransactions();

  const { daily, hourly, heatmap, hasData, insights } = useMemo(() => {
    const incomes = (transactions || []).filter((t) => t.type === "income");

    const dailyMap = new Map<number, DailyStat>();
    const hourlyMap = new Map<number, HourlyStat>();
    const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const t of incomes) {
      const d = new Date(t.transaction_date);
      if (isNaN(d.getTime())) continue;
      const dow = d.getDay();
      const amt = Number(t.amount) || 0;

      const ds = dailyMap.get(dow) || { day: dow, total: 0, count: 0, avg: 0 };
      ds.total += amt;
      ds.count += 1;
      dailyMap.set(dow, ds);

      let hr = -1;
      if (t.transaction_time) {
        const m = String(t.transaction_time).match(/^(\d{1,2})/);
        if (m) hr = Number(m[1]);
      }
      if (hr >= 0 && hr < 24) {
        const hs = hourlyMap.get(hr) || { hour: hr, total: 0, count: 0 };
        hs.total += amt;
        hs.count += 1;
        hourlyMap.set(hr, hs);
        heat[dow][hr] += amt;
      }
    }

    const daily: DailyStat[] = Array.from({ length: 7 }, (_, i) => {
      const s = dailyMap.get(i) || { day: i, total: 0, count: 0, avg: 0 };
      s.avg = s.count > 0 ? s.total / s.count : 0;
      return s;
    });
    const hourly: HourlyStat[] = HOUR_BUCKETS.map(
      (h) => hourlyMap.get(h) || { hour: h, total: 0, count: 0 }
    );

    const totalDaily = daily.reduce((s, d) => s + d.total, 0);
    const totalHourly = hourly.reduce((s, h) => s + h.total, 0);

    const topDay = [...daily].sort((a, b) => b.total - a.total)[0];
    const lowDay = [...daily].filter((d) => d.count > 0).sort((a, b) => a.avg - b.avg)[0];
    const peakHour = [...hourly].sort((a, b) => b.total - a.total)[0];
    const weekendShare =
      totalDaily > 0
        ? ((daily[5].total + daily[6].total + daily[0].total) / totalDaily) * 100
        : 0;
    const eveningShare =
      totalHourly > 0
        ? (hourly.slice(17, 23).reduce((s, h) => s + h.total, 0) / totalHourly) * 100
        : 0;

    let hotDow = -1, hotHour = -1, hotMax = 0;
    for (let dw = 0; dw < 7; dw++) {
      for (let hr = 0; hr < 24; hr++) {
        if (heat[dw][hr] > hotMax) {
          hotMax = heat[dw][hr];
          hotDow = dw;
          hotHour = hr;
        }
      }
    }

    return {
      daily,
      hourly,
      heatmap: heat,
      hasData: incomes.length > 0,
      insights: {
        topDay,
        lowDay,
        weekendShare,
        peakHour,
        peakHourShare: totalHourly > 0 && peakHour ? (peakHour.total / totalHourly) * 100 : 0,
        eveningShare,
        hotDow,
        hotHour,
      },
    };
  }, [transactions]);

  return (
    <div
      className="h-full overflow-y-auto overflow-x-hidden"
      style={{ background: "#0A0A0F", WebkitOverflowScrolling: "touch" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(10,10,15,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div>
          <h1 className="text-[16px] font-bold text-white">매출 패턴 분석</h1>
          <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>
            요일·시간대별 매출 흐름을 한눈에
          </p>
        </div>
      </div>

      <div className="px-4 py-4 pb-24 flex flex-col gap-3">
        {loading ? (
          <>
            <Skeleton className="h-44 w-full bg-white/5 rounded-2xl" />
            <Skeleton className="h-40 w-full bg-white/5 rounded-2xl" />
            <Skeleton className="h-40 w-full bg-white/5 rounded-2xl" />
          </>
        ) : !hasData ? (
          <div className="rounded-2xl p-6 text-center" style={glass}>
            <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
              매출 데이터가 쌓이면 분석을 보여드릴게요
            </p>
          </div>
        ) : (
          <>
            <InsightSummary insights={insights} />
            <PatternCarousel daily={daily} hourly={hourly} heatmap={heatmap} insights={insights} />
            <SectionCard title="요일별 평균 매출">
              <DailyChart daily={daily} insights={insights} />
            </SectionCard>
            <SectionCard title="시간대별 매출">
              <HourlyChart hourly={hourly} insights={insights} />
            </SectionCard>
            <SectionCard title="요일 × 시간 히트맵">
              <HeatmapChart heatmap={heatmap} insights={insights} />
            </SectionCard>
          </>
        )}
      </div>
    </div>
  );
}

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-2xl p-4" style={glass}>
    <h4 className="text-[13px] font-bold mb-3" style={{ color: "rgba(255,255,255,0.92)" }}>
      {title}
    </h4>
    {children}
  </div>
);

/* ============================================================
 * 인사이트 요약 (4개 메트릭)
 * ============================================================ */
const InsightSummary = ({ insights }: { insights: any }) => {
  const items: { label: string; value: string; tone?: "hot" | "cool" | "warn" }[] = [];
  if (insights.topDay?.total > 0)
    items.push({
      label: "최고 요일",
      value: `${DAY_LABELS[insights.topDay.day]}요일 · ${fmtMan(insights.topDay.avg)}`,
      tone: "hot",
    });
  if (insights.peakHour?.total > 0)
    items.push({
      label: "피크 시간",
      value: `${insights.peakHour.hour}시 · ${insights.peakHourShare.toFixed(0)}%`,
      tone: "hot",
    });
  if (insights.weekendShare > 0)
    items.push({ label: "주말 비중", value: `${insights.weekendShare.toFixed(0)}%`, tone: "cool" });
  if (insights.lowDay?.avg > 0)
    items.push({ label: "최저 요일", value: `${DAY_LABELS[insights.lowDay.day]}요일`, tone: "warn" });

  return (
    <div className="rounded-2xl p-4" style={glass}>
      <div className="flex items-center gap-1.5 mb-3">
        <span
          className="w-1 h-3.5 rounded-full"
          style={{ background: "linear-gradient(180deg, #FF9F0A, #FF3B30)" }}
        />
        <h4 className="text-[13px] font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
          핵심 인사이트
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-xl px-3 py-2.5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <p className="text-[10.5px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
              {it.label}
            </p>
            <p
              className="text-[13px] font-bold mt-0.5 truncate"
              style={{
                color:
                  it.tone === "hot"
                    ? "#FF9F0A"
                    : it.tone === "cool"
                    ? "#5AA9FF"
                    : it.tone === "warn"
                    ? "rgba(255,255,255,0.55)"
                    : "rgba(255,255,255,0.92)",
              }}
            >
              {it.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============================================================
 * 캐러셀
 * ============================================================ */
const PatternCarousel = ({
  daily,
  hourly,
  heatmap,
  insights,
}: {
  daily: DailyStat[];
  hourly: HourlyStat[];
  heatmap: number[][];
  insights: any;
}) => {
  const [idx, setIdx] = useState(0);
  const slides = [
    { id: "daily", title: "요일별 패턴", render: () => <DailyChart daily={daily} insights={insights} /> },
    { id: "hourly", title: "시간대별 패턴", render: () => <HourlyChart hourly={hourly} insights={insights} /> },
    { id: "heatmap", title: "요일×시간 히트맵", render: () => <HeatmapChart heatmap={heatmap} insights={insights} /> },
  ];

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const t = 60;
    if (info.offset.x < -t && idx < slides.length - 1) setIdx(idx + 1);
    else if (info.offset.x > t && idx > 0) setIdx(idx - 1);
  };

  return (
    <div className="rounded-2xl p-4" style={glass}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[13px] font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
          {slides[idx].title}
        </h4>
        <div className="flex gap-1">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setIdx(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 16 : 6,
                background: i === idx ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
      </div>

      <div className="overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={slides[idx].id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
          >
            {slides[idx].render()}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-between mt-3 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} className="disabled:opacity-30">
          ← 이전
        </button>
        <span>{idx + 1} / {slides.length}</span>
        <button
          onClick={() => setIdx(Math.min(slides.length - 1, idx + 1))}
          disabled={idx === slides.length - 1}
          className="disabled:opacity-30"
        >
          다음 →
        </button>
      </div>
    </div>
  );
};

/* ============================================================
 * 차트들
 * ============================================================ */
const DailyChart = ({ daily, insights }: { daily: DailyStat[]; insights: any }) => {
  const maxDaily = Math.max(...daily.map((d) => d.avg), 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {daily.map((d) => {
        const h = (d.avg / maxDaily) * 100;
        const isTop = insights.topDay?.day === d.day && d.total > 0;
        const isLow = insights.lowDay?.day === d.day;
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="w-full rounded-t-md"
              style={{
                background: isTop
                  ? "linear-gradient(180deg, #FF9F0A, #FF6B00)"
                  : isLow
                  ? "rgba(255,255,255,0.12)"
                  : "linear-gradient(180deg, rgba(0,122,255,0.7), rgba(88,86,214,0.5))",
              }}
            />
            <span
              className="text-[10px] font-medium"
              style={{
                color: d.day === 0 ? "#FF6B6B" : d.day === 6 ? "#5AA9FF" : "rgba(255,255,255,0.55)",
              }}
            >
              {DAY_LABELS[d.day]}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const HourlyChart = ({ hourly, insights }: { hourly: HourlyStat[]; insights: any }) => {
  const maxHourly = Math.max(...hourly.map((h) => h.total), 1);
  return (
    <div>
      <div className="flex items-end gap-[2px] h-24 mb-2">
        {hourly.map((h) => {
          const hh = (h.total / maxHourly) * 100;
          const isPeak = insights.peakHour?.hour === h.hour && h.total > 0;
          return (
            <div
              key={h.hour}
              className="flex-1 rounded-sm"
              style={{
                height: `${Math.max(hh, 2)}%`,
                background: isPeak
                  ? "linear-gradient(180deg, #FF9F0A, #FF6B00)"
                  : h.hour >= 17 && h.hour <= 22
                  ? "linear-gradient(180deg, rgba(0,122,255,0.6), rgba(88,86,214,0.4))"
                  : "rgba(255,255,255,0.1)",
              }}
              title={`${h.hour}시 · ${fmtMan(h.total)}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        <span>0시</span>
        <span>6시</span>
        <span>12시</span>
        <span>18시</span>
        <span>23시</span>
      </div>
    </div>
  );
};

const HeatmapChart = ({ heatmap, insights }: { heatmap: number[][]; insights: any }) => {
  const maxHeat = Math.max(...heatmap.flat(), 1);
  return (
    <div>
      <div className="flex flex-col gap-[2px]">
        {DAY_LABELS.map((label, dw) => (
          <div key={dw} className="flex items-center gap-1.5">
            <span
              className="text-[9px] w-3 text-right"
              style={{ color: dw === 0 ? "#FF6B6B" : dw === 6 ? "#5AA9FF" : "rgba(255,255,255,0.5)" }}
            >
              {label}
            </span>
            <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
              {heatmap[dw].map((v, hr) => {
                const intensity = v / maxHeat;
                const isHot = dw === insights.hotDow && hr === insights.hotHour && v > 0;
                return (
                  <div
                    key={hr}
                    className="aspect-square rounded-[2px]"
                    style={{
                      background: isHot
                        ? "linear-gradient(135deg, #FF9F0A, #FF3B30)"
                        : intensity > 0
                        ? `rgba(0,122,255,${0.15 + intensity * 0.8})`
                        : "rgba(255,255,255,0.04)",
                    }}
                    title={v > 0 ? `${DAY_LABELS[dw]} ${hr}시 · ${fmtMan(v)}` : undefined}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
        <span>0시</span>
        <span>12시</span>
        <span>23시</span>
      </div>
    </div>
  );
};
