import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Mic, X } from "lucide-react";

const contextChips = ["영수증", "매출", "세금", "직원"];

export const VoiceBubble = () => {
  const [mode, setMode] = useState<"idle" | "text" | "listening">("idle");
  const [inputValue, setInputValue] = useState("");

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-[480px] mx-auto px-4 pb-6">
        {/* Text input sheet */}
        <AnimatePresence>
          {mode === "text" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="pointer-events-auto mb-3 rounded-2xl px-4 py-3"
              style={{
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="김비서에게 물어보세요..."
                  className="flex-1 text-sm outline-none bg-transparent placeholder:text-white/30"
                  style={{ color: "rgba(255,255,255,0.9)" }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setMode("idle");
                  }}
                />
                <button
                  onClick={() => setMode("idle")}
                  className="p-1.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <X size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context chips */}
        <div className="pointer-events-auto flex items-center justify-center gap-2 mb-3">
          {contextChips.map((label) => (
            <motion.button
              key={label}
              whileTap={{ scale: 0.95 }}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-medium"
              style={{
                background: "rgba(255,255,255,0.06)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* Main bubble */}
        <div className="flex justify-center pointer-events-auto">
          <motion.button
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: mode === "listening"
                ? "linear-gradient(135deg, #007AFF, #5856D6, #AF52DE)"
                : "rgba(255,255,255,0.08)",
              backdropFilter: mode !== "listening" ? "blur(24px)" : undefined,
              WebkitBackdropFilter: mode !== "listening" ? "blur(24px)" : undefined,
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: mode === "listening"
                ? "0 0 30px rgba(88,86,214,0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
                : "inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 16px rgba(0,0,0,0.3)",
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 1.15 }}
            onClick={() => {
              if (mode === "idle") setMode("text");
              else setMode("idle");
            }}
            onPointerDown={(e) => {
              const timer = setTimeout(() => setMode("listening"), 400);
              const cleanup = () => {
                clearTimeout(timer);
                if (mode === "listening") setMode("idle");
              };
              e.currentTarget.addEventListener("pointerup", cleanup, { once: true });
              e.currentTarget.addEventListener("pointerleave", cleanup, { once: true });
            }}
          >
            {mode === "listening" ? (
              <Mic size={22} color="rgba(255,255,255,0.95)" />
            ) : (
              <div
                className="w-5 h-0.5 rounded-full"
                style={{
                  background: "linear-gradient(90deg, #007AFF, #5856D6, #AF52DE, #FF2D55)",
                }}
              />
            )}

            {mode === "listening" && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ border: "2px solid rgba(88,86,214,0.3)" }}
                animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
