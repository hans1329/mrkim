import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface PendingAction {
  id: string;
  label: string;
  dday: string;
  urgency: "danger" | "warning" | "info";
}

const urgencyColors = {
  danger: "#FF3B30",
  warning: "#FF9500",
  info: "#007AFF",
};

const mockActions: PendingAction[] = [
  { id: "1", label: "부가세 신고", dday: "D-3", urgency: "danger" },
  { id: "2", label: "미수집 영수증", dday: "5건", urgency: "warning" },
];

export const StickyActions = () => {
  const [actions, setActions] = useState(mockActions);

  const dismiss = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  if (actions.length === 0) return null;

  return (
    <div className="px-4 mt-3">
      <p className="text-[13px] font-semibold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
        미처리 {actions.length}건
      </p>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        <AnimatePresence>
          {actions.map((action) => (
            <motion.div
              key={action.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className="relative flex-shrink-0 rounded-xl px-4 py-3 min-w-[140px] cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderLeft: `3px solid ${urgencyColors[action.urgency]}`,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
              onClick={() => dismiss(action.id)}
            >
              <p className="text-[13px] font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                {action.label}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                {action.dday}
              </p>
              {/* Urgency dot */}
              <div
                className="absolute top-2.5 right-3 w-2 h-2 rounded-full"
                style={{
                  background: urgencyColors[action.urgency],
                  boxShadow: `0 0 6px ${urgencyColors[action.urgency]}60`,
                }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
