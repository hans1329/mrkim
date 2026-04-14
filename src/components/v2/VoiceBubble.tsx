import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Mic, MessageSquare, X } from "lucide-react";

const contextChips = [
  { label: "영수증", icon: "🧾" },
  { label: "매출", icon: "💰" },
  { label: "세금", icon: "📋" },
  { label: "직원", icon: "👥" },
];

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
                background: "#FFFFFF",
                boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 12px 32px rgba(0,0,0,0.06)",
              }}
            >
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="김비서에게 물어보세요..."
                  className="flex-1 text-sm outline-none bg-transparent"
                  style={{ color: "#222" }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setMode("idle");
                  }}
                />
                <button
                  onClick={() => setMode("idle")}
                  className="p-1.5 rounded-full"
                  style={{ background: "#F5F5F5" }}
                >
                  <X size={14} style={{ color: "#757575" }} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Context chips */}
        <div className="pointer-events-auto flex items-center justify-center gap-2 mb-3">
          {contextChips.map((chip) => (
            <motion.button
              key={chip.label}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-medium"
              style={{
                background: "#FFFFFF",
                border: "1px solid #EBEBEB",
                color: "#222",
                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
              }}
            >
              <span className="text-xs">{chip.icon}</span>
              {chip.label}
            </motion.button>
          ))}
        </div>

        {/* Main bubble */}
        <div className="flex justify-center pointer-events-auto">
          <motion.button
            className="relative w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: mode === "listening"
                ? "linear-gradient(135deg, #007AFF, #5856D6)"
                : "#FFFFFF",
              boxShadow: mode === "listening"
                ? "0 0 20px rgba(0,122,255,0.3), 0 4px 12px rgba(0,0,0,0.06)"
                : "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)",
              border: mode === "idle" ? "1.5px solid transparent" : "none",
              backgroundImage: mode === "idle"
                ? "linear-gradient(#fff, #fff), linear-gradient(135deg, #007AFF, #5856D6, #AF52DE, #FF2D55)"
                : undefined,
              backgroundOrigin: "border-box",
              backgroundClip: mode === "idle" ? "padding-box, border-box" : undefined,
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 1.15 }}
            onClick={() => {
              if (mode === "idle") setMode("text");
              else if (mode === "text") setMode("idle");
              else setMode("idle");
            }}
            onPointerDown={(e) => {
              // Long press for voice
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
              <Mic size={22} color="#FFFFFF" />
            ) : (
              <MessageSquare size={20} style={{
                stroke: "url(#gradient)",
                color: "#007AFF",
              }} />
            )}

            {/* Gradient ring animation when listening */}
            {mode === "listening" && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  border: "2px solid rgba(0,122,255,0.3)",
                }}
                animate={{ scale: [1, 1.4, 1.4], opacity: [0.6, 0, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};
