import { ArrowRight, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useV2PC } from "./V2PCContext";

export const V2DetailPanel = () => {
  const { selectedCard } = useV2PC();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3">
        <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
          상세 데이터
        </span>
      </div>

      <AnimatePresence mode="wait">
        {selectedCard ? (
          <motion.div
            key={selectedCard.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="flex-1 overflow-y-auto no-scrollbar p-5"
          >
            {/* Card gradient accent */}
            <div
              className="rounded-2xl p-5 mb-4"
              style={{
                background: selectedCard.gradient || "linear-gradient(135deg, rgba(30,30,45,0.9), rgba(20,20,30,0.9))",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                {selectedCard.time}
              </span>

              <h3 className="text-lg font-bold mt-3" style={{ color: "rgba(255,255,255,0.95)" }}>
                {selectedCard.title}
              </h3>

              {selectedCard.bigNumber && (
                <div className="flex items-baseline gap-2 mt-3">
                  <span className="font-black leading-none tracking-tight"
                    style={{ fontSize: "48px", color: "rgba(255,255,255,0.95)" }}>
                    {selectedCard.bigNumber}
                  </span>
                  <span className="text-lg font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {selectedCard.unit}
                  </span>
                  {selectedCard.change && (
                    <span className="text-sm font-bold ml-1"
                      style={{ color: selectedCard.change.positive ? "#30D158" : "#FF453A" }}>
                      {selectedCard.change.value} {selectedCard.change.positive ? "↑" : "↓"}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Detail body */}
            <div className="space-y-4">
              <div
                className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <p className="text-[13px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                  상세 요약
                </p>
                <p className="text-[13px] leading-relaxed whitespace-pre-line"
                  style={{ color: "rgba(255,255,255,0.5)" }}>
                  {selectedCard.detail || selectedCard.body || "추가 상세 정보가 없습니다."}
                </p>
              </div>

              {selectedCard.actionRoute && (
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(selectedCard.actionRoute!)}
                  className="w-full py-3 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-1.5"
                  style={{
                    background: "rgba(0,122,255,0.2)",
                    color: "#007AFF",
                    border: "1px solid rgba(0,122,255,0.15)",
                  }}
                >
                  {selectedCard.action || "자세히 보기"}
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-3 px-6"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <BarChart3 className="w-6 h-6" style={{ color: "rgba(255,255,255,0.15)" }} />
            </div>
            <p className="text-[13px] text-center" style={{ color: "rgba(255,255,255,0.25)" }}>
              피드 카드를 클릭하면<br />상세 데이터가 여기에 표시됩니다
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
