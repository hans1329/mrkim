import { motion, AnimatePresence } from "framer-motion";
import { Mic } from "lucide-react";

interface VoiceListeningHintProps {
  isConnected: boolean;
  partialTranscript: string;
}

/**
 * 마이크 ON 상태에서 화면 하단에 작은 힌트 토스트만 표시.
 * 모달 없음. 사용자가 말하면 partialTranscript가 보임.
 */
export const VoiceListeningHint = ({ isConnected, partialTranscript }: VoiceListeningHintProps) => {
  return (
    <AnimatePresence>
      {isConnected && (
        <motion.div
          initial={{ opacity: 0, y: 12, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 12, x: "-50%" }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none fixed z-30"
          style={{
            left: "50%",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          }}
        >
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              background: "rgba(10,10,15,0.7)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              maxWidth: "min(calc(100vw - 48px), 520px)",
            }}
          >
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: "#34C759" }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "#34C759" }} />
            </span>
            {partialTranscript ? (
              <p className="text-[12.5px] truncate" style={{ color: "rgba(255,255,255,0.92)" }}>
                {partialTranscript}
              </p>
            ) : (
              <p className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                듣고 있어요…
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
