import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface FeedCard {
  id: string;
  type: "hero" | "standard";
  title: string;
  bigNumber?: string;
  unit?: string;
  change?: { value: string; positive: boolean };
  body?: string;
  action?: string;
  time: string;
  gradient?: string;
}

const mockCards: FeedCard[] = [
  {
    id: "1",
    type: "hero",
    title: "어제 카드매출",
    bigNumber: "127",
    unit: "만원",
    change: { value: "+23%", positive: true },
    action: "상세 보기",
    time: "5분 전",
    gradient: "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
  },
  {
    id: "2",
    type: "standard",
    title: "부가세 마감 D-3",
    body: "지금 신고하면 가산세 없이 처리할 수 있어요.\n1분이면 끝나요!",
    action: "바로 신고하기",
    time: "1시간 전",
  },
  {
    id: "3",
    type: "standard",
    title: "이번 주 재료비",
    bigNumber: "89",
    unit: "만원",
    change: { value: "+15%", positive: false },
    body: "지난주 대비 재료비 지출이 증가했어요",
    action: "영수증 확인",
    time: "3시간 전",
  },
  {
    id: "4",
    type: "standard",
    title: "이번 달 최고 매출 갱신! 🎉",
    bigNumber: "3,240",
    unit: "만원",
    body: "지난 달 대비 18% 증가했어요",
    time: "어제",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: "spring" as const, stiffness: 260, damping: 28 },
  }),
};

export const SecretaryFeed = () => {
  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-32">
      <div className="flex flex-col gap-4">
        {mockCards.map((card, i) => (
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
    </div>
  );
};

// Hero card — full gradient background, big number
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
          전일 대비 {card.change.value}
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

// Standard card — dark glass, clean layout
const StandardCard = ({ card }: { card: FeedCard }) => (
  <div
    className="rounded-2xl overflow-hidden"
    style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.07)",
    }}
  >
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
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
              fontSize: "36px",
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
        <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
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
