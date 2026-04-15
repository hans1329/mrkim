import { useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { ArrowRight, Link2 } from "lucide-react";
import { useConnectionDrawer } from "@/contexts/ConnectionDrawerContext";
import { useFeedCards, type FeedCard } from "@/hooks/useFeedCards";
import { Skeleton } from "@/components/ui/skeleton";


const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: "spring" as const, stiffness: 260, damping: 28 },
  }),
};

export const SecretaryFeed = () => {
  const { todayCards, historyCards, isLoading } = useFeedCards();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  if (isLoading) {
    return <FeedSkeleton />;
  }

  const hasToday = todayCards.length > 0;
  const visibleHistory = historyCards.filter((c) => !dismissed.has(c.id));
  const hasHistory = visibleHistory.length > 0;

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-32">
      {/* 오늘의 브리핑 */}
      {hasToday && (
        <section>
          <SectionHeader label="오늘의 브리핑" accent />
          <div className="flex flex-col gap-4 mt-3">
            {todayCards.map((card, i) => (
              <motion.div
                key={card.id}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
              >
                {card.type === "hero" ? (
                  <HeroCard card={card} />
                ) : (
                  <StandardCard card={card} />
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 데이터가 하나도 없을 때 */}
      {!hasToday && !hasHistory && <EmptyFeed />}

      {/* 지난 기록 */}
      {hasHistory && (
        <section className="mt-2">
          <SectionHeader label="지난 기록" />
          <div className="flex flex-col gap-3 mt-3">
            {visibleHistory.map((card, i) => (
              <SwipeToDismiss key={card.id} cardId={card.id} onDismiss={handleDismiss}>
                <motion.div
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-40px" }}
                  variants={cardVariants}
                >
                  <StandardCard card={card} compact />
                </motion.div>
              </SwipeToDismiss>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// Swipe-to-dismiss wrapper
const SWIPE_THRESHOLD = 120;

const SwipeToDismiss = ({
  cardId,
  onDismiss,
  children,
}: {
  cardId: string;
  onDismiss: (id: string) => void;
  children: React.ReactNode;
}) => {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-SWIPE_THRESHOLD * 1.5, 0, SWIPE_THRESHOLD * 1.5], [0, 1, 0]);
  const scale = useTransform(x, [-SWIPE_THRESHOLD * 1.5, 0, SWIPE_THRESHOLD * 1.5], [0.95, 1, 0.95]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > SWIPE_THRESHOLD) {
      const direction = info.offset.x > 0 ? 400 : -400;
      animate(x, direction, { duration: 0.25 }).then(() => onDismiss(cardId));
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
    }
  };

  return (
    <motion.div
      style={{ x, opacity, scale }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </motion.div>
  );
};

// Section header
const SectionHeader = ({ label, accent }: { label: string; accent?: boolean }) => (
  <div className="flex items-center gap-2">
    {accent && (
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: "#007AFF" }}
      />
    )}
    <span
      className="text-[13px] font-semibold tracking-wide"
      style={{ color: accent ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}
    >
      {label}
    </span>
  </div>
);

// Empty state
const EmptyFeed = () => {
  const { openDrawer } = useConnectionDrawer();

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-5">
      <p className="text-[15px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
        데이터를 연동하면 비서가 브리핑을 시작해요
      </p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => openDrawer()}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[14px] font-semibold"
        style={{
          background: "linear-gradient(135deg, rgba(0,122,255,0.15) 0%, rgba(88,86,214,0.1) 100%)",
          color: "rgba(255,255,255,0.9)",
          border: "1px solid rgba(0,122,255,0.25)",
        }}
      >
        <Link2 className="w-4 h-4" style={{ color: "#007AFF" }} />
        계좌 · 카드 · 홈택스 연동하기
        <ArrowRight className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
      </motion.button>
    </div>
  );
};

// Loading skeleton
const FeedSkeleton = () => (
  <div className="flex flex-col gap-4 px-4 pt-4 pb-32">
    <Skeleton className="h-4 w-24 bg-white/5" />
    <Skeleton className="h-40 w-full rounded-3xl bg-white/5" />
    <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
    <Skeleton className="h-24 w-full rounded-2xl bg-white/5" />
  </div>
);

// Hero card
const HeroCard = ({ card }: { card: FeedCard }) => (
  <div
    className="rounded-3xl overflow-hidden relative"
    style={{
      background: card.gradient,
      boxShadow: "0 8px 40px rgba(0,122,255,0.2), 0 2px 8px rgba(0,0,0,0.3)",
    }}
  >
    <div
      className="absolute inset-0 pointer-events-none opacity-20"
      style={{
        backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%)",
      }}
    />
    <div className="relative px-6 pt-5 pb-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
          {card.title}
        </span>
        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{card.time}</span>
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span
          className="font-black leading-none tracking-tight"
          style={{ fontSize: "52px", color: "rgba(255,255,255,0.95)" }}
        >
          {card.bigNumber}
        </span>
        <span className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
          {card.unit}
        </span>
      </div>

      {card.change && (
        <p className="text-sm font-semibold mt-2" style={{ color: "rgba(255,255,255,0.8)" }}>
          전월 대비 {card.change.value}
        </p>
      )}

      {card.body && (
        <p className="text-[13px] mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
          {card.body}
        </p>
      )}

      {card.action && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="mt-4 w-full py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center"
          style={{
            background: "rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          {card.action}
        </motion.button>
      )}
    </div>
  </div>
);

// Standard card
const StandardCard = ({ card, compact }: { card: FeedCard; compact?: boolean }) => (
  <div
    className={`overflow-hidden ${compact ? "rounded-xl" : "rounded-2xl"}`}
    style={{
      background: card.gradient || "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}
  >
    <div className={compact ? "px-4 py-3" : "px-5 py-4"}>
      <div className="flex items-center justify-between">
        <p
          className={`font-semibold ${compact ? "text-[13px]" : "text-[14px]"}`}
          style={{ color: card.gradient ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.9)" }}
        >
          {card.title}
        </p>
        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          {card.time}
        </span>
      </div>

      {card.bigNumber && (
        <div className="flex items-baseline gap-1.5 mt-2">
          <span
            className="font-extrabold leading-none tracking-tight"
            style={{
              fontSize: compact ? "28px" : "36px",
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {card.bigNumber}
          </span>
          <span className="text-base font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            {card.unit}
          </span>
          {card.change && (
            <span
              className="text-[12px] font-bold ml-1"
              style={{ color: card.change.positive ? "#30D158" : "#FF453A" }}
            >
              {card.change.value} {card.change.positive ? "↑" : "↓"}
            </span>
          )}
        </div>
      )}

      {card.body && (
        <p
          className="text-[13px] mt-2 leading-relaxed"
          style={{ color: card.gradient ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)" }}
        >
          {card.body}
        </p>
      )}

      {card.action && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="mt-3 flex items-center gap-1 text-[13px] font-semibold"
          style={{ color: "#007AFF" }}
        >
          {card.action}
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
      )}
    </div>
  </div>
);
