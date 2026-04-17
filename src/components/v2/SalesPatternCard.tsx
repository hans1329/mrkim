import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTransactions } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/skeleton";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const HOUR_BUCKETS = Array.from({ length: 24 }, (_, h) => h);

const fmtMan = (won: number) => `₩${(won / 10000).toFixed(1)}만`;

/**
 * 매출 패턴 분석 - 대시보드 요약 카드
 * 4가지 핵심 인사이트를 큰 카드 캐러셀로 표시 (네이티브 scroll-snap)
 */
export const SalesPatternCard = () => {
  const navigate = useNavigate();
  const { data: transactions, isLoading: loading } = useTransactions();

  const { insights, hasData } = useMemo(() => {
    const incomes = (transactions || []).filter((t) => t.type === "income");

    const dailyMap = new Map<number, { day: number; total: number; count: number; avg: number }>();
    const hourlyMap = new Map<number, { hour: number; total: number; count: number }>();

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
      }
    }

    const daily = Array.from({ length: 7 }, (_, i) => {
      const s = dailyMap.get(i) || { day: i, total: 0, count: 0, avg: 0 };
      s.avg = s.count > 0 ? s.total / s.count : 0;
      return s;
    });
    const hourly = HOUR_BUCKETS.map((h) => hourlyMap.get(h) || { hour: h, total: 0, count: 0 });

    const totalDaily = daily.reduce((s, d) => s + d.total, 0);
    const totalHourly = hourly.reduce((s, h) => s + h.total, 0);

    const topDay = [...daily].sort((a, b) => b.total - a.total)[0];
    const lowDay = [...daily].filter((d) => d.count > 0).sort((a, b) => a.avg - b.avg)[0];
    const peakHour = [...hourly].sort((a, b) => b.total - a.total)[0];
    const weekendShare =
      totalDaily > 0
        ? ((daily[5].total + daily[6].total + daily[0].total) / totalDaily) * 100
        : 0;
    const peakHourShare = totalHourly > 0 && peakHour ? (peakHour.total / totalHourly) * 100 : 0;

    return {
      hasData: incomes.length > 0,
      insights: { topDay, lowDay, peakHour, peakHourShare, weekendShare },
    };
  }, [transactions]);

  if (loading) {
    return (
      <div className="rounded-2xl p-4" style={glass}>
        <Skeleton className="h-4 w-24 bg-white/10 rounded mb-3" />
        <Skeleton className="h-44 w-full bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="rounded-2xl p-5 text-center" style={glass}>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
          매출 데이터가 쌓이면 요일별·시간대별 패턴을 분석해 드릴게요
        </p>
      </div>
    );
  }

  return (
    <InsightHeroCarousel
      insights={insights}
      onMore={() => navigate("/v2/sales-pattern")}
    />
  );
};

/* ============================================================
 * 4개의 큰 인사이트 카드 캐러셀 (native scroll-snap, 무한 루프)
 * ============================================================ */
type Insights = {
  topDay?: { day: number; total: number; avg: number };
  lowDay?: { day: number; avg: number };
  peakHour?: { hour: number; total: number };
  peakHourShare: number;
  weekendShare: number;
};

type Card = {
  id: string;
  label: string;
  title: string;
  sub: string;
  gradient: string;
  accent: string;
};

