import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

/**
 * V3 다음 주 현금 전망 카드.
 *
 * 다음 7일간의 일별 예상 잔고 중 최저치와 위험 이벤트를 노출.
 * 임팩트: "자금 끊어질 것" 을 사전 경보 — 소상공인이 가장 필요로 하는 신호.
 *
 * 실 데이터 연결 시:
 *  - 현재 잔고 = 연동된 은행 계좌 합계
 *  - 입금 예정 = 배민/쿠팡이츠 정산, 홈택스 세금계산서 미입금, 예상 매출
 *  - 출금 예정 = 카드 결제일, 자동이체(월세/구독), 급여일, 세금 납부일
 *  - 일별 시뮬레이션 → 최저 잔고와 그 날짜·이유 추출
 */

interface CashDay {
  day: string; // "월" | "화" ... (7일치)
  date: string; // "4/23"
  balance: number;
  event?: string; // "급여일", "카드결제", "월세" 등
}

interface CashRunwayData {
  currentBalance: number;
  forecast: CashDay[]; // 7일
  minBalance: number;
  minDayIdx: number; // 최저 잔고 날의 index
  risk: "safe" | "warning" | "danger";
  warningEventLabel?: string; // "급여일 직전" 같은 상황 설명
}

// Mock — 실제는 useQuery 로 교체
const mockCashRunway: CashRunwayData = {
  currentBalance: 12_400_000,
  forecast: [
    { day: "화", date: "4/23", balance: 12_400_000 },
    { day: "수", date: "4/24", balance: 11_800_000, event: "구독" },
    { day: "목", date: "4/25", balance: 13_940_000, event: "배민정산" },
    { day: "금", date: "4/26", balance: 13_220_000 },
    { day: "토", date: "4/27", balance: 9_100_000, event: "카드결제" },
    { day: "일", date: "4/28", balance: 320_000, event: "급여일" },
    { day: "월", date: "4/29", balance: 2_100_000 },
  ],
  minBalance: 320_000,
  minDayIdx: 5,
  risk: "danger",
  warningEventLabel: "급여일 직전",
};

const RISK_META: Record<
  CashRunwayData["risk"],
  { label: string; accent: string; bar: string; glow: string; dot: string }
> = {
  safe: {
    label: "여유 있음",
    accent: "text-emerald-400",
    bar: "bg-emerald-400",
    glow: "rgba(52,211,153,0.25)",
    dot: "bg-emerald-400",
  },
  warning: {
    label: "주의",
    accent: "text-amber-400",
    bar: "bg-amber-400",
    glow: "rgba(251,191,36,0.3)",
    dot: "bg-amber-400",
  },
  danger: {
    label: "위험",
    accent: "text-rose-400",
    bar: "bg-rose-400",
    glow: "rgba(244,63,94,0.35)",
    dot: "bg-rose-400",
  },
};

function formatWon(n: number): string {
  return `₩${n.toLocaleString("ko-KR")}`;
}

function formatWonShort(n: number): string {
  if (n >= 100_000_000) return `₩${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `₩${(n / 10_000).toFixed(0)}만`;
  return `₩${n.toLocaleString("ko-KR")}`;
}

interface V3CashRunwayCardProps {
  onTap?: () => void;
  data?: CashRunwayData;
}

export function V3CashRunwayCard({ onTap, data = mockCashRunway }: V3CashRunwayCardProps) {
  const meta = RISK_META[data.risk];
  const maxBalance = Math.max(...data.forecast.map((d) => d.balance));

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
              다음 주 현금 전망
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              <span className={`text-[10px] font-semibold ${meta.accent}`}>
                {meta.label}
              </span>
            </span>
          </div>

          {/* Main: 최저 예상 잔고 */}
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-bold tabular-nums tracking-tight text-white">
              {formatWon(data.minBalance)}
            </span>
            <span className="text-xs font-medium text-white/60">최저 예상</span>
          </div>

          {/* 이벤트 설명 */}
          {data.warningEventLabel && (
            <p className={`mt-1 text-xs font-medium ${meta.accent}`}>
              {data.forecast[data.minDayIdx].date} {data.forecast[data.minDayIdx].day}요일 ·{" "}
              {data.warningEventLabel}
            </p>
          )}

          {/* 7일 미니 타임라인 */}
          <div className="mt-4 flex items-end justify-between gap-1 h-12">
            {data.forecast.map((d, i) => {
              const h = Math.max(6, (d.balance / maxBalance) * 48);
              const isMin = i === data.minDayIdx;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: h }}
                    transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
                    className={`w-full rounded-sm ${
                      isMin ? meta.bar : "bg-white/[0.12]"
                    }`}
                  />
                  <span
                    className={`text-[9px] tabular-nums ${
                      isMin ? meta.accent + " font-semibold" : "text-white/35"
                    }`}
                  >
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 현재 잔고 + 최저 날 */}
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className="text-white/50">
              현재 잔고 <span className="tabular-nums text-white/75">
                {formatWonShort(data.currentBalance)}
              </span>
            </span>
            <span className={`tabular-nums font-semibold ${meta.accent}`}>
              7일간 예측
            </span>
          </div>
        </div>

        <ChevronRight
          className="h-4 w-4 text-white/30 flex-shrink-0 mt-1"
          strokeWidth={1.5}
        />
      </div>
    </motion.button>
  );
}
