import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * V3 요일별 매출 패턴 인사이트 캐러셀.
 *
 * V2 의 SalesPatternCard 포팅. 현재는 mock 데이터.
 * 실 연결 시 V2 와 동일하게 transactions + delivery_orders 집계로 교체.
 *
 * 구성: 4장 인사이트 카드 (최고 요일 / 피크 시간 / 주말 비중 / 최저 요일)
 * - native scroll-snap 스와이프
 * - 무한 루프 ([last, ...all, first] 패턴)
 * - dot indicator
 */

// ────────────────── Mock 데이터 ──────────────────

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 실제: useQuery 로 교체
const mockInsights = {
  topDay: { day: 6, total: 28_400_000, avg: 4_200_000 }, // 토
  lowDay: { day: 2, avg: 1_800_000 }, // 화
  peakHour: { hour: 12, total: 8_400_000 },
  peakHourShare: 22,
  weekendShare: 58,
};

const fmtMan = (won: number) => `₩${(won / 10000).toFixed(1)}만`;

// ────────────────── 카드 타입 ──────────────────

interface InsightCard {
  id: string;
  label: string;
  title: string;
  sub: string;
  /** CSS linear-gradient. 카드 정체성을 위해 art-directed 색상 허용 (대시보드 일반 색상은 HSL 토큰). */
  gradient: string;
  /** box-shadow 용 accent 컬러 */
  accent: string;
}

// ────────────────── 메인 캐러셀 ──────────────────

export function V3SalesPatternCarousel() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  const baseCards = useMemo<InsightCard[]>(() => {
    const arr: InsightCard[] = [];
    if (mockInsights.topDay.total > 0) {
      arr.push({
        id: "top",
        label: "최고 매출 요일",
        title: `${DAY_LABELS[mockInsights.topDay.day]}요일`,
        sub: `평균 ${fmtMan(mockInsights.topDay.avg)}`,
        gradient: "linear-gradient(135deg, #FF9F0A 0%, #FF3B30 100%)",
        accent: "rgba(255,159,10,0.35)",
      });
    }
    if (mockInsights.peakHour.total > 0) {
      arr.push({
        id: "peak",
        label: "피크 시간대",
        title: `${mockInsights.peakHour.hour}시`,
        sub: `전체 매출의 ${mockInsights.peakHourShare}%`,
        gradient: "linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)",
        accent: "rgba(0,122,255,0.35)",
      });
    }
    if (mockInsights.weekendShare > 0) {
      arr.push({
        id: "weekend",
        label: "주말 매출 비중",
        title: `${mockInsights.weekendShare}%`,
        sub:
          mockInsights.weekendShare > 50
            ? "주말이 핵심이에요"
            : "평일이 더 강해요",
        gradient: "linear-gradient(135deg, #BF5AF2 0%, #5856D6 100%)",
        accent: "rgba(175,82,222,0.35)",
      });
    }
    if (mockInsights.lowDay.avg > 0) {
      arr.push({
        id: "low",
        label: "최저 매출 요일",
        title: `${DAY_LABELS[mockInsights.lowDay.day]}요일`,
        sub: `평균 ${fmtMan(mockInsights.lowDay.avg)}`,
        gradient: "linear-gradient(135deg, #8E8E93 0%, #48484A 100%)",
        accent: "rgba(142,142,147,0.3)",
      });
    }
    return arr;
  }, []);

  // 무한 루프: [last, ...all, first]
  const cards = useMemo<InsightCard[]>(() => {
    if (baseCards.length === 0) return [];
    return [baseCards[baseCards.length - 1], ...baseCards, baseCards[0]];
  }, [baseCards]);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: (idx + 1) * el.clientWidth, behavior: "smooth" });
  }, []);

  // 초기 위치 (클론 다음 = 실제 첫 카드)
  useEffect(() => {
    const el = scrollRef.current;
    if (el && cards.length > 0) {
      requestAnimationFrame(() => {
        el.scrollTo({ left: el.clientWidth, behavior: "auto" });
      });
    }
  }, [cards.length]);

  /**
   * 스크롤 핸들링:
   *  - 스크롤 중에는 indicator 만 갱신 (텔레포트 X → 떨림 방지)
   *  - 스크롤이 멈춘 뒤(scrollend 또는 150ms 무이동) 에만 클론→실 카드 텔레포트
   */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || cards.length === 0) return;

    let settleTimer: number | null = null;

    const updateIndicator = () => {
      const w = el.clientWidth;
      if (w === 0) return;
      const idx = Math.round(el.scrollLeft / w);
      const logical =
        idx <= 0
          ? baseCards.length - 1
          : idx >= cards.length - 1
          ? 0
          : idx - 1;
      setCurrent(logical);
    };

    const settle = () => {
      const w = el.clientWidth;
      if (w === 0) return;
      const idx = Math.round(el.scrollLeft / w);
      if (idx >= cards.length - 1) {
        // 마지막 클론 → 실제 첫 카드로 순간이동
        el.scrollTo({ left: w, behavior: "auto" });
      } else if (idx <= 0) {
        // 첫 클론 → 실제 마지막 카드로 순간이동
        el.scrollTo({ left: (cards.length - 2) * w, behavior: "auto" });
      }
    };

    const handleScroll = () => {
      updateIndicator();
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      // 스크롤이 150ms 동안 움직이지 않으면 "멈춤" 판정
      settleTimer = window.setTimeout(settle, 150);
    };

    // 최신 브라우저의 scrollend 이벤트 (더 신뢰도 높음)
    const supportsScrollEnd =
      typeof (el as HTMLElement & { onscrollend?: unknown }).onscrollend !== "undefined";

    el.addEventListener("scroll", handleScroll, { passive: true });
    if (supportsScrollEnd) {
      el.addEventListener("scrollend", settle);
    }

    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (supportsScrollEnd) el.removeEventListener("scrollend", settle);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
    };
  }, [cards.length, baseCards.length]);

  if (baseCards.length === 0) return null;

  return (
    <div
      className="
        relative overflow-hidden rounded-3xl
        border border-white/[0.08]
        bg-white/[0.04] backdrop-blur-xl
        shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
        p-4
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
          요일별 패턴
        </p>
        <button
          onClick={() => navigate("/v2/sales-pattern")}
          className="
            inline-flex items-center gap-1 h-8 px-3
            rounded-full
            bg-white/[0.06] border border-white/[0.08]
            text-[11px] font-medium text-white/75
            active:scale-95 transition
          "
        >
          상세보기
          <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto -mx-1"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <style>{`
          .v3-carousel-scroll::-webkit-scrollbar { display: none; }
        `}</style>
        {cards.map((card, idx) => (
          <div
            key={`${card.id}-${idx}`}
            className="w-full shrink-0 px-1"
            style={{ scrollSnapAlign: "start" }}
          >
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="relative overflow-hidden rounded-2xl p-5"
              style={{
                background: card.gradient,
                minHeight: 164,
                boxShadow: `0 12px 32px -10px ${card.accent}`,
              }}
            >
              {/* Top-right radial glow */}
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle at 80% 0%, rgba(255,255,255,0.5), transparent 60%)",
                }}
              />
              <div className="relative">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-white/85">
                  {card.label}
                </p>
                <p className="mt-2.5 text-5xl font-bold tabular-nums leading-[1.05] tracking-tight text-white">
                  {card.title}
                </p>
                <p className="mt-2 text-sm font-medium text-white/90">
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
            aria-label={`${i + 1}번째 카드`}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === current ? 18 : 6,
              background:
                i === current ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
