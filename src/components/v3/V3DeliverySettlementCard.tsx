import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

/**
 * V3 배달 정산 카드.
 *
 * V2 의 settlement-forecast hero 카드 포팅. 현재는 mock.
 * 실 연결 시 useFeedCards 의 settlement 데이터 또는 직접 useSettlementForecast 로 교체.
 *
 * 표시 정보:
 *  - 플랫폼 (배민/쿠팡이츠)
 *  - 상태 (D-N / 오늘 / N일 전 입금)
 *  - 입금 예정액 (대형 숫자)
 *  - 정산 건수
 */

type SettlementState =
  | { kind: "upcoming"; daysLeft: number }
  | { kind: "today" }
  | { kind: "past"; daysPast: number };

interface SettlementData {
  platform: "배민" | "쿠팡이츠";
  state: SettlementState;
  amount: number;
  count: number;
  dateLabel: string; // "5월 25일"
  totalPending?: number; // 누적 대기금액 (선택)
  totalDates?: number; // 누적 회차 (선택)
}

// ────────────────── Mock ──────────────────
const mockSettlement: SettlementData = {
  platform: "배민",
  state: { kind: "upcoming", daysLeft: 3 },
  amount: 2_140_800,
  count: 42,
  dateLabel: "4월 25일",
  totalPending: 3_820_000,
  totalDates: 2,
};

function formatStateText(s: SettlementState): { big: string; small: string } {
  if (s.kind === "today") return { big: "오늘", small: "입금 예정" };
  if (s.kind === "past") return { big: `${s.daysPast}일 전`, small: "입금 완료" };
  return { big: `D-${s.daysLeft}`, small: "입금 예정" };
}

function formatWon(n: number): string {
  return `₩${n.toLocaleString("ko-KR")}`;
}

// ────────────────── 컴포넌트 ──────────────────

interface V3DeliverySettlementCardProps {
  onTap?: () => void;
  data?: SettlementData;
}

export function V3DeliverySettlementCard({
  onTap,
  data = mockSettlement,
}: V3DeliverySettlementCardProps) {
  const stateText = formatStateText(data.state);
  const hasMore = (data.totalDates ?? 0) > 1;

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="
        group relative w-full overflow-hidden rounded-3xl p-5 text-left
        shadow-[0_12px_32px_-10px_rgba(42,193,188,0.35)]
      "
      style={{
        background: "linear-gradient(135deg, #2AC1BC 0%, #007AFF 100%)",
      }}
    >
      {/* Top-right radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(circle at 85% 0%, rgba(255,255,255,0.55), transparent 55%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        {/* Left: 라벨 + 상태 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center h-6 px-2 rounded-full bg-white/20 text-[10px] font-semibold text-white backdrop-blur-sm">
              {data.platform} 정산
            </span>
          </div>

          {/* 상태 (D-N / 오늘 / N일 전) */}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums tracking-tight text-white">
              {stateText.big}
            </span>
            <span className="text-xs font-medium text-white/85">
              {stateText.small}
            </span>
          </div>

          {/* 금액 */}
          <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight text-white">
            {formatWon(data.amount)}
          </p>

          {/* 서브 */}
          <p className="mt-1 text-xs font-medium text-white/85">
            {data.dateLabel} · {data.count}건
            {hasMore && data.totalPending && (
              <>
                <span className="mx-1.5 text-white/50">·</span>
                <span>총 {data.totalDates}회 ₩
                  {(data.totalPending / 10000).toFixed(0)}만 대기</span>
              </>
            )}
          </p>
        </div>

        <ChevronRight
          className="h-5 w-5 flex-shrink-0 text-white/80 mt-1 group-active:translate-x-0.5 transition-transform"
          strokeWidth={1.5}
        />
      </div>
    </motion.button>
  );
}
