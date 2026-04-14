import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, Trophy, Receipt, ArrowRight } from "lucide-react";

interface FeedCard {
  id: string;
  type: "hero" | "insight" | "nudge" | "milestone";
  title: string;
  bigNumber?: string;
  unit?: string;
  change?: { value: string; positive: boolean };
  body?: string;
  action?: string;
  time: string;
  gradient: string;
  accentColor: string;
  icon: React.ReactNode;
  visual?: "chart" | "ring" | "sparkle";
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
    accentColor: "#007AFF",
    icon: <TrendingUp className="w-5 h-5" />,
    visual: "chart",
  },
  {
    id: "2",
    type: "nudge",
    title: "부가세 마감 D-3",
    body: "지금 신고하면 가산세 없이 처리할 수 있어요.\n1분이면 끝나요!",
    action: "바로 신고하기",
    time: "1시간 전",
    gradient: "linear-gradient(135deg, #FF9500 0%, #FF375F 100%)",
    accentColor: "#FF9500",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  {
    id: "3",
    type: "insight",
    title: "이번 주 재료비",
    bigNumber: "89",
    unit: "만원",
    change: { value: "+15%", positive: false },
    body: "지난주 대비 재료비 지출이 증가했어요",
    action: "영수증 확인",
    time: "3시간 전",
    gradient: "linear-gradient(135deg, #5856D6 0%, #AF52DE 100%)",
    accentColor: "#5856D6",
    icon: <Receipt className="w-5 h-5" />,
    visual: "ring",
  },
  {
    id: "4",
    type: "milestone",
    title: "이번 달 최고 매출 갱신!",
    bigNumber: "3,240",
    unit: "만원",
    body: "지난 달 대비 18% 증가했어요 🎉",
    time: "어제",
    gradient: "linear-gradient(135deg, #AF52DE 0%, #FF2D55 100%)",
    accentColor: "#AF52DE",
    icon: <Trophy className="w-5 h-5" />,
    visual: "sparkle",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.1, type: "spring", stiffness: 200, damping: 25 },
  }),
};

// Mini chart visual
const MiniChart = ({ color }: { color: string }) => (
  <svg viewBox="0 0 120 40" className="w-full h-full" preserveAspectRatio="none">
    <defs>
      <linearGradient id={`chartFill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <motion.path
      d="M0,35 Q10,30 20,28 Q30,26 40,20 Q50,14 60,18 Q70,22 80,12 Q90,6 100,8 Q110,10 120,4"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    />
    <motion.path
      d="M0,35 Q10,30 20,28 Q30,26 40,20 Q50,14 60,18 Q70,22 80,12 Q90,6 100,8 Q110,10 120,4 L120,40 L0,40 Z"
      fill={`url(#chartFill-${color.replace("#", "")})`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.5 }}
    />
  </svg>
);

// Ring progress visual
const RingProgress = ({ color, percent = 72 }: { color: string; percent?: number }) => {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg viewBox="0 0 70 70" className="w-full h-full">
      <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
      <motion.circle
        cx="35" cy="35" r={r}
        fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1, ease: "easeOut" }}
        transform="rotate(-90 35 35)"
      />
      <text x="35" y="38" textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="14" fontWeight="bold">
        {percent}%
      </text>
    </svg>
  );
};

// Sparkle particles
const SparkleParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 rounded-full"
        style={{
          background: ["#FFD60A", "#FF375F", "#AF52DE", "#34C759", "#007AFF", "#FF9500"][i],
          left: `${15 + i * 15}%`,
          top: `${20 + (i % 3) * 25}%`,
        }}
        animate={{
          y: [-4, 4, -4],
          opacity: [0.3, 0.8, 0.3],
          scale: [0.8, 1.3, 0.8],
        }}
        transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
      />
    ))}
  </div>
);

