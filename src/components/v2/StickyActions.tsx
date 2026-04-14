import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface PendingAction {
  id: string;
  label: string;
  dday: string;
  urgency: "danger" | "warning" | "info";
  icon: string;
}

const urgencyGradient = {
  danger: "linear-gradient(135deg, #FF3B30, #FF2D55)",
  warning: "linear-gradient(135deg, #FF9500, #FF6B00)",
  info: "linear-gradient(135deg, #007AFF, #5856D6)",
};

const mockActions: PendingAction[] = [
  { id: "1", label: "부가세 신고", dday: "D-3", urgency: "danger", icon: "🔴" },
  { id: "2", label: "미수집 영수증", dday: "5건", urgency: "warning", icon: "🟡" },
];

export const StickyActions = () => {
  const [actions, setActions] = useState(mockActions);

  const dismiss = (id: string) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  if (actions.length === 0) return null;

  return (
    <div className="px-4 mt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">⚡</span>
        <span className="text-[13px] font-semibold" style={{ color: "#222" }}>
          미처리 {actions.length}건
        </span>
      </div>
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
                background: "#FFFFFF",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
                borderLeft: "3px solid transparent",
                borderImage: `${urgencyGradient[action.urgency]} 1`,
              }}
              onClick={() => dismiss(action.id)}
            >
              <p className="text-[13px] font-semibold" style={{ color: "#222" }}>
                {action.label}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "#757575" }}>
                {action.dday}
              </p>
              <span className="absolute top-2 right-2 text-[10px]">{action.icon}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
