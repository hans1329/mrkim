import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Plus, RotateCw, TriangleAlert, X } from "lucide-react";
import { useState } from "react";

/**
 * V3 연동 관리 Bottom Sheet. 전역 접근 (어느 페이지에서든 연동 상태 + 재동기화 + 신규 연동 2탭 이내).
 */

interface V3ConnectionsSheetProps {
  open: boolean;
  onClose: () => void;
}

interface Connection {
  id: string;
  category: "bank" | "card" | "hometax" | "delivery";
  categoryLabel: string;
  provider: string;
  status: "connected" | "syncing" | "error" | "disconnected";
  lastSync: string | null;
  detail?: string;
}

// Mock data — 실제 연결 시 connector_instances 쿼리로 교체
const MOCK_CONNECTIONS: Connection[] = [
  {
    id: "bank-shinhan",
    category: "bank",
    categoryLabel: "은행",
    provider: "신한은행 · 기업",
    status: "connected",
    lastSync: "5분 전",
    detail: "입출금 24건 수집",
  },
  {
    id: "card-samsung",
    category: "card",
    categoryLabel: "카드",
    provider: "삼성카드 · 법인",
    status: "connected",
    lastSync: "12분 전",
    detail: "지출 18건 수집",
  },
  {
    id: "hometax",
    category: "hometax",
    categoryLabel: "홈택스",
    provider: "국세청",
    status: "error",
    lastSync: null,
    detail: "공동인증서 재등록 필요",
  },
  {
    id: "delivery-baemin",
    category: "delivery",
    categoryLabel: "배달",
    provider: "배달의민족",
    status: "connected",
    lastSync: "30분 전",
    detail: "주문 42건, 정산 예정액 2,140,800원",
  },
];

const STATUS_META: Record<Connection["status"], { dot: string; label: string; labelClass: string }> = {
  connected: { dot: "bg-emerald-400", label: "연결됨", labelClass: "text-emerald-400" },
  syncing: { dot: "bg-amber-400", label: "동기화중", labelClass: "text-amber-400" },
  error: { dot: "bg-rose-400", label: "오류", labelClass: "text-rose-400" },
  disconnected: { dot: "bg-white/30", label: "연결 끊김", labelClass: "text-white/50" },
};

