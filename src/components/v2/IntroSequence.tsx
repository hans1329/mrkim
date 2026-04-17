import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect } from "react";

const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 9) return "좋은 아침이에요 ☀️";
  if (hour >= 9 && hour < 12) return "오전도 힘내세요 💪";
  if (hour >= 12 && hour < 14) return "점심 맛있게 드세요 🍚";
  if (hour >= 14 && hour < 18) return "오후도 화이팅이에요 🔥";
  if (hour >= 18 && hour < 21) return "저녁 마무리 잘 하세요";
  return "늦은 시간 고생하세요 🌙";
};

// Colorful cubic-ball avatar — no border, blur effect
const CubicBallAvatar = ({ size = 80 }: { size?: number }) => (
  <div
    className="rounded-full"
    style={{ width: size, height: size }}
  >
    <svg
      viewBox="0 0 32 32"
      className="w-full h-full"
      style={{ filter: "blur(3px) saturate(1.4)" }}
    >
      <motion.circle
        cx="13" cy="12" r="10" fill="#007AFF" opacity={0.85}
        animate={{ cx: [13, 15, 13], cy: [12, 14, 12] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="19" cy="12" r="9" fill="#AF52DE" opacity={0.8}
        animate={{ cx: [19, 17, 19], cy: [12, 14, 12] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="16" cy="19" r="10" fill="#34C759" opacity={0.7}
        animate={{ cx: [16, 18, 16], cy: [19, 17, 19] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="14" cy="17" r="8" fill="#FF6B9D" opacity={0.6}
        animate={{ cx: [14, 16, 14], cy: [17, 15, 17] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="18" cy="16" r="7" fill="#FF9F0A" opacity={0.5}
        animate={{ cx: [18, 16, 18], cy: [16, 18, 16] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="12" cy="18" r="8" fill="#5856D6" opacity={0.65}
        animate={{ cx: [12, 14, 12], cy: [18, 16, 18] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle
        cx="20" cy="14" r="7" fill="#FF375F" opacity={0.55}
        animate={{ cx: [20, 18, 20], cy: [14, 16, 14] }}
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
  { label: "어제 매출", value: "127만원", change: "+23%", color: "rgba(0,122,255,0.15)" },
  { label: "미처리", value: "2건", highlight: true, color: "rgba(255,149,0,0.15)" },
  { label: "절세 점수", value: "78점", color: "rgba(88,86,214,0.15)" },
];

export const IntroSequence = ({
  onComplete,
  secretaryName = "김비서",
  secretaryAvatarUrl,
  userName = "사장님",
}: IntroSequenceProps) => {
  const [phase, setPhase] = useState<"greeting" | "briefing" | "exit">("greeting");
  const [progress, setProgress] = useState(0);
  const timeGreeting = useMemo(() => getTimeGreeting(), []);

  // Auto-advance greeting phase with progress bar
  useEffect(() => {
    if (phase !== "greeting") return;
    const duration = 2500; // ms
    const interval = 30;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      setProgress(Math.min((elapsed / duration) * 100, 100));
      if (elapsed >= duration) {
        clearInterval(timer);
        setPhase("briefing");
      }
    }, interval);
    return () => clearInterval(timer);
  }, [phase]);

  // Briefing phase requires manual tap to continue

  const handleTap = () => {
    if (phase === "greeting") {
      setPhase("briefing");
    } else if (phase === "briefing") {
      setPhase("exit");
      setTimeout(onComplete, 600);
    }
  };

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
          onClick={handleTap}
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
            <CubicBallAvatar size={120} />
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
                <p
                  className="text-[15px] mt-1"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {timeGreeting}
                </p>
                <motion.div
                  className="mx-auto mt-4 h-[2px] rounded-full overflow-hidden"
                  style={{ width: 120, background: "rgba(255,255,255,0.1)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      width: `${progress}%`,
                      background: "linear-gradient(90deg, #007AFF, #5856D6, #AF52DE, #FF2D55)",
                    }}
                  />
                </motion.div>
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
                <p className="text-[13px] text-center mb-4 text-primary-foreground" style={{ color: "rgba(255,255,255,0.4)" }}>
                  오늘의 브리핑
                </p>
                <div className="flex flex-col gap-2.5">
                  {briefingItems.map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15, type: "spring" as const, stiffness: 300, damping: 30 }}
                      className="rounded-2xl p-[1px]"
                      style={{
                        background: "linear-gradient(135deg, rgba(0,122,255,0.5), rgba(88,86,214,0.4), rgba(175,82,222,0.5), rgba(255,45,85,0.3))",
                      }}
                    >
                      <div
                        className="flex items-center justify-between px-5 py-3.5 rounded-[15px]"
                        style={{
                          background: `linear-gradient(135deg, ${item.color}, rgba(10,10,15,0.85))`,
                          backdropFilter: "blur(24px)",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 16px rgba(0,0,0,0.2)",
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
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