const InsightHeroCarousel = ({
  insights,
  onMore,
}: {
  insights: Insights;
  onMore: () => void;
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  const baseCards = useMemo<Card[]>(() => {
    const arr: Card[] = [];
    if (insights.topDay && insights.topDay.total > 0) {
      arr.push({
        id: "top",
        label: "최고 매출 요일",
        title: `${DAY_LABELS[insights.topDay.day]}요일`,
        sub: `평균 ${fmtMan(insights.topDay.avg)}`,
        gradient: "linear-gradient(135deg, #FF9F0A 0%, #FF3B30 100%)",
        accent: "rgba(255,159,10,0.35)",
      });
    }
    if (insights.peakHour && insights.peakHour.total > 0) {
      arr.push({
        id: "peak",
        label: "피크 시간대",
        title: `${insights.peakHour.hour}시`,
        sub: `전체 매출의 ${insights.peakHourShare.toFixed(0)}%`,
        gradient: "linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)",
        accent: "rgba(0,122,255,0.35)",
      });
    }
    if (insights.weekendShare > 0) {
      arr.push({
        id: "weekend",
        label: "주말 매출 비중",
        title: `${insights.weekendShare.toFixed(0)}%`,
        sub: insights.weekendShare > 50 ? "주말이 핵심이에요" : "평일이 더 강해요",
        gradient: "linear-gradient(135deg, #BF5AF2 0%, #5856D6 100%)",
        accent: "rgba(175,82,222,0.35)",
      });
    }
    if (insights.lowDay && insights.lowDay.avg > 0) {
      arr.push({
        id: "low",
        label: "최저 매출 요일",
        title: `${DAY_LABELS[insights.lowDay.day]}요일`,
        sub: `평균 ${fmtMan(insights.lowDay.avg)}`,
        gradient: "linear-gradient(135deg, #8E8E93 0%, #48484A 100%)",
        accent: "rgba(142,142,147,0.3)",
      });
    }
    return arr;
  }, [insights]);

  // 무한 루프를 위해 [last, ...all, first]로 클론
  const cards = useMemo<Card[]>(() => {
    if (baseCards.length === 0) return [];
    return [baseCards[baseCards.length - 1], ...baseCards, baseCards[0]];
  }, [baseCards]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx >= cards.length - 1) {
      el.scrollTo({ left: el.clientWidth, behavior: "auto" });
      setCurrent(0);
    } else if (idx <= 0) {
      el.scrollTo({ left: (cards.length - 2) * el.clientWidth, behavior: "auto" });
      setCurrent(baseCards.length - 1);
    } else {
      setCurrent(idx - 1);
    }
  }, [cards.length, baseCards.length]);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: (idx + 1) * el.clientWidth, behavior: "smooth" });
  }, []);

  // 초기 위치 (클론 다음)
  useEffect(() => {
    const el = scrollRef.current;
    if (el && cards.length > 0) {
      requestAnimationFrame(() => {
        el.scrollTo({ left: el.clientWidth, behavior: "auto" });
      });
    }
  }, [cards.length]);

  if (baseCards.length === 0) return null;

  return (
    <div className="rounded-2xl p-4" style={glass}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1 h-3.5 rounded-full"
            style={{ background: "linear-gradient(180deg, #FF9F0A, #FF3B30)" }}
          />
          <h4 className="text-[13px] font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
            핵심 인사이트
          </h4>
        </div>
        <button
          onClick={onMore}
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          상세보기 →
        </button>
      </div>

      {/* Native scroll-snap carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto no-scrollbar -mx-1"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        {cards.map((card, idx) => (
          <div
            key={`${card.id}-${idx}`}
            className="w-full shrink-0 px-1"
            style={{ scrollSnapAlign: "start" }}
          >
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{
                background: card.gradient,
                minHeight: 168,
                boxShadow: `0 12px 32px -10px ${card.accent}`,
              }}
            >
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 80% 0%, rgba(255,255,255,0.4), transparent 60%)",
                }}
              />
              <div className="relative">
                <p
                  className="text-[11px] font-semibold tracking-wide"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {card.label}
                </p>
                <p className="text-[44px] font-bold leading-tight mt-2 text-white">
                  {card.title}
                </p>
                <p
                  className="text-[13px] font-medium mt-1"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                >
                  {card.sub}
                </p>
              </div>
            </motion.div>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {baseCards.map((c, i) => (
          <button
            key={c.id}
            onClick={() => scrollTo(i)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === current ? 18 : 6,
              background: i === current ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
};

const glass = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};
