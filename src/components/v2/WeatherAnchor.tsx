import { motion } from "framer-motion";
import { useState } from "react";
import { TrendingUp, TrendingDown, Receipt, AlertTriangle } from "lucide-react";

const weatherConfig = {
  sunny: { icon: "☀️", label: "맑음", desc: "매출 상승 흐름" },
  "partly-cloudy": { icon: "🌤️", label: "구름 조금", desc: "보통 수준" },
  cloudy: { icon: "⛅", label: "흐림", desc: "주의 필요" },
  rainy: { icon: "🌧️", label: "비", desc: "매출 하락 주의" },
  storm: { icon: "⛈️", label: "폭풍", desc: "긴급 확인 필요" },
};

export const WeatherAnchor = () => {
  const [expanded, setExpanded] = useState(false);
  const weather = "sunny";
  const config = weatherConfig[weather];

  // Mock data — 실제로는 DB에서 가져옴
  const todaySales = 1270000;
  const yesterdaySales = 1030000;
  const changePercent = Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100);
  const isUp = changePercent >= 0;
  const unreceiptedCount = 3;
  const taxDday = 3;

  return (
    <motion.div
      className="mx-4 mt-3 rounded-2xl cursor-pointer select-none"
      onClick={() => setExpanded(!expanded)}
      layout
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <div className="px-4 py-3.5">
        {/* 1행: 날씨 아이콘 + 오늘 매출 요약 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{config.icon}</span>
            <div>
              <p className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                오늘 매장 · {config.label}
              </p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
                  {(todaySales / 10000).toFixed(0)}만원
                </span>
                <span
                  className="text-[11px] font-semibold flex items-center gap-0.5"
                  style={{ color: isUp ? "#30D158" : "#FF453A" }}
                >
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isUp ? "+" : ""}{changePercent}%
                </span>
              </div>
            </div>
          </div>

          {/* 미처리 알림 뱃지 */}
          <div className="flex items-center gap-2">
            {unreceiptedCount > 0 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: "rgba(255,149,0,0.12)" }}
              >
                <Receipt className="w-3 h-3" style={{ color: "#FF9500" }} />
                <span className="text-[10px] font-semibold" style={{ color: "#FF9500" }}>
                  {unreceiptedCount}
                </span>
              </div>
            )}
            {taxDday <= 7 && (
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg"
                style={{ background: "rgba(255,59,48,0.12)" }}
              >
                <AlertTriangle className="w-3 h-3" style={{ color: "#FF3B30" }} />
                <span className="text-[10px] font-semibold" style={{ color: "#FF3B30" }}>
                  D-{taxDday}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 확장 시 3축 요약 */}
        {expanded && (
          <motion.div
            className="grid grid-cols-3 gap-2 mt-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {[
              { label: "매출 추이", value: "↑ 12%" },
              { label: "세무 리스크", value: "낮음" },
              { label: "증빙률", value: "92%" },
            ].map((axis) => (
              <div
                key={axis.label}
                className="rounded-xl px-2.5 py-2 text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {axis.label}
                </p>
                <p className="text-xs font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {axis.value}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
