import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type SystemToggleResult = {
  id: string;
  feature: "phone_alert" | "briefing";
  enable: boolean;
  success: boolean;
  message?: string;
};

const FEATURE_LABEL: Record<SystemToggleResult["feature"], string> = {
  phone_alert: "전화 알림",
  briefing: "일일 브리핑",
};

interface Props {
  result: SystemToggleResult | null;
  onDismiss: () => void;
}

export function SystemToggleSplash({ result, onDismiss }: Props) {
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(onDismiss, 2400);
    return () => clearTimeout(t);
  }, [result, onDismiss]);

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          key={result.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="mx-6 flex flex-col items-center gap-5 rounded-3xl border border-white/15 bg-white/10 px-10 py-10 text-center shadow-2xl backdrop-blur-2xl"
          >
            <motion.div
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.05 }}
              className={`flex h-24 w-24 items-center justify-center rounded-full text-5xl ${
                result.success
                  ? result.enable
                    ? "bg-gradient-to-br from-emerald-400/40 to-emerald-600/30 text-emerald-100"
                    : "bg-gradient-to-br from-zinc-400/30 to-zinc-700/30 text-zinc-200"
                  : "bg-gradient-to-br from-rose-400/40 to-rose-600/30 text-rose-100"
              }`}
            >
              {result.success ? (result.enable ? "🔔" : "🔕") : "⚠️"}
            </motion.div>

            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-widest text-white/50">
                System
              </p>
              <p className="text-3xl font-semibold text-white">
                {FEATURE_LABEL[result.feature]}
              </p>
              <p
                className={`mt-1 text-xl font-medium ${
                  result.success
                    ? result.enable
                      ? "text-emerald-300"
                      : "text-zinc-300"
                    : "text-rose-300"
                }`}
              >
                {result.success
                  ? result.enable
                    ? "켜졌습니다"
                    : "꺼졌습니다"
                  : "변경 실패"}
              </p>
              {result.message && (
                <p className="mt-2 max-w-[260px] text-sm text-white/60">
                  {result.message}
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
