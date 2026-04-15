import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Receipt, Car, Coffee, Home, Wallet, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface CarouselCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor?: string;
  badgeBg?: string;
  description: string;
  gradient: string;
  glowColor: string;
  action?: string;
}

// 배민 정산 예정 데이터 조회
function useSettlementForecast() {
  return useQuery({
    queryKey: ["settlement-forecast"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const today = new Date();
      const todayStr = today.toISOString().split("T")[0].replace(/-/g, "");
      const futureStr = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0].replace(/-/g, "");

      const { data: orders } = await supabase
        .from("delivery_orders")
        .select("settle_dt, settle_amt, platform, order_dt")
        .eq("user_id", user.id)
        .gte("settle_dt", todayStr)
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

      const sorted = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      if (sorted.length === 0) return null;

      const [nextDate, nextInfo] = sorted[0];
      const y = nextDate.slice(0, 4);
      const m = nextDate.slice(4, 6);
      const d = nextDate.slice(6, 8);
      const settleDate = new Date(`${y}-${m}-${d}`);
      const daysLeft = Math.ceil((settleDate.getTime() - today.getTime()) / 86400000);

      const totalPending = sorted.reduce((sum, [, info]) => sum + info.total, 0);

      return {
        nextDate: `${Number(m)}/${Number(d)}`,
        daysLeft,
        nextAmount: nextInfo.total,
        nextCount: nextInfo.count,
        totalPending,
        totalDates: sorted.length,
        platform: nextInfo.platform,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

function formatAmount(amount: number): string {
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString()}만원`;
  }
  return `${amount.toLocaleString()}원`;
}

const STATIC_TIPS: CarouselCard[] = [
  {
    id: "unclassified",
    icon: <Receipt className="w-5 h-5" />,
    title: "놓친 경비 발견",
    subtitle: "미분류 거래 자동 분석",
    badge: "최대 47만원",
    description: "AI가 미분류 거래를 분석해 경비로 잡을 수 있는 항목을 찾아드려요",
    gradient: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
    glowColor: "rgba(0,122,255,0.4)",
    action: "경비 분류하기",
  },
  {
    id: "car-expense",
    icon: <Car className="w-5 h-5" />,
    title: "차량 유지비 절세",
    subtitle: "업무용 차량 경비 처리",
    badge: "연 최대 1,500만원",
    description: "주유비·보험·수리비를 업무사용 비율로 경비 처리하면 절세할 수 있어요",
    gradient: "linear-gradient(135deg, #30D158 0%, #34C759 100%)",
    glowColor: "rgba(48,209,88,0.4)",
    action: "차량 경비 등록",
  },
  {
    id: "meal-expense",
    icon: <Coffee className="w-5 h-5" />,
    title: "복리후생비 활용",
    subtitle: "식대·간식비 경비 처리",
    badge: "월 20만원 비과세",
    description: "직원 식대는 월 20만원까지 비과세, 접대비와 분리하면 더 절세돼요",
    gradient: "linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)",
    glowColor: "rgba(255,149,0,0.4)",
    action: "복리후생 설정",
  },
  {
    id: "home-office",
    icon: <Home className="w-5 h-5" />,
    title: "사업장 경비 최적화",
    subtitle: "임차료·관리비 공제",
    badge: "부가세 환급 가능",
    description: "사업장 임차료의 부가세는 매입세액 공제가 가능해요. 세금계산서를 꼭 받으세요",
    gradient: "linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)",
    glowColor: "rgba(175,82,222,0.4)",
    action: "세금계산서 확인",
  },
  {
    id: "quarterly-vat",
    icon: <TrendingUp className="w-5 h-5" />,
    title: "부가세 예정신고",
    subtitle: "분기별 환급 전략",
    badge: "현금흐름 개선",
    description: "매입이 많은 달에 예정신고하면 환급금을 미리 받아 현금흐름을 개선할 수 있어요",
    gradient: "linear-gradient(135deg, #FF375F 0%, #FF453A 100%)",
    glowColor: "rgba(255,55,95,0.4)",
    action: "신고 일정 보기",
  },
];

export const TaxSavingCarousel = () => {
  const { data: settlement, isLoading } = useSettlementForecast();
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cards: CarouselCard[] = useMemo(() => {
    const list: CarouselCard[] = [];

    if (settlement) {
      list.push({
        id: "settlement-forecast",
        icon: <Wallet className="w-5 h-5" />,
        title: `배민 정산 D-${settlement.daysLeft}`,
        subtitle: `${settlement.nextDate} 입금 예정 · ${settlement.nextCount}건`,
        badge: formatAmount(settlement.nextAmount),
        badgeColor: "#007AFF",
        badgeBg: "rgba(0,122,255,0.15)",
        description: settlement.totalDates > 1
          ? `총 ${settlement.totalDates}회, ${formatAmount(settlement.totalPending)} 정산 대기 중이에요`
          : `정산금이 곧 입금돼요. 현금흐름 계획에 참고하세요`,
        gradient: "linear-gradient(135deg, #2AC1BC 0%, #007AFF 100%)",
        glowColor: "rgba(42,193,188,0.4)",
        action: "정산 내역 보기",
      });
    }

    // For infinite loop, we duplicate the cards array
    const allCards = [...list, ...STATIC_TIPS];
    // Return with clones: [last item, ...all, first item]
    // This allows seamless infinite scrolling
    return [
      allCards[allCards.length - 1],
      ...allCards,
      allCards[0],
    ];
  }, [settlement]);

  // Track current slide via scroll position with infinite loop detection
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    
    // Handle infinite loop: reset position without animation when at boundaries
    if (idx >= cards.length) {
      el.scrollTo({ left: el.clientWidth, behavior: "auto" });
      setCurrent(0);
    } else if (idx < 0) {
      el.scrollTo({ left: cards.length * el.clientWidth, behavior: "auto" });
      setCurrent(cards.length - 1);
    } else {
      setCurrent(idx);
    }
  }, [cards.length]);

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    // Add 1 to offset because cards array has clone at index 0
    el.scrollTo({ left: (idx + 1) * el.clientWidth, behavior: "smooth" });
  }, []);

  // Set initial scroll position (skip the clone at index 0)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: scrollRef.current.clientWidth, behavior: "auto" });
    }
  }, []);

  // Adjust current index when cards change
  useEffect(() => {
    if (current >= cards.length - 1) setCurrent(0);
  }, [cards.length, current]);

  if (isLoading) {
    return (
      <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-5 pt-5 pb-3">
          <Skeleton className="h-4 w-20 bg-white/5" />
        </div>
        <div className="px-5 pb-5">
          <Skeleton className="h-12 w-12 rounded-2xl bg-white/5 mb-3" />
          <Skeleton className="h-5 w-3/4 bg-white/5 mb-2" />
          <Skeleton className="h-3 w-full bg-white/5 mb-2" />
          <Skeleton className="h-11 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  // activeCard offset by 1 because cards array has clone at index 0
  const activeCard = cards[current + 1] || cards[1];

  return (
    <div className="relative">
      {/* Gradient border + glow */}
      <div
        className="rounded-3xl p-[1px] relative transition-shadow duration-500"
        style={{
          background: activeCard.gradient,
          boxShadow: `0 0 12px ${activeCard.glowColor}`,
        }}
      >
        <div
          className="rounded-3xl overflow-hidden relative"
          style={{ background: "#0A0A0F" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />

          {/* Header */}
          <div className="relative px-5 pt-4 pb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
              {settlement && current === 0 ? "정산 알림" : "절세 포인트"}
            </span>
            <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>
              {current + 1} / {settlement ? STATIC_TIPS.length + 1 : STATIC_TIPS.length}
            </span>
          </div>

          {/* Native scroll-snap carousel */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto no-scrollbar"
            style={{
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {cards.map((card) => (
              <div
                key={card.id}
                className="w-full shrink-0 px-5 pb-4"
                style={{ scrollSnapAlign: "start" }}
              >
                {/* Icon + Title + Badge */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{
                      background: card.gradient,
                      boxShadow: `0 4px 20px ${card.glowColor}`,
                    }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.95)" }}>{card.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold truncate" style={{ color: "rgba(255,255,255,0.95)" }}>
                      {card.title}
                    </p>
                    <p className="text-[12px] truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {card.subtitle}
                    </p>
                  </div>
                  <div
                    className="shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-tight"
                    style={{
                      background: card.badgeBg || "rgba(48,209,88,0.12)",
                      color: card.badgeColor || "#30D158",
                      border: `1px solid ${card.badgeColor || "rgba(48,209,88,0.2)"}`,
                    }}
                  >
                    {card.badge}
                  </div>
                </div>

                {/* Description */}
                <p
                  className="text-[13px] leading-[1.6] mb-4"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {card.description}
                </p>

                {/* Action Button */}
                {card.action && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-3 rounded-xl text-[13px] font-semibold"
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {card.action}
                  </motion.button>
                )}
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div className="relative flex items-center justify-center gap-1.5 pb-4">
            {cards.map((c, i) => {
              // Skip rendering clones in dot indicators
              if (i === 0 || i === cards.length - 1) return null;
              const originalIdx = i - 1;
              return (
                <button
                  key={`${c.id}-${i}`}
                  onClick={() => scrollTo(originalIdx)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: originalIdx === current ? 18 : 5,
                    height: 5,
                    background: originalIdx === current
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(255,255,255,0.12)",
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
