import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

/**
 * V3 다음 주 현금 전망 카드.
 *
 * 색상 아이덴티티: 인디고→블루 (예측·미래·자금 흐름)
 * 상태(safe/warning/danger)는 상단 dot + accent 텍스트로 표현.
 *
 * 실 데이터 연결 시:
 *  - 현재 잔고 = 연동된 은행 계좌 합계
 *  - 입금 예정 = 배민/쿠팡이츠 정산, 세금계산서 미입금, 예상 매출
 *  - 출금 예정 = 카드결제일, 자동이체(월세/구독), 급여일, 세금 납부일
 *  - 일별 시뮬레이션 → 최저 잔고와 그 날짜·이유 추출
 */

interface CashDay {
  day: string;
  date: string;
  balance: number;
  event?: string;
}

interface CashRunwayData {
  currentBalance: number;
  forecast: CashDay[];
  minBalance: number;
  minDayIdx: number;
  risk: "safe" | "warning" | "danger";
  warningEventLabel?: string;
}

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
  { label: string; dotBg: string; textColor: string }
> = {
  safe: { label: "여유 있음", dotBg: "bg-emerald-300", textColor: "text-emerald-200" },
  warning: { label: "주의", dotBg: "bg-amber-300", textColor: "text-amber-200" },
  danger: { label: "위험", dotBg: "bg-rose-300", textColor: "text-rose-100" },
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
      className="relative w-full overflow-hidden rounded-3xl p-5 text-left"
      style={{
        background: "linear-gradient(135deg, #0A84FF 0%, #5856D6 100%)",
        minHeight: 240,
        boxShadow: "0 12px 32px -10px rgba(10,132,255,0.45)",
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
        <CalendarDays className="h-5 w-5 text-white" strokeWidth={1.5} />
      </div>

      <div className="relative">
        {/* Label */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/85">
            다음 주 현금 전망
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 h-5 rounded-full bg-white/20 backdrop-blur-sm">
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotBg}`} />
            <span className={`text-[10px] font-semibold ${meta.textColor}`}>
              {meta.label}
            </span>
          </span>
        </div>

        {/* Main: 최저 예상 잔고 */}
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-[40px] font-bold tabular-nums leading-[1.05] tracking-tight text-white">
            {formatWon(data.minBalance)}
          </span>
          <span className="text-xs font-medium text-white/80">최저 예상</span>
        </div>

        {/* 이벤트 설명 */}
        {data.warningEventLabel && (
          <p className="mt-1 text-[13px] font-medium text-white/90">
            {data.forecast[data.minDayIdx].date} {data.forecast[data.minDayIdx].day}요일 ·{" "}
            {data.warningEventLabel}
          </p>
        )}

        {/* 7일 미니 바 차트 */}
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
                  className={`w-full rounded-sm ${isMin ? "bg-white" : "bg-white/35"}`}
                />
                <span
                  className={`text-[9px] tabular-nums ${
                    isMin ? "text-white font-semibold" : "text-white/55"
                  }`}
                >
                  {d.day}
                </span>
              </div>
            );
          })}
        </div>

        {/* 현재 잔고 + 컨텍스트 */}
        <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-[11px]">
          <span className="text-white/75">
            현재 잔고{" "}
            <span className="tabular-nums text-white font-medium">
              {formatWonShort(data.currentBalance)}
            </span>
          </span>
          <span className="text-white/75 font-medium">7일 예측</span>
        </div>
      </div>
    </motion.button>
  );
}
