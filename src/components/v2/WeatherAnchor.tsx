import { motion } from "framer-motion";
import { useState } from "react";

const weatherConfig = {
  sunny: { icon: "☀️", label: "맑음" },
  "partly-cloudy": { icon: "🌤️", label: "구름 조금" },
  cloudy: { icon: "⛅", label: "흐림" },
  rainy: { icon: "🌧️", label: "비" },
  storm: { icon: "⛈️", label: "폭풍" },
};

export const WeatherAnchor = () => {
  const [expanded, setExpanded] = useState(false);
  const weather = "sunny";
  const config = weatherConfig[weather];
  const gaugePercent = 78;

  return (
    <motion.div
      className="mx-4 mt-3 rounded-2xl overflow-hidden cursor-pointer select-none"
      onClick={() => setExpanded(!expanded)}
      layout
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.3)",
      }}
    >
      <div className="relative px-5 py-4">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                오늘 매장 날씨
              </p>
              <p className="text-base font-bold" style={{ color: "rgba(255,255,255,0.95)" }}>
                {config.label}
              </p>
            </div>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>👤</span>
          </div>
        </div>

        {/* Gauge */}
        <div className="mt-3.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
              절세 게이지
            </span>
            <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>
              {gaugePercent}%
            </span>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: "linear-gradient(90deg, #007AFF, #5856D6, #AF52DE)",
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
            className="grid grid-cols-3 gap-2.5 mt-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            {[
              { label: "매출", value: "↑ 12%" },
              { label: "세무 리스크", value: "낮음" },
              { label: "증빙", value: "92%" },
            ].map((axis) => (
              <div
                key={axis.label}
                className="rounded-xl px-3 py-2.5 text-center"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  {axis.label}
                </p>
                <p className="text-sm font-bold mt-0.5" style={{ color: "rgba(255,255,255,0.9)" }}>
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
