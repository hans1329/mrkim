import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

/**
 * V3 적격증빙 누락 → 놓친 경비 카드.
 *
 * 임팩트 포인트: 추상적인 "증빙률 87%" 가 아니라
 *  → "놓친 경비 ₩240,000" 으로 돈으로 환산해 표시.
 *
 * 실 데이터 연결 시:
 *  - transactions 중 type=expense AND receipt_attached=false AND amount >= 30,000
 *  - 카드매출: 이미 적격증빙, 현금영수증 미수취 분만 문제
 *  - 미증빙 지출 합 × 한계 세율(평균 20%) = 예상 세액 손실
 *  - 누락 건수 = 위 조건 행 카운트
 */

interface MissedReceiptData {
  /** 적격증빙 확보율 (0~100) */
  coveragePercent: number;
  /** 미증빙으로 놓친 예상 세액 손실 (원) */
  potentialLossAmount: number;
  /** 미증빙 지출 건수 */
  missingCount: number;
  /** 미증빙 지출 총액 (원) */
  missingExpenseTotal: number;
}

// Mock
const mockData: MissedReceiptData = {
  coveragePercent: 87,
  potentialLossAmount: 240_000,
  missingCount: 18,
  missingExpenseTotal: 1_200_000,
};

function formatWon(n: number): string {
  return `₩${n.toLocaleString("ko-KR")}`;
}

function formatWonShort(n: number): string {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `₩${(n / 10_000).toFixed(0)}만`;
  return `₩${n.toLocaleString("ko-KR")}`;
}

interface V3MissedReceiptCardProps {
  onTap?: () => void;
  data?: MissedReceiptData;
}

export function V3MissedReceiptCard({
  onTap,
  data = mockData,
}: V3MissedReceiptCardProps) {
  const coverage = Math.min(100, Math.max(0, data.coveragePercent));
  // 확보율에 따른 색상: 95%+ 녹색, 80-95% 앰버, 80미만 오렌지
  const status: "good" | "mid" | "low" =
    coverage >= 95 ? "good" : coverage >= 80 ? "mid" : "low";

  const meta = {
    good: {
      accent: "text-emerald-400",
      bar: "bg-gradient-to-r from-emerald-400 to-emerald-300",
      glow: "rgba(52,211,153,0.22)",
      moodLabel: "양호",
    },
    mid: {
      accent: "text-amber-400",
      bar: "bg-gradient-to-r from-amber-400 to-orange-300",
      glow: "rgba(251,191,36,0.28)",
      moodLabel: "개선 여지",
    },
    low: {
      accent: "text-rose-400",
      bar: "bg-gradient-to-r from-rose-400 to-orange-400",
      glow: "rgba(244,63,94,0.32)",
      moodLabel: "경비 누수 큼",
    },
  }[status];

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="
        relative w-full overflow-hidden rounded-3xl p-5 text-left
        border border-white/[0.08]
        bg-white/[0.04] backdrop-blur-xl
      "
      style={{
        boxShadow: `0 8px 28px -12px ${meta.glow}, inset 0 1px 0 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
              놓친 경비 (증빙 미확보)
            </span>
            <span className={`text-[10px] font-semibold ${meta.accent}`}>
              {meta.moodLabel}
            </span>
          </div>

          {/* Main: 예상 세액 손실 */}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums tracking-tight text-white">
              {formatWon(data.potentialLossAmount)}
            </span>
            <span className="text-xs font-medium text-white/60">예상 손실</span>
          </div>

          {/* Sub */}
          <p className="mt-1 text-xs text-white/55 leading-relaxed">
            미증빙 {data.missingCount}건 · 지출 합계{" "}
            <span className="tabular-nums text-white/75">
              {formatWonShort(data.missingExpenseTotal)}
            </span>
          </p>

          {/* Progress bar */}
          <div className="mt-4 h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${coverage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full ${meta.bar} rounded-full`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-white/50">증빙 확보율</span>
            <span className={`font-semibold tabular-nums ${meta.accent}`}>
              {coverage}%
            </span>
          </div>

          {status !== "good" && (
            <p className="mt-3 text-xs text-white/55 leading-relaxed">
              증빙 확보 시 비용 인정 → 부가세 공제·소득세 절감.
            </p>
          )}
        </div>

        <ChevronRight
          className="h-4 w-4 text-white/30 flex-shrink-0 mt-1"
          strokeWidth={1.5}
        />
      </div>
    </motion.button>
  );
}
