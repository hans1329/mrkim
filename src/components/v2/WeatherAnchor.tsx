import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

// 음성 명령어 사용팁 — 자주 안 쓰는 명령 위주로 순환 노출
const COMMAND_TIPS = [
  '"이번 달 매출 알려줘"',
  '"브리핑 켜줘"',
  '"세무사 상담 요청"',
  '"카드 연동해줘"',
  '"홈택스 연결"',
  '"배민 연동"',
  '"직원 등록"',
  '"알바 추가"',
  '"비서 목소리 바꿔줘"',
  '"오늘 지출 보여줘"',
  '"이번 주 정산 얼마야"',
  '"부가세 얼마 나와"',
];

const weatherConfig = {
  sunny: { icon: "☀️", label: "맑음" },
  "partly-cloudy": { icon: "🌤️", label: "구름 조금" },
  cloudy: { icon: "⛅", label: "흐림" },
  rainy: { icon: "🌧️", label: "비" },
  storm: { icon: "⛈️", label: "폭풍" },
};

export const WeatherAnchor = () => {
  const [expanded, setExpanded] = useState(false);
  // mode: "weather" | "tip", 팁이 끝나면 다시 날씨로 돌아감
  const [mode, setMode] = useState<"weather" | "tip">("weather");
  const [tipIndex, setTipIndex] = useState(0);
  const [tipsShownInBurst, setTipsShownInBurst] = useState(0);
  const weather = "sunny";
  const config = weatherConfig[weather];
  const gaugePercent = 78;

  // 시퀀스: 날씨 12초 유지 → 팁 2개씩 보여줌(각 4초) → 다시 날씨로
  useEffect(() => {
    if (expanded) return;
    const TIPS_PER_BURST = 2;
    const WEATHER_HOLD_MS = 12000;
    const TIP_HOLD_MS = 4000;

    if (mode === "weather") {
      const t = setTimeout(() => {
        setTipsShownInBurst(0);
        setMode("tip");
      }, WEATHER_HOLD_MS);
      return () => clearTimeout(t);
    }
    // mode === "tip"
    const t = setTimeout(() => {
      const next = tipsShownInBurst + 1;
      if (next >= TIPS_PER_BURST) {
        setMode("weather");
        setTipIndex((prev) => (prev + 1) % COMMAND_TIPS.length);
      } else {
        setTipsShownInBurst(next);
        setTipIndex((prev) => (prev + 1) % COMMAND_TIPS.length);
      }
    }, TIP_HOLD_MS);
    return () => clearTimeout(t);
  }, [mode, tipsShownInBurst, expanded]);

  const showingTip = mode === "tip" && !expanded;

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
      <div className="px-4 py-3.5 min-h-[64px] flex items-center">
        <AnimatePresence mode="wait">
          {showingTip ? (
            // 팁 슬롯 — 박스 전체 사용
            <motion.div
              key={`tip-${tipIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5 }}
              className="w-full flex items-center gap-3"
            >
              <span className="text-xl">💡</span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10.5px] font-medium"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                >
                  이렇게 말해보세요
                </p>
                <p
                  className="text-[14px] font-semibold mt-0.5 truncate"
                  style={{ color: "rgba(255,255,255,0.92)" }}
                >
                  {COMMAND_TIPS[tipIndex]}
                </p>
              </div>
            </motion.div>
          ) : (
            // 날씨 + 절세 게이지 슬롯
            <motion.div
              key="weather"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.5 }}
              className="w-full flex items-center gap-2.5"
            >
              <span className="text-xl">{config.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
                    오늘 매장 날씨 · {config.label}
                  </p>
                  <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.8)" }}>
                    절세 {gaugePercent}%
                  </span>
                </div>
                <div
                  className="h-1.5 rounded-full overflow-hidden mt-1.5"
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 확장 시 3축 요약 */}
      {expanded && (
        <motion.div
          className="grid grid-cols-3 gap-2 mt-3 px-4 pb-3.5"
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
    </motion.div>
  );
};
