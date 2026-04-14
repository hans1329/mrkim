import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

// Colorful cubic-ball avatar — no border, blur effect
const CubicBallAvatar = ({ size = 80 }: { size?: number }) => (
  <div
    className="overflow-hidden rounded-full"
    style={{ width: size, height: size, background: "#0A0A0F" }}
  >
    <svg
      viewBox="0 0 32 32"
      className="w-full h-full"
      style={{ filter: "blur(3px) saturate(1.4)" }}
    >
      <motion.circle
        cx="10"
        cy="10"
        r="9"
        fill="#007AFF"
        opacity={0.85}
        animate={{ cx: [10, 13, 10], cy: [10, 8, 10] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="22"
        cy="10"
        r="8"
        fill="#AF52DE"
        opacity={0.8}
        animate={{ cx: [22, 19, 22], cy: [10, 12, 10] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="16"
        cy="22"
        r="9"
        fill="#34C759"
        opacity={0.7}
        animate={{ cx: [16, 18, 16], cy: [22, 19, 22] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="12"
        cy="18"
        r="7"
        fill="#FF6B9D"
        opacity={0.6}
        animate={{ cx: [12, 15, 12], cy: [18, 15, 18] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="20"
        cy="20"
        r="6"
        fill="#FF9F0A"
        opacity={0.5}
        animate={{ cx: [20, 17, 20], cy: [20, 17, 20] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="8"
        cy="24"
        r="7"
        fill="#5856D6"
        opacity={0.65}
        animate={{ cx: [8, 11, 8], cy: [24, 21, 24] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="24"
        cy="14"
        r="6"
        fill="#FF375F"
        opacity={0.55}
        animate={{ cx: [24, 21, 24], cy: [14, 17, 14] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  </div>
);

interface IntroSequenceProps {
  onComplete: () => void;
  secretaryName?: string;
  secretaryAvatarUrl?: string | null;
  userName?: string;
}

const briefingItems = [
  { label: "어제 매출", value: "127만원", change: "+23%" },
  { label: "미처리", value: "2건", highlight: true },
  { label: "절세 점수", value: "78점" },
];

export const IntroSequence = ({
  onComplete,
  secretaryName = "김비서",
  secretaryAvatarUrl,
  userName = "사장님",
}: IntroSequenceProps) => {
  const [phase, setPhase] = useState<"greeting" | "briefing" | "exit">("greeting");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("briefing"), 2000);
    const t2 = setTimeout(() => setPhase("exit"), 4500);
    const t3 = setTimeout(() => onComplete(), 5200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center"
          style={{
            background: "linear-gradient(180deg, #0A0A0F 0%, #12121A 100%)",
          }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          onClick={() => { setPhase("exit"); setTimeout(onComplete, 600); }}
        >
          {/* Ambient glow */}
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] pointer-events-none"
            style={{
              background: "radial-gradient(circle, rgba(88,86,214,0.15) 0%, rgba(0,122,255,0.08) 40%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />

          {/* Secretary avatar - Cubic Ball */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" as const, stiffness: 200, damping: 20 }}
            className="relative z-10 mb-6"
          >
            <CubicBallAvatar size={80} />
          </motion.div>

          {/* Greeting text */}
          <AnimatePresence mode="wait">
            {phase === "greeting" && (
              <motion.div
                key="greeting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-center relative z-10"
              >
                <p className="text-[15px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {secretaryName}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "rgba(255,255,255,0.95)" }}
                >
                  안녕하세요, {userName}
                </p>
                <motion.div
                  className="mx-auto mt-4 h-[2px] rounded-full"
                  style={{
                    background: "linear-gradient(90deg, #007AFF, #5856D6, #AF52DE, #FF2D55)",
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: 120 }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </motion.div>
            )}

            {phase === "briefing" && (
              <motion.div
                key="briefing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="relative z-10 w-full max-w-[300px]"
              >
                <p className="text-[13px] text-center mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                  오늘의 브리핑
                </p>
                <div className="flex flex-col gap-2.5">
                  {briefingItems.map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15, type: "spring" as const, stiffness: 300, damping: 30 }}
                      className="flex items-center justify-between px-5 py-3 rounded-xl"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                      }}
                    >
                      <span className="text-[13px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[15px] font-bold"
                          style={{
                            color: item.highlight
                              ? "#FF9500"
                              : "rgba(255,255,255,0.9)",
                          }}
                        >
                          {item.value}
                        </span>
                        {item.change && (
                          <span
                            className="text-[11px] font-semibold"
                            style={{
                              background: "linear-gradient(135deg, #30D158, #34C759)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                            }}
                          >
                            {item.change}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip hint */}
          <motion.p
            className="absolute bottom-10 text-[11px]"
            style={{ color: "rgba(255,255,255,0.2)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            탭하여 건너뛰기
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
