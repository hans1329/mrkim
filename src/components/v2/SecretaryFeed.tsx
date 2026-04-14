import { motion } from "framer-motion";
import { Bot } from "lucide-react";

interface FeedCard {
  id: string;
  type: "sales" | "insight" | "nudge" | "praise";
  title: string;
  bigNumber?: string;
  unit?: string;
  change?: { value: string; positive: boolean };
  body?: string;
  action?: string;
  time: string;
}

const mockCards: FeedCard[] = [
  {
    id: "1",
    type: "sales",
    title: "사장님, 어제 카드매출이",
    bigNumber: "127",
    unit: "만원",
    change: { value: "+23%", positive: true },
    action: "상세 보기",
    time: "5분 전",
  },
  {
    id: "2",
    type: "nudge",
    title: "부가세 마감이 3일 남았어요",
    body: "지금 신고하면 가산세 없이 처리할 수 있어요. 1분이면 끝나요!",
    action: "바로 신고하기",
    time: "1시간 전",
  },
  {
    id: "3",
    type: "insight",
    title: "이번 주 재료비가 평소보다 높아요",
    bigNumber: "89",
    unit: "만원",
    change: { value: "+15%", positive: false },
    body: "지난주 대비 재료비 지출이 증가했어요. 영수증을 확인해볼까요?",
    action: "영수증 확인",
    time: "3시간 전",
  },
  {
    id: "4",
    type: "praise",
    title: "이번 달 최고 매출 갱신!",
    bigNumber: "3,240",
    unit: "만원",
    body: "지난 달 대비 18% 증가했어요. 정말 대단하세요!",
    time: "어제",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, type: "spring" as const, stiffness: 300, damping: 30 },
  }),
};

export const SecretaryFeed = () => {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 no-scrollbar">
      <div className="flex flex-col gap-3">
        {mockCards.map((card, i) => (
          <motion.div
            key={card.id}
            custom={i}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <FeedCardItem card={card} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SecretaryAvatar = () => (
  <div
    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
    style={{
      background: "linear-gradient(135deg, rgba(0,122,255,0.3), rgba(88,86,214,0.3))",
      border: "1px solid rgba(255,255,255,0.1)",
    }}
  >
    <Bot size={16} style={{ color: "rgba(255,255,255,0.7)" }} />
  </div>
);

const FeedCardItem = ({ card }: { card: FeedCard }) => {
  return (
    <div
      className="rounded-2xl px-5 py-4 relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.05)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 24px rgba(0,0,0,0.2)",
      }}
    >
      {/* Subtle inner glow for special cards */}
      {card.type === "praise" && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at top right, rgba(175,82,222,0.08) 0%, transparent 60%)",
          }}
        />
      )}

      <div className="flex items-start gap-3 relative">
        <SecretaryAvatar />
        <div className="flex-1 min-w-0">
          <p className="text-[14px] leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>
            {card.title}
          </p>

          {card.bigNumber && (
            <div className="flex items-baseline gap-1.5 mt-2">
              <span
                className="font-extrabold leading-none"
                style={{
                  fontSize: "42px",
                  letterSpacing: "-1px",
                  background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.7))",
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
            <p
              className="text-sm font-bold mt-1"
              style={{
                background: card.change.positive
                  ? "linear-gradient(135deg, #30D158, #34C759)"
                  : "linear-gradient(135deg, #FF453A, #FF2D55)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {card.change.value} {card.change.positive ? "↑" : "↓"}
            </p>
          )}

          {card.body && (
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              {card.body}
            </p>
          )}

          {card.action && (
            <>
              <div
                className="h-px mt-3 mb-2.5"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />
              <button
                className="text-[13px] font-semibold"
                style={{
                  background: "linear-gradient(135deg, #007AFF, #5856D6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {card.action}
              </button>
            </>
          )}
        </div>
      </div>

      <p className="text-[11px] mt-2 pl-11" style={{ color: "rgba(255,255,255,0.2)" }}>
        {card.time}
      </p>
    </div>
  );
};
