import { motion } from "framer-motion";
import { useState } from "react";

const weatherConfig = {
  sunny: { icon: "☀️", label: "맑음", desc: "세무 상태 양호" },
  "partly-cloudy": { icon: "🌤️", label: "구름 조금", desc: "확인 필요" },
  cloudy: { icon: "⛅", label: "흐림", desc: "주의 항목 있음" },
  rainy: { icon: "🌧️", label: "비", desc: "위험 감지" },
  storm: { icon: "⛈️", label: "폭풍", desc: "긴급 조치 필요" },
};

export const WeatherAnchor = () => {
  const [expanded, setExpanded] = useState(false);
  const weather = "sunny";
  const config = weatherConfig[weather];
  const gaugePercent = 78;

  return (
    <motion.div
      className="v2-weather-anchor mx-4 mt-3 rounded-2xl overflow-hidden cursor-pointer select-none"
      onClick={() => setExpanded(!expanded)}
      layout
    >
      {/* Gradient background */}
      <div className="v2-weather-bg relative px-5 py-4" style={{
        background: "var(--v2-weather-gradient, linear-gradient(135deg, #007AFF, #5856D6))",
      }}>
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <p className="text-white/90 text-xs font-medium">오늘 매장 날씨</p>
              <p className="text-white text-base font-bold">{config.label}</p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-sm">👤</span>
          </div>
        </div>

        {/* Gauge */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/80 text-[11px] font-medium">절세 게이지</span>
            <span className="text-white text-[11px] font-bold">{gaugePercent}%</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #34C759, #FFD60A)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${gaugePercent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Expanded 3-axis */}
        {expanded && (
          <motion.div
            className="grid grid-cols-3 gap-3 mt-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {[
              { label: "매출", value: "↑ 12%", icon: "📈" },
              { label: "세무 리스크", value: "낮음", icon: "🛡️" },
              { label: "증빙", value: "92%", icon: "📋" },
            ].map((axis) => (
              <div
                key={axis.label}
                className="bg-white/15 rounded-xl px-3 py-2.5 text-center backdrop-blur-sm"
              >
                <span className="text-lg">{axis.icon}</span>
                <p className="text-white/70 text-[10px] mt-1">{axis.label}</p>
                <p className="text-white text-sm font-bold">{axis.value}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};
