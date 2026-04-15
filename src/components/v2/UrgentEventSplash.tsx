import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCountUp } from "@/hooks/useCountUp";

interface UrgentEvent {
  id: string;
  type: "vat-deadline" | "salary" | "settlement";
  title: string;
  subtitle: string;
  amount?: number;
  unit?: string;
  dDay: number;
  gradient: string;
  icon: string;
}

function getUrgentEvents(feedCards: Array<{ id: string; bigNumber?: string; unit?: string; body?: string; title: string }>): UrgentEvent[] {
  const events: UrgentEvent[] = [];

  for (const card of feedCards) {
    // 부가세 마감 D-3 이내
    if (card.id === "vat-deadline" && card.title.includes("D-")) {
      const match = card.title.match(/D-(\d+)/);
      const dDay = match ? Number(match[1]) : 99;
      if (dDay <= 3) {
        events.push({
          id: card.id,
          type: "vat-deadline",
          title: "부가세 마감 임박",
          subtitle: card.body || "지금 신고하면 가산세를 피할 수 있어요",
          dDay,
          gradient: "linear-gradient(135deg, #FF9500 0%, #FF453A 100%)",
          icon: "🔥",
        });
      }
    }

    // 급여일 D-1
    if (card.id.startsWith("salary-d1")) {
      const amount = card.bigNumber ? Number(card.bigNumber.replace(/,/g, "")) : 0;
      events.push({
        id: card.id,
        type: "salary",
        title: "내일 급여 지급일",
        subtitle: card.body || "계좌 잔액을 확인하세요",
        amount,
        unit: card.unit,
        dDay: 1,
        gradient: "linear-gradient(135deg, #FF453A 0%, #FF6B6B 100%)",
        icon: "💰",
      });
    }
  }

  return events;
}

const SPLASH_DURATION = 2800; // ms

export const UrgentEventSplash = ({
  feedCards,
  onComplete,
}: {
  feedCards: Array<{ id: string; bigNumber?: string; unit?: string; body?: string; title: string }>;
  onComplete: () => void;
}) => {
  const [visible, setVisible] = useState(false);
  const [event, setEvent] = useState<UrgentEvent | null>(null);

  useEffect(() => {
    const events = getUrgentEvents(feedCards);
    if (events.length === 0) {
      onComplete();
      return;
    }

    // Show only the most urgent one
    const urgent = events[0];
    
    // Check sessionStorage to not show again in same session
    const key = `splash_shown_${urgent.id}_${new Date().toDateString()}`;
    if (sessionStorage.getItem(key)) {
      onComplete();
      return;
    }

    setEvent(urgent);
    setVisible(true);
    sessionStorage.setItem(key, "1");

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500); // wait for exit animation
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [feedCards, onComplete]);

  const countUpValue = useCountUp(event?.amount || 0, {
    duration: 1000,
    delay: 400,
    enabled: visible && !!event?.amount,
  });

  return (
    <AnimatePresence>
      {visible && event && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: event.gradient }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4 }}
          onClick={() => {
            setVisible(false);
            setTimeout(onComplete, 300);
          }}
        >
          {/* Radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.2) 0%, transparent 60%)",
            }}
          />

          <motion.div
            className="relative flex flex-col items-center gap-4 px-8 text-center"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          >
            {/* Icon */}
            <motion.span
              className="text-5xl"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 15 }}
            >
              {event.icon}
            </motion.span>

            {/* D-Day badge */}
            <motion.div
              className="px-4 py-1.5 rounded-full text-sm font-black"
              style={{
                background: "rgba(255,255,255,0.25)",
                color: "white",
                backdropFilter: "blur(10px)",
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 400, damping: 20 }}
            >
              D-{event.dDay}
            </motion.div>

            {/* Title */}
            <h1
              className="text-2xl font-black"
              style={{ color: "rgba(255,255,255,0.95)" }}
            >
              {event.title}
            </h1>

            {/* Amount (if applicable) */}
            {event.amount && event.amount > 0 && (
              <motion.div
                className="flex items-baseline gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <span
                  className="font-black tracking-tight"
                  style={{ fontSize: "48px", color: "white" }}
                >
                  {countUpValue}
                </span>
                <span className="text-xl font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {event.unit}
                </span>
              </motion.div>
            )}

            {/* Subtitle */}
            <p className="text-base font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
              {event.subtitle}
            </p>

            {/* Tap hint */}
            <motion.p
              className="text-xs mt-6"
              style={{ color: "rgba(255,255,255,0.35)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              탭하여 넘기기
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
