import { motion } from "framer-motion";
import { ReceiptText } from "lucide-react";

/**
 * V3 적격증빙 누락 → 놓친 경비 카드.
 *
 * 색상 아이덴티티: 앰버→핑크 (경비 유출·주의 환기, 공격적이진 않음)
 * 임팩트 포인트: 추상적 "증빙률 87%" 가 아니라 → "놓친 경비 ₩240,000" 으로
 * 돈으로 환산해 표시.
 *
 * 실 데이터 연결 시:
 *  - transactions 중 type=expense AND receipt_attached=false AND amount >= 30,000
 *  - 카드매출은 이미 적격증빙, 현금영수증 미수취 분만 문제
 *  - 미증빙 지출 합 × 한계 세율(평균 20%) = 예상 세액 손실
 */

interface MissedReceiptData {
  coveragePercent: number;
  potentialLossAmount: number;
  missingCount: number;
  missingExpenseTotal: number;
}

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
  const status: "good" | "mid" | "low" =
    coverage >= 95 ? "good" : coverage >= 80 ? "mid" : "low";

  const meta = {
    good: { label: "양호", dotBg: "bg-white", textColor: "text-white" },
    mid: { label: "개선 여지", dotBg: "bg-amber-100", textColor: "text-amber-50" },
    low: { label: "경비 누수 큼", dotBg: "bg-rose-200", textColor: "text-rose-50" },
  }[status];

  return (
    <motion.button
      onClick={onTap}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="relative w-full overflow-hidden rounded-3xl p-5 text-left"
      style={{
        background: "linear-gradient(135deg, #FF9500 0%, #FF2D55 100%)",
        minHeight: 240,
        boxShadow: "0 12px 32px -10px rgba(255,149,0,0.45)",
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
        <ReceiptText className="h-5 w-5 text-white" strokeWidth={1.5} />
      </div>

      <div className="relative">
        {/* Label */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/85">
            놓친 경비
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
          <span className="text-[40px] font-bold tabular-nums leading-[1.05] tracking-tight text-white">
            {formatWon(data.potentialLossAmount)}
          </span>
          <span className="text-xs font-medium text-white/80">예상 손실</span>
        </div>

        {/* Sub */}
        <p className="mt-1 text-[13px] text-white/85">
          미증빙 {data.missingCount}건 · 지출 합계{" "}
          <span className="tabular-nums text-white font-medium">
            {formatWonShort(data.missingExpenseTotal)}
          </span>
        </p>

        {/* Progress bar */}
        <div className="mt-5 h-2.5 rounded-full bg-white/25 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${coverage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-white rounded-full"
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-white/80">증빙 확보율</span>
          <span className="font-semibold tabular-nums text-white">
            {coverage}%
          </span>
        </div>

        {status !== "good" && (
          <p className="mt-3 pt-3 border-t border-white/20 text-xs text-white/85 leading-relaxed">
            증빙 확보 시 비용 인정 → 부가세 공제·소득세 절감.
          </p>
        )}
      </div>
    </motion.button>
  );
}
