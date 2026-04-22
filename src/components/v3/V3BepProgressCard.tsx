import { motion } from "framer-motion";
import { Target } from "lucide-react";

/**
 * V3 손익분기점(BEP) 달성 진행률 카드.
 *
 * 색상 아이덴티티: 에메랄드→시안 (성장·달성)
 * 진행률 바는 흰색(고대비)으로 카드 안에서 명확히 표시.
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

const STATUS_META: Record<Status, { label: string; dotBg: string; textColor: string }> = {
  success: { label: "거의 달성", dotBg: "bg-white", textColor: "text-white" },
  warning: { label: "진행 중", dotBg: "bg-amber-200", textColor: "text-amber-100" },
  caution: { label: "속도 필요", dotBg: "bg-rose-200", textColor: "text-rose-100" },
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
      className="relative w-full overflow-hidden rounded-3xl p-5 text-left"
      style={{
        background: "linear-gradient(135deg, #30D158 0%, #5AC8FA 100%)",
        minHeight: 240,
        boxShadow: "0 12px 32px -10px rgba(48,209,88,0.45)",
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

      {/* Top-right icon */}
      <div className="pointer-events-none absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
        <Target className="h-5 w-5 text-white" strokeWidth={1.5} />
      </div>

      <div className="relative">
        {/* Label */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/85">
            이번달 손익분기점
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 h-5 rounded-full bg-white/20 backdrop-blur-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotBg}`} />
            <span className={`text-[10px] font-semibold ${meta.textColor}`}>
              {meta.label}
            </span>
          </span>
        </div>

        {/* Main */}
        <div className="mt-3 flex items-baseline gap-2">
          {achieved ? (
            <>
              <span className="text-[48px] font-bold tabular-nums leading-[1.05] tracking-tight text-white">
                달성
              </span>
              <span className="text-sm text-white/85">이번달 BEP 돌파</span>
            </>
          ) : (
            <>
              <span className="text-[40px] font-bold tabular-nums leading-[1.05] tracking-tight text-white">
                {formatWon(remaining)}
              </span>
              <span className="text-xs font-medium text-white/80">
                남음 · D-{data.daysLeftInMonth}
              </span>
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-5 h-2.5 rounded-full bg-white/25 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-white rounded-full"
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-white/80 tabular-nums">
            {formatWon(data.achieved)} / {formatWon(data.targetBep)}
          </span>
          <span className="font-semibold tabular-nums text-white">
            {percent}%
          </span>
        </div>

        {!achieved && (
          <p className="mt-3 pt-3 border-t border-white/20 text-xs text-white/85 leading-relaxed">
            BEP 달성 후의 매출은 대부분 이익이에요.
          </p>
        )}
      </div>
    </motion.button>
  );
}
