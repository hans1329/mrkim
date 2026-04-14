import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Sparkles, Receipt, Car, Coffee, Home } from "lucide-react";

interface TaxTip {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  saving: string;
  description: string;
  gradient: string;
  action?: string;
}

const TAX_TIPS: TaxTip[] = [
  {
    id: "unclassified",
    icon: <Receipt className="w-5 h-5" />,
    title: "놓친 경비 발견",
    subtitle: "미분류 거래 자동 분석",
    saving: "최대 47만원",
    description: "AI가 미분류 거래를 분석해 경비로 잡을 수 있는 항목을 찾아드려요",
    gradient: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
    action: "경비 분류하기",
  },
  {
    id: "car-expense",
    icon: <Car className="w-5 h-5" />,
    title: "차량 유지비 절세",
    subtitle: "업무용 차량 경비 처리",
    saving: "연 최대 1,500만원",
    description: "주유비·보험·수리비를 업무사용 비율로 경비 처리하면 절세할 수 있어요",
    gradient: "linear-gradient(135deg, #30D158 0%, #34C759 100%)",
    action: "차량 경비 등록",
  },
  {
    id: "meal-expense",
    icon: <Coffee className="w-5 h-5" />,
    title: "복리후생비 활용",
    subtitle: "식대·간식비 경비 처리",
    saving: "월 20만원 비과세",
    description: "직원 식대는 월 20만원까지 비과세, 접대비와 분리하면 더 절세돼요",
    gradient: "linear-gradient(135deg, #FF9500 0%, #FF6B00 100%)",
    action: "복리후생 설정",
  },
  {
    id: "home-office",
    icon: <Home className="w-5 h-5" />,
    title: "사업장 경비 최적화",
    subtitle: "임차료·관리비 공제",
    saving: "부가세 환급 가능",
    description: "사업장 임차료의 부가세는 매입세액 공제가 가능해요. 세금계산서를 꼭 받으세요",
    gradient: "linear-gradient(135deg, #AF52DE 0%, #5856D6 100%)",
    action: "세금계산서 확인",
  },
  {
    id: "quarterly-vat",
    icon: <Sparkles className="w-5 h-5" />,
    title: "부가세 예정신고",
    subtitle: "분기별 환급 전략",
    saving: "현금흐름 개선",
    description: "매입이 많은 달에 예정신고하면 환급금을 미리 받아 현금흐름을 개선할 수 있어요",
    gradient: "linear-gradient(135deg, #FF375F 0%, #FF453A 100%)",
    action: "신고 일정 보기",
  },
];

export const TaxSavingCarousel = () => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const paginate = useCallback((newDirection: number) => {
    setDirection(newDirection);
    setCurrent((prev) => {
      const next = prev + newDirection;
      if (next < 0) return TAX_TIPS.length - 1;
      if (next >= TAX_TIPS.length) return 0;
      return next;
    });
  }, []);

  // Auto-advance every 5s
  useEffect(() => {
    const timer = setInterval(() => paginate(1), 5000);
    return () => clearInterval(timer);
  }, [paginate]);

  const tip = TAX_TIPS[current];

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
            절세 포인트
          </span>
        </div>
        <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>
          {current + 1} / {TAX_TIPS.length}
        </span>
      </div>

      {/* Carousel Content */}
      <div className="relative h-[180px] overflow-hidden">
        <AnimatePresence custom={direction} mode="popLayout">
          <motion.div
            key={tip.id}
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
                style={{ background: tip.gradient }}
              >
                <span style={{ color: "rgba(255,255,255,0.95)" }}>{tip.icon}</span>
              </div>
              <div>
                <p className="text-[15px] font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
                  {tip.title}
                </p>
                <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {tip.subtitle}
                </p>
              </div>
              <div
                className="ml-auto px-2.5 py-1 rounded-full text-[11px] font-bold"
                style={{
                  background: "rgba(48,209,88,0.15)",
                  color: "#30D158",
                }}
              >
                {tip.saving}
              </div>
            </div>

            {/* Description */}
            <p
              className="text-[13px] leading-relaxed mb-3"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {tip.description}
            </p>

            {/* Action */}
            {tip.action && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full py-2.5 rounded-xl text-[13px] font-semibold"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                {tip.action}
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
        {TAX_TIPS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
            className="rounded-full transition-all duration-300"
            style={{
              width: i === current ? 16 : 5,
              height: 5,
              background: i === current ? "#FFD60A" : "rgba(255,255,255,0.15)",
            }}
          />
        ))}
      </div>
    </div>
  );
};