export function V3ConnectionsSheet({ open, onClose }: V3ConnectionsSheetProps) {
  const [connections, setConnections] = useState(MOCK_CONNECTIONS);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [globalSyncing, setGlobalSyncing] = useState(false);

  const active = connections.filter((c) => c.status === "connected").length;
  const hasError = connections.some((c) => c.status === "error");

  const handleSyncOne = (id: string) => {
    setSyncingId(id);
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "syncing" as const } : c))
    );
    // Mock: 1.5초 후 완료 처리
    setTimeout(() => {
      setSyncingId(null);
      setConnections((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, status: "connected" as const, lastSync: "방금" }
            : c
        )
      );
    }, 1500);
  };

  const handleSyncAll = () => {
    setGlobalSyncing(true);
    setConnections((prev) =>
      prev.map((c) =>
        c.status === "error" ? c : { ...c, status: "syncing" as const }
      )
    );
    setTimeout(() => {
      setGlobalSyncing(false);
      setConnections((prev) =>
        prev.map((c) =>
          c.status === "error"
            ? c
            : { ...c, status: "connected" as const, lastSync: "방금" }
        )
      );
    }, 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.25}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 500) onClose();
            }}
            className="
              fixed bottom-0 left-0 right-0 z-50
              mx-auto w-full max-w-md
              max-h-[85vh] overflow-hidden
              rounded-t-3xl
              border-t border-l border-r border-white/[0.08]
              text-white
              flex flex-col
            "
            style={{
              background:
                "linear-gradient(180deg, #13131D 0%, #0E0E16 100%)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Grabber */}
            <div className="pt-2 pb-1 flex items-center justify-center">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="text-base font-semibold">연동 관리</p>
                <p className="text-xs text-white/50 mt-0.5">
                  {active}/{connections.length} 활성
                  {hasError && " · 1건 조치 필요"}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="h-11 w-11 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center active:scale-95 transition"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Sync all */}
            <div className="px-5 pb-3">
              <button
                onClick={handleSyncAll}
                disabled={globalSyncing}
                className="
                  w-full h-12 rounded-xl
                  bg-white/[0.06] border border-white/[0.08]
                  text-sm font-medium text-white/90
                  flex items-center justify-center gap-2
                  active:scale-[0.98] transition
                  disabled:opacity-60
                "
              >
                <RotateCw
                  className={`h-4 w-4 ${globalSyncing ? "animate-spin" : ""}`}
                  strokeWidth={1.5}
                />
                {globalSyncing ? "동기화 중..." : "전체 새로고침"}
              </button>
            </div>

            {/* Connections list */}
            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2">
              {connections.map((conn) => (
                <ConnectionRow
                  key={conn.id}
                  conn={conn}
                  onSync={() => handleSyncOne(conn.id)}
                  isSyncing={syncingId === conn.id}
                />
              ))}
            </div>

            {/* Add new */}
            <div className="px-5 pt-3 pb-5 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  console.log("add new connection");
                  onClose();
                }}
                className="
                  w-full h-14 rounded-2xl
                  bg-gradient-to-br from-indigo-500/80 to-violet-500/80
                  text-sm font-semibold text-white
                  flex items-center justify-center gap-2
                  active:scale-[0.98] transition
                  shadow-[0_8px_24px_-8px_rgba(120,120,255,0.5)]
                "
              >
                <Plus className="h-5 w-5" strokeWidth={1.5} />새 연동 추가
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ConnectionRow({
  conn,
  onSync,
  isSyncing,
}: {
  conn: Connection;
  onSync: () => void;
  isSyncing: boolean;
}) {
  const meta = STATUS_META[conn.status];
  const actuallySyncing = isSyncing || conn.status === "syncing";

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40">
              {conn.categoryLabel}
            </span>
            <span className={`inline-flex items-center gap-1.5 ${meta.labelClass}`}>
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              <span className="text-[10px] font-medium">{meta.label}</span>
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-white/95">{conn.provider}</p>
          {conn.detail && (
            <p className="mt-1 text-xs text-white/55">{conn.detail}</p>
          )}
          {conn.lastSync && (
            <p className="mt-1 text-[11px] text-white/40">
              마지막 동기화: {conn.lastSync}
            </p>
          )}
        </div>

        {conn.status === "error" ? (
          <button
            onClick={() => {
              // TODO: 재연결 플로우로 이동
              console.log("reconnect:", conn.id);
            }}
            className="
              flex items-center gap-1.5 h-9 px-3 rounded-lg
              bg-rose-500/15 border border-rose-500/20
              text-xs font-medium text-rose-300
              active:scale-95 transition
            "
          >
            <TriangleAlert className="h-3.5 w-3.5" strokeWidth={1.5} />
            재연결
          </button>
        ) : (
          <button
            onClick={onSync}
            disabled={actuallySyncing}
            aria-label="새로고침"
            className="
              h-9 w-9 rounded-lg
              bg-white/[0.05] border border-white/[0.08]
              flex items-center justify-center
              active:scale-95 transition
              disabled:opacity-60
            "
          >
            {actuallySyncing ? (
              <RotateCw className="h-4 w-4 animate-spin text-white/70" strokeWidth={1.5} />
            ) : (
              <RotateCw className="h-4 w-4 text-white/70" strokeWidth={1.5} />
            )}
          </button>
        )}
      </div>

      {conn.status === "connected" && conn.lastSync === "방금" && (
        <div className="mt-2 flex items-center gap-1.5 text-emerald-400">
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
          <span className="text-[11px] font-medium">방금 동기화됨</span>
        </div>
      )}
    </div>
  );
}
