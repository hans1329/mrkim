import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

/**
 * V3 손익분기점(BEP) 달성 진행률 카드.
 *
 * 매달 고정비+변동비 합계를 BEP 로 잡고, 이번달 누적 매출이 얼마나 도달했는지 표시.
 * 달성 후의 매출은 전부 이익.
 *
 * 실 데이터 연결 시:
 *  - targetBep = 고정비(월세·인건비·구독료) + 평균 변동비
 *  - achieved = 이번달 1일~오늘 누적 매출 (transactions.type=income + delivery_orders)
 */

interface BepData {
  targetBep: number;
  achieved: number;
  daysLeftInMonth: number;
}

// Mock
const mockBep: BepData = {
  targetBep: 5_200_000,
  achieved: 3_740_000,
  daysLeftInMonth: 9,
};

type Status = "success" | "warning" | "caution";
function classifyStatus(percent: number): Status {
  if (percent >= 80) return "success";
  if (percent >= 50) return "warning";
  return "caution";
}

const STATUS_META: Record<Status, { label: string; accent: string; bar: string; glow: string }> = {
  success: {
    label: "거의 달성",
    accent: "text-emerald-400",
    bar: "bg-gradient-to-r from-emerald-400 to-emerald-300",
    glow: "rgba(52, 211, 153, 0.25)",
  },
  warning: {
    label: "진행 중",
    accent: "text-amber-400",
    bar: "bg-gradient-to-r from-amber-400 to-orange-300",
    glow: "rgba(251, 191, 36, 0.25)",
  },
  caution: {
    label: "속도 필요",
    accent: "text-rose-400",
    bar: "bg-gradient-to-r from-rose-400 to-orange-400",
    glow: "rgba(244, 63, 94, 0.3)",
  },
};

function formatWon(n: number): string {
  return `₩${n.toLocaleString("ko-KR")}`;
}

interface V3BepProgressCardProps {
  onTap?: () => void;
  data?: BepData;
}

export function V3BepProgressCard({ onTap, data = mockBep }: V3BepProgressCardProps) {
  const remaining = Math.max(0, data.targetBep - data.achieved);
  const percent = Math.min(100, Math.round((data.achieved / data.targetBep) * 100));
  const status = classifyStatus(percent);
  const meta = STATUS_META[status];
  const achieved = remaining === 0;

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="
        relative w-full overflow-hidden rounded-3xl p-5 text-left
        border border-white/[0.08]
        bg-white/[0.04] backdrop-blur-xl
        shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
      "
      style={{
        boxShadow: `0 8px 28px -12px ${meta.glow}, inset 0 1px 0 0 rgba(255,255,255,0.05)`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
              이번달 손익분기점
            </span>
            <span className={`text-[10px] font-semibold ${meta.accent}`}>
              {meta.label}
            </span>
          </div>

          {/* Main: 남은 금액 + D-N */}
          <div className="mt-3 flex items-baseline gap-2">
            {achieved ? (
              <>
                <span className="text-4xl font-bold tabular-nums tracking-tight text-emerald-300">
                  달성
                </span>
                <span className="text-sm text-white/60">이번달 BEP 돌파</span>
              </>
            ) : (
              <>
                <span className="text-4xl font-bold tabular-nums tracking-tight text-white">
                  {formatWon(remaining)}
                </span>
                <span className="text-xs font-medium text-white/60">
                  남음 · D-{data.daysLeftInMonth}
                </span>
              </>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-full ${meta.bar} rounded-full`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-white/50 tabular-nums">
              {formatWon(data.achieved)} / {formatWon(data.targetBep)}
            </span>
            <span className={`font-semibold tabular-nums ${meta.accent}`}>
              {percent}%
            </span>
          </div>

          {!achieved && (
            <p className="mt-3 text-xs text-white/55 leading-relaxed">
              BEP 달성 후의 매출은 대부분 이익이에요.
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
