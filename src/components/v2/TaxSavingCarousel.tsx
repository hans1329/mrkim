import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Receipt, Car, Coffee, Home, Wallet } from "lucide-react";
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
      // 향후 14일 내 정산 예정 주문 조회
      const futureStr = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0].replace(/-/g, "");

      const { data: orders } = await supabase
        .from("delivery_orders")
        .select("settle_dt, settle_amt, platform, order_dt")
        .eq("user_id", user.id)
        .gte("settle_dt", todayStr)
        .lte("settle_dt", futureStr)
        .not("settle_amt", "is", null);

      if (!orders || orders.length === 0) return null;

      // 정산일별 그룹핑
      const byDate = new Map<string, { total: number; count: number; platform: string }>();
      for (const o of orders) {
        if (!o.settle_dt) continue;
        const existing = byDate.get(o.settle_dt) || { total: 0, count: 0, platform: o.platform };
        existing.total += Number(o.settle_amt) || 0;
        existing.count++;
        byDate.set(o.settle_dt, existing);
      }

      // 가장 가까운 정산일
      const sorted = Array.from(byDate.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      if (sorted.length === 0) return null;

      const [nextDate, nextInfo] = sorted[0];
      // YYYYMMDD -> Date
      const y = nextDate.slice(0, 4);
      const m = nextDate.slice(4, 6);
      const d = nextDate.slice(6, 8);
      const settleDate = new Date(`${y}-${m}-${d}`);
      const daysLeft = Math.ceil((settleDate.getTime() - today.getTime()) / 86400000);

      // 전체 미정산 합계
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
    action: "세금계산서 확인",
  },
  {
    id: "quarterly-vat",
    icon: <Sparkles className="w-5 h-5" />,
    title: "부가세 예정신고",
    subtitle: "분기별 환급 전략",
    badge: "현금흐름 개선",
    description: "매입이 많은 달에 예정신고하면 환급금을 미리 받아 현금흐름을 개선할 수 있어요",
    gradient: "linear-gradient(135deg, #FF375F 0%, #FF453A 100%)",
    action: "신고 일정 보기",
  },
];

export const TaxSavingCarousel = () => {
  const { data: settlement, isLoading } = useSettlementForecast();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  // 동적 정산 카드를 맨 앞에 삽입
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
          ? `총 ${settlement.totalDates}회, ${formatAmount(settlement.totalPending)} 정산 대기 중이에요. 현금흐름 계획에 참고하세요`
          : `정산금이 곧 입금돼요. 현금흐름 계획에 참고하세요`,
        gradient: "linear-gradient(135deg, #2AC1BC 0%, #007AFF 100%)",
        action: "정산 내역 보기",
      });
    }

    return [...list, ...STATIC_TIPS];
  }, [settlement]);

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrent((prev) => {
      const next = prev + newDirection;
      if (next < 0) return cards.length - 1;
      if (next >= cards.length) return 0;
      return next;
    });
  }, [cards.length]);

  // Auto-advance every 5s
  useEffect(() => {
    const timer = setInterval(() => paginate(1), 5000);
    return () => clearInterval(timer);
  }, [paginate]);

  // Clamp current if cards length changed
  useEffect(() => {
    if (current >= cards.length) setCurrent(0);
  }, [cards.length, current]);

  if (isLoading) {
    return (
      <div className="rounded-3xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="px-5 pt-4 pb-2">
          <Skeleton className="h-4 w-20 bg-white/5" />
        </div>
        <div className="px-5 pb-4">
          <Skeleton className="h-10 w-10 rounded-2xl bg-white/5 mb-3" />
          <Skeleton className="h-4 w-3/4 bg-white/5 mb-2" />
          <Skeleton className="h-3 w-full bg-white/5 mb-2" />
          <Skeleton className="h-10 w-full rounded-xl bg-white/5" />
        </div>
      </div>
    );
  }

  const card = cards[current];

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 200 : -200, opacity: 0, scale: 0.95 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -200 : 200, opacity: 0, scale: 0.95 }),
  };

  return (
    <div
      className="rounded-3xl overflow-hidden relative"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "#FFD60A" }} />
          <span className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
            {settlement && current === 0 ? "정산 알림" : "절세 포인트"}
          </span>
        </div>
        <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
          {current + 1} / {cards.length}
        </span>
      </div>

      {/* Carousel Content */}
      <div className="relative h-[180px] overflow-hidden">
        <AnimatePresence custom={direction} mode="popLayout">
          <motion.div
            key={card.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 px-5 pb-4"
          >
            {/* Icon + Badge */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: card.gradient }}
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
                className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{
                  background: card.badgeBg || "rgba(48,209,88,0.15)",
                  color: card.badgeColor || "#30D158",
                }}
              >
                {card.badge}
              </div>
            </div>

            {/* Description */}
            <p
              className="text-[13px] leading-relaxed mb-3"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {card.description}
            </p>

            {/* Action */}
            {card.action && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {card.action}
              </motion.button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        <button
          onClick={() => paginate(-1)}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
        </button>
        <button
          onClick={() => paginate(1)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center z-10"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <ChevronRight className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
        </button>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 pb-4">
        {cards.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 16 : 5,
              height: 5,
              background: i === current
                ? (i === 0 && settlement ? "#007AFF" : "#FFD60A")
                : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
};
