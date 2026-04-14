import { motion } from "framer-motion";

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
    title: "🎉 이번 달 최고 매출 갱신!",
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
    transition: { delay: i * 0.08, type: "spring", stiffness: 300, damping: 30 },
  }),
};

export const SecretaryFeed = () => {
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-28 no-scrollbar">
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

const FeedCardItem = ({ card }: { card: FeedCard }) => {
  return (
    <div
      className="rounded-2xl px-5 py-4 relative"
      style={{
        background: "#FFFFFF",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
      }}
    >
      {/* Avatar & header */}
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm"
          style={{
            background: "linear-gradient(135deg, #007AFF, #5856D6)",
            color: "#fff",
          }}
        >
          비
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] leading-snug" style={{ color: "#222" }}>
            {card.title}
          </p>

          {/* Big number */}
          {card.bigNumber && (
            <div className="flex items-baseline gap-1 mt-2">
              <span
                className="font-extrabold leading-none"
                style={{ fontSize: "42px", color: "#222", letterSpacing: "-1px" }}
              >
                {card.bigNumber}
              </span>
              <span className="text-base font-medium" style={{ color: "#757575" }}>
                {card.unit}
              </span>
            </div>
          )}

          {/* Change indicator */}
          {card.change && (
            <p
              className="text-sm font-bold mt-1"
              style={{
                background: card.change.positive
                  ? "linear-gradient(135deg, #34C759, #30D158)"
                  : "linear-gradient(135deg, #FF3B30, #FF2D55)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {card.change.value} {card.change.positive ? "↑" : "↓"}
            </p>
          )}

          {/* Body text */}
          {card.body && (
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "#757575" }}>
              {card.body}
            </p>
          )}

          {/* Action */}
          {card.action && (
            <>
              <div className="h-px mt-3 mb-2" style={{ background: "#EBEBEB" }} />
              <button
                className="text-[13px] font-semibold"
                style={{
                  background: "linear-gradient(135deg, #007AFF, #5856D6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                📊 {card.action}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Timestamp */}
      <p
        className="text-[11px] mt-2 pl-11"
        style={{ color: "#AEAEB2" }}
      >
        {card.time}
      </p>
    </div>
  );
};
