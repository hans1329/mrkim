import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTransactions } from "@/hooks/useTransactions";
import { Skeleton } from "@/components/ui/skeleton";

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const HOUR_BUCKETS = Array.from({ length: 24 }, (_, h) => h);

type DailyStat = { day: number; total: number; count: number; avg: number };
type HourlyStat = { hour: number; total: number; count: number };

const fmtMan = (won: number) => `₩${(won / 10000).toFixed(1)}만`;

/**
 * 거래 데이터를 분석해 요일별/시간대별/히트맵 패턴을 보여주는 카드
 * - 데이터가 없으면 스켈레톤으로 표시 (글로벌 룰)
 */
export const SalesPatternCard = () => {
  const { data: transactions, isLoading: loading } = useTransactions();

  const { daily, hourly, heatmap, hasData, insights } = useMemo(() => {
    const incomes = (transactions || []).filter((t) => t.type === "income");

    const dailyMap = new Map<number, DailyStat>();
    const hourlyMap = new Map<number, HourlyStat>();
    const heat: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));

    for (const t of incomes) {
      const d = new Date(t.transaction_date);
      if (isNaN(d.getTime())) continue;
      const dow = d.getDay();
      const amt = Number(t.amount) || 0;

      const ds = dailyMap.get(dow) || { day: dow, total: 0, count: 0, avg: 0 };
      ds.total += amt;
      ds.count += 1;
      dailyMap.set(dow, ds);

      // 시간대 집계: transaction_time이 있으면 사용
      let hr = -1;
      if (t.transaction_time) {
        const m = String(t.transaction_time).match(/^(\d{1,2})/);
        if (m) hr = Number(m[1]);
      }
      if (hr >= 0 && hr < 24) {
        const hs = hourlyMap.get(hr) || { hour: hr, total: 0, count: 0 };
        hs.total += amt;
        hs.count += 1;
        hourlyMap.set(hr, hs);
        heat[dow][hr] += amt;
      }
    }

    const daily: DailyStat[] = Array.from({ length: 7 }, (_, i) => {
      const s = dailyMap.get(i) || { day: i, total: 0, count: 0, avg: 0 };
      s.avg = s.count > 0 ? s.total / s.count : 0;
      return s;
    });

    const hourly: HourlyStat[] = HOUR_BUCKETS.map(
      (h) => hourlyMap.get(h) || { hour: h, total: 0, count: 0 }
    );

    const totalDaily = daily.reduce((sum, d) => sum + d.total, 0);
    const totalHourly = hourly.reduce((sum, h) => sum + h.total, 0);

    // Insights
    const dailySorted = [...daily].sort((a, b) => b.total - a.total);
    const topDay = dailySorted[0];
    const lowDay = [...daily].filter((d) => d.count > 0).sort((a, b) => a.avg - b.avg)[0];
    const weekendShare =
      totalDaily > 0
        ? ((daily[5].total + daily[6].total + daily[0].total) / totalDaily) * 100
        : 0;

    const hourlySorted = [...hourly].sort((a, b) => b.total - a.total);
    const peakHour = hourlySorted[0];
    const eveningShare =
      totalHourly > 0
        ? (hourly.slice(17, 23).reduce((s, h) => s + h.total, 0) / totalHourly) * 100
        : 0;
    const lowestHour = [...hourly].filter((h) => h.count > 0).sort((a, b) => a.total - b.total)[0];

    // Heatmap hotspot (요일+시간 조합 최댓값)
    let hotDow = -1, hotHour = -1, hotMax = 0;
    for (let dw = 0; dw < 7; dw++) {
      for (let hr = 0; hr < 24; hr++) {
        if (heat[dw][hr] > hotMax) {
          hotMax = heat[dw][hr];
          hotDow = dw;
          hotHour = hr;
        }
      }
    }

    return {
      daily,
      hourly,
      heatmap: heat,
      hasData: incomes.length > 0,
      insights: {
        topDay,
        lowDay,
        weekendShare,
        peakHour,
        peakHourShare: totalHourly > 0 ? (peakHour.total / totalHourly) * 100 : 0,
        eveningShare,
        lowestHour,
        hotDow,
        hotHour,
        avgDaily: totalDaily / 7,
      },
    };
  }, [transactions]);

  if (loading) {
    return (
      <div className="rounded-2xl p-4" style={glass}>
        <Skeleton className="h-5 w-32 bg-white/10 rounded mb-3" />
        <Skeleton className="h-32 w-full bg-white/5 rounded mb-3" />
        <Skeleton className="h-3 w-full bg-white/5 rounded mb-2" />
        <Skeleton className="h-3 w-3/4 bg-white/5 rounded" />
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="rounded-2xl p-5 text-center" style={glass}>
        <p className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
          매출 데이터가 쌓이면 요일별·시간대별 패턴을 분석해 드릴게요
        </p>
      </div>
    );
  }

  const maxDaily = Math.max(...daily.map((d) => d.avg), 1);
  const maxHourly = Math.max(...hourly.map((h) => h.total), 1);
  const maxHeat = Math.max(...heatmap.flat(), 1);

  return (
    <div className="flex flex-col gap-3">
      {/* 요일별 패턴 */}
      <Section title="요일별 패턴" emoji="📅">
        <div className="flex items-end gap-1.5 h-28 mb-2">
          {daily.map((d) => {
            const h = (d.avg / maxDaily) * 100;
            const isTop = insights.topDay?.day === d.day && d.total > 0;
            const isLow = insights.lowDay?.day === d.day;
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="w-full rounded-t-md"
                  style={{
                    background: isTop
                      ? "linear-gradient(180deg, #FF9F0A, #FF6B00)"
                      : isLow
                      ? "rgba(255,255,255,0.12)"
                      : "linear-gradient(180deg, rgba(0,122,255,0.7), rgba(88,86,214,0.5))",
                  }}
                />
                <span
                  className="text-[9.5px] font-medium"
                  style={{
                    color:
                      d.day === 0
                        ? "#FF6B6B"
                        : d.day === 6
                        ? "#5AA9FF"
                        : "rgba(255,255,255,0.55)",
                  }}
                >
                  {DAY_LABELS[d.day]}
                </span>
              </div>
            );
          })}
        </div>
        {/* 평균 점선 */}
        <ul className="space-y-1 mt-2">
          {insights.topDay && insights.topDay.total > 0 && (
            <Bullet>
              <strong>{DAY_LABELS[insights.topDay.day]}요일이 1위</strong> — 일평균{" "}
              {fmtMan(insights.topDay.avg)}
            </Bullet>
          )}
          {insights.weekendShare > 0 && (
            <Bullet>
              금·토·일 주말이 전체 매출의 약{" "}
              <strong>{insights.weekendShare.toFixed(0)}%</strong> 담당
            </Bullet>
          )}
          {insights.lowDay && insights.lowDay.avg > 0 && insights.topDay && (
            <Bullet>
              <strong>{DAY_LABELS[insights.lowDay.day]}요일이 최저</strong> — 일평균{" "}
              {fmtMan(insights.lowDay.avg)}
            </Bullet>
          )}
        </ul>
      </Section>

      {/* 시간대별 패턴 */}
      <Section title="시간대별 패턴" emoji="🕐">
        <div className="flex items-end gap-[2px] h-20 mb-2">
          {hourly.map((h) => {
            const hh = (h.total / maxHourly) * 100;
            const isPeak = insights.peakHour?.hour === h.hour && h.total > 0;
            return (
              <div
                key={h.hour}
                className="flex-1 rounded-sm"
                style={{
                  height: `${Math.max(hh, 2)}%`,
                  background: isPeak
                    ? "linear-gradient(180deg, #FF9F0A, #FF6B00)"
                    : h.hour >= 17 && h.hour <= 22
                    ? "linear-gradient(180deg, rgba(0,122,255,0.6), rgba(88,86,214,0.4))"
                    : "rgba(255,255,255,0.1)",
                }}
                title={`${h.hour}시 · ${fmtMan(h.total)}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
          <span>0시</span>
          <span>6시</span>
          <span>12시</span>
          <span>18시</span>
          <span>23시</span>
        </div>
        <ul className="space-y-1">
          {insights.peakHour && insights.peakHour.total > 0 && (
            <Bullet>
              <strong>{insights.peakHour.hour}시가 최고 피크</strong> —{" "}
              {insights.peakHour.count}건 / {fmtMan(insights.peakHour.total)} (전체의{" "}
              {insights.peakHourShare.toFixed(0)}%)
            </Bullet>
          )}
          {insights.eveningShare > 0 && (
            <Bullet>
              17~22시 저녁 피크타임이 전체 매출의 약{" "}
              <strong>{insights.eveningShare.toFixed(0)}%</strong> 집중
            </Bullet>
          )}
          {insights.lowestHour && (
            <Bullet>
              {insights.lowestHour.hour}시가 하루 중 가장 조용한 시간 (
              {insights.lowestHour.count}건, {fmtMan(insights.lowestHour.total)})
            </Bullet>
          )}
        </ul>
      </Section>

      {/* 히트맵 인사이트 */}
      <Section title="히트맵 인사이트" emoji="🔥">
        <div className="grid grid-cols-[18px_1fr] gap-1 mb-2">
          <div />
          <div className="grid grid-cols-12 gap-[2px] text-[8px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            {[0, 4, 8, 12, 16, 20].map((h) => (
              <span key={h} className="col-span-2 text-center">{h}</span>
            ))}
          </div>
          {DAY_LABELS.map((label, dw) => (
            <>
              <span
                key={`l-${dw}`}
                className="text-[9px] flex items-center justify-end pr-1"
                style={{
                  color:
                    dw === 0 ? "#FF6B6B" : dw === 6 ? "#5AA9FF" : "rgba(255,255,255,0.5)",
                }}
              >
                {label}
              </span>
              <div key={`r-${dw}`} className="grid grid-cols-24 gap-[2px]" style={{ gridTemplateColumns: "repeat(24, 1fr)" }}>
                {heatmap[dw].map((v, hr) => {
                  const intensity = v / maxHeat;
                  const isHot = dw === insights.hotDow && hr === insights.hotHour && v > 0;
                  return (
                    <div
                      key={hr}
                      className="aspect-square rounded-[2px]"
                      style={{
                        background: isHot
                          ? "linear-gradient(135deg, #FF9F0A, #FF3B30)"
                          : intensity > 0
                          ? `rgba(0,122,255,${0.15 + intensity * 0.8})`
                          : "rgba(255,255,255,0.04)",
                      }}
                      title={v > 0 ? `${DAY_LABELS[dw]} ${hr}시 · ${fmtMan(v)}` : undefined}
                    />
                  );
                })}
              </div>
            </>
          ))}
        </div>
        <ul className="space-y-1 mt-2">
          {insights.hotDow >= 0 && insights.hotHour >= 0 && (
            <Bullet>
              <strong>
                {DAY_LABELS[insights.hotDow]}요일 {insights.hotHour}시
              </strong>{" "}
              구간이 가장 진하게 표시 (핫스팟)
            </Bullet>
          )}
          <Bullet>
            진할수록 매출 집중 — 약한 시간대는 홍보·할인 타깃으로 활용
          </Bullet>
        </ul>
      </Section>
    </div>
  );
};

const glass = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
};

const Section = ({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl p-4" style={glass}>
    <div className="flex items-center gap-1.5 mb-3">
      <span className="text-[14px]">{emoji}</span>
      <h4 className="text-[13.5px] font-bold" style={{ color: "rgba(255,255,255,0.92)" }}>
        {title}
      </h4>
    </div>
    {children}
  </div>
);

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex gap-1.5 text-[11.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.7)" }}>
    <span style={{ color: "rgba(255,255,255,0.35)" }}>•</span>
    <span>{children}</span>
  </li>
);