export const SecretaryFeed = () => {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 no-scrollbar">
      {/* Stories-style time label */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
        <span className="text-[11px] font-medium px-2" style={{ color: "rgba(255,255,255,0.25)" }}>
          오늘의 비서 브리핑
        </span>
        <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

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

// Full-width hero card — Instagram-style visual impact
const HeroCard = ({ card }: { card: FeedCard }) => (
  <div
    className="rounded-3xl overflow-hidden relative"
    style={{
      background: card.gradient,
      boxShadow: `0 8px 40px ${card.accentColor}30, 0 2px 8px rgba(0,0,0,0.3)`,
    }}
  >
    {/* Background pattern */}
    <div
      className="absolute inset-0 pointer-events-none opacity-20"
      style={{
        backgroundImage: `radial-gradient(circle at 80% 20%, rgba(255,255,255,0.3) 0%, transparent 50%),
                          radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%)`,
      }}
    />

    <div className="relative px-6 pt-5 pb-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.2)" }}
          >
            {card.icon}
          </div>
          <span className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>
            {card.title}
          </span>
        </div>
        <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.5)" }}>{card.time}</span>
      </div>

      {/* Big number */}
      <div className="flex items-end justify-between mt-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="font-black leading-none tracking-tight"
              style={{ fontSize: "56px", color: "rgba(255,255,255,0.95)" }}
            >
              {card.bigNumber}
            </span>
            <span className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
              {card.unit}
            </span>
          </div>
          {card.change && (
            <div className="flex items-center gap-1 mt-1.5">
              {card.change.positive ? (
                <TrendingUp className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.8)" }} />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.8)" }} />
              )}
              <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
                전일 대비 {card.change.value}
              </span>
            </div>
          )}
        </div>
        {/* Mini chart */}
        <div className="w-28 h-12 opacity-80">
          <MiniChart color="rgba(255,255,255,0.6)" />
        </div>
      </div>

      {/* Action */}
      {card.action && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="mt-4 w-full py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-1.5"
          style={{
            background: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(12px)",
            color: "rgba(255,255,255,0.95)",
          }}
        >
          {card.action}
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
      )}
    </div>
  </div>
);

// Standard card — glass morphism with accent
const StandardCard = ({ card }: { card: FeedCard }) => (
  <div
    className="rounded-2xl overflow-hidden relative group"
    style={{
      background: "rgba(255,255,255,0.04)",
      backdropFilter: "blur(24px)",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.15)",
    }}
  >
    {/* Top accent bar */}
    <div className="h-[3px]" style={{ background: card.gradient }} />

    {/* Sparkle overlay for milestone */}
    {card.visual === "sparkle" && <SparkleParticles />}

    <div className="relative px-5 py-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${card.accentColor}25, ${card.accentColor}10)`,
              border: `1px solid ${card.accentColor}30`,
            }}
          >
            <div style={{ color: card.accentColor }}>{card.icon}</div>
          </div>
          <p className="text-[14px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
            {card.title}
          </p>
        </div>
        <span className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>
          {card.time}
        </span>
      </div>

      {/* Content row with optional visual */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex-1">
          {card.bigNumber && (
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-extrabold leading-none tracking-tight"
                style={{
                  fontSize: "38px",
                  background: card.gradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {card.bigNumber}
              </span>
              <span className="text-base font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                {card.unit}
              </span>
            </div>
          )}
          {card.change && (
            <div className="flex items-center gap-1 mt-1">
              {card.change.positive ? (
                <TrendingUp className="w-3 h-3" style={{ color: "#30D158" }} />
              ) : (
                <TrendingDown className="w-3 h-3" style={{ color: "#FF453A" }} />
              )}
              <span
                className="text-[12px] font-bold"
                style={{ color: card.change.positive ? "#30D158" : "#FF453A" }}
              >
                {card.change.value}
              </span>
            </div>
          )}
          {card.body && (
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              {card.body}
            </p>
          )}
        </div>

        {/* Visual element */}
        {card.visual === "ring" && (
          <div className="w-16 h-16 flex-shrink-0 ml-3">
            <RingProgress color={card.accentColor} />
          </div>
        )}
      </div>

      {/* Action button */}
      {card.action && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="mt-3.5 flex items-center gap-1 text-[13px] font-semibold"
          style={{
            background: card.gradient,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {card.action}
          <ArrowRight className="w-3.5 h-3.5" style={{ color: card.accentColor }} />
        </motion.button>
      )}
    </div>
  </div>
);
