import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  Menu,
  Mic,
  Plus,
  TrendingUp,
} from "lucide-react";
import { V3MenuDrawer } from "@/components/v3/V3MenuDrawer";
import { V3ConnectionsSheet } from "@/components/v3/V3ConnectionsSheet";
import { V3ChatSheet } from "@/components/v3/V3ChatSheet";
import { V3SalesPatternCarousel } from "@/components/v3/V3SalesPatternCarousel";
import { V3DeliverySettlementCard } from "@/components/v3/V3DeliverySettlementCard";
import { V3BepProgressCard } from "@/components/v3/V3BepProgressCard";
import { V3CashRunwayCard } from "@/components/v3/V3CashRunwayCard";
import { V3MissedReceiptCard } from "@/components/v3/V3MissedReceiptCard";
import { V3CardCarousel } from "@/components/v3/V3CardCarousel";

/**
 * V3 Dashboard — Headline-first 메인 화면.
 *
 * V2 를 완전 대체하는 새 버전. 2026-04-22 리셋.
 *
 * 원칙:
 * - 핵심 지표 3개만 (Hero 1 + Secondary 2)
 * - 모바일 우선, safe-area, 50px+ 터치
 * - 연동 상태 전역 접근 (헤더 우측, 상태 점)
 * - 데이터는 mock (실 데이터는 hook 교체로 추후 연결)
 */

// ────────────────── Mock 데이터 ──────────────────
// 실 연결 시 useDashboardHeadlines() 같은 hook 으로 교체
const mockData = {
  today: {
    sales: 3_240_000,
    vsLastWeekSameDay: 18, // percent
    lastWeekSameDaySales: 2_745_000,
    lastSync: "5분 전",
  },
  month: {
    netIncomeEstimate: 4_900_000,
    vsLastMonth: 12,
    daysLeft: 9,
  },
  vat: {
    estimate: 1_800_000,
    dueDateLabel: "7월 25일",
    daysUntilDue: 27,
  },
  insights: [
    {
      id: "delivery-ad-ratio",
      title: "배달 매출 중 광고비 32%",
      description: "이번달 배달 1,210만원 중 387만원이 광고·수수료. 지난달 28%보다 4%p 높음.",
      severity: "warning" as const,
    },
    {
      id: "baemin-settlement",
      title: "배민 정산 3일 뒤 입금 예정",
      description: "4월 1~15일분 2,140,800원, 4월 25일(금) 14:00 입금.",
      severity: "info" as const,
    },
    {
      id: "card-fee-drop",
      title: "카드 수수료율 재협상 기회",
      description: "월 매출 2,000만원 돌파 4개월 연속. 카드사 문의 시 0.2%p 인하 가능성.",
      severity: "success" as const,
    },
  ],
  connections: {
    total: 4,
    active: 4,
    lastSync: "5분 전",
    status: "healthy" as "healthy" | "syncing" | "error",
  },
};

// ────────────────── 서브 컴포넌트 ──────────────────

function formatWon(n: number): string {
  return `₩${n.toLocaleString("ko-KR")}`;
}

function GlassCard({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const Tag = onClick ? motion.button : motion.div;
  return (
    <Tag
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`
        relative overflow-hidden rounded-3xl
        border border-white/[0.08]
        bg-white/[0.04] backdrop-blur-xl
        shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]
        text-left w-full
        ${onClick ? "active:bg-white/[0.06]" : ""}
        ${className}
      `.trim()}
    >
      {children}
    </Tag>
  );
}

function ConnectionStatusButton({
  active,
  total,
  status,
  onClick,
}: {
  active: number;
  total: number;
  status: "healthy" | "syncing" | "error";
  onClick: () => void;
}) {
  const dotColor =
    status === "healthy"
      ? "bg-emerald-400"
      : status === "syncing"
      ? "bg-amber-400"
      : "bg-rose-400";

  return (
    <button
      onClick={onClick}
      aria-label={`연동 상태: ${active}/${total} 활성`}
      className="
        relative flex items-center gap-2 h-11 px-3 rounded-full
        bg-white/[0.06] border border-white/[0.08]
        hover:bg-white/[0.1] active:scale-95
        transition
      "
    >
      <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
      <span className="text-xs font-medium text-white/90 tabular-nums">
        {active}/{total}
      </span>
      <Plus className="h-4 w-4 text-white/60" strokeWidth={1.5} />
    </button>
  );
}

function HeaderBar({ onOpenMenu, onOpenConnections }: { onOpenMenu: () => void; onOpenConnections: () => void }) {
  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-30
        bg-gradient-to-b from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent
        backdrop-blur-md
      "
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onOpenMenu}
          aria-label="메뉴 열기"
          className="h-11 w-11 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.1] active:scale-95 transition"
        >
          <Menu className="h-5 w-5 text-white/90" strokeWidth={1.5} />
        </button>

        <ConnectionStatusButton
          active={mockData.connections.active}
          total={mockData.connections.total}
          status={mockData.connections.status}
          onClick={onOpenConnections}
        />
      </div>
    </header>
  );
}

function HeroHeadline({ onTap }: { onTap: () => void }) {
  const delta = mockData.today.vsLastWeekSameDay;
  const up = delta >= 0;

  return (
    <GlassCard onClick={onTap} className="p-7">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <p className="text-sm text-white/60 font-medium">오늘 매출</p>

        <p className="mt-3 text-[56px] leading-[1.05] font-bold tabular-nums tracking-tight text-white">
          {formatWon(mockData.today.sales)}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <div
            className={`
              inline-flex items-center gap-1 px-2.5 h-7 rounded-full
              ${up ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}
            `}
          >
            <TrendingUp className={`h-3.5 w-3.5 ${up ? "" : "rotate-180"}`} strokeWidth={2} />
            <span className="text-xs font-semibold tabular-nums">
              {up ? "+" : "−"}
              {Math.abs(delta)}%
            </span>
          </div>
          <span className="text-xs text-white/50">지난주 일요일 대비</span>
        </div>

        <div className="mt-5 pt-5 border-t border-white/[0.06] flex items-center justify-between">
          <div className="flex items-baseline gap-2 text-xs text-white/50">
            <span>지난주 일요일</span>
            <span className="tabular-nums text-white/70">
              {formatWon(mockData.today.lastWeekSameDaySales)}
            </span>
          </div>
          <ChevronRight className="h-4 w-4 text-white/40" strokeWidth={1.5} />
        </div>
      </motion.div>
    </GlassCard>
  );
}

function SecondaryCard({
  label,
  value,
  meta,
  onClick,
}: {
  label: string;
  value: string;
  meta: string;
  onClick: () => void;
}) {
  return (
    <GlassCard onClick={onClick} className="p-5">
      <p className="text-xs text-white/50 font-medium">{label}</p>
      <p className="mt-2.5 text-2xl font-bold tabular-nums tracking-tight text-white">{value}</p>
      <p className="mt-2 text-[11px] text-white/50">{meta}</p>
    </GlassCard>
  );
}

function InsightItem({
  title,
  description,
  severity,
  onClick,
}: {
  title: string;
  description: string;
  severity: "success" | "warning" | "info";
  onClick: () => void;
}) {
  const dotClass =
    severity === "success"
      ? "bg-emerald-400"
      : severity === "warning"
      ? "bg-amber-400"
      : "bg-sky-400";

  return (
    <GlassCard onClick={onClick} className="p-5">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${dotClass}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-white/95 leading-snug">{title}</p>
          <p className="mt-1.5 text-xs text-white/55 leading-relaxed">{description}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-white/30 flex-shrink-0 mt-1" strokeWidth={1.5} />
      </div>
    </GlassCard>
  );
}

function VoiceBottomBar({ onTap }: { onTap: () => void }) {
  return (
    <div
      className="
        fixed bottom-0 left-0 right-0 z-30
        bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/80 to-transparent
      "
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-center px-4 py-4">
        <motion.button
          onClick={onTap}
          whileTap={{ scale: 0.92 }}
          className="
            flex items-center gap-3 h-14 pl-4 pr-6
            rounded-full
            bg-white/[0.08] border border-white/[0.1]
            backdrop-blur-xl
            text-white/90
            shadow-[0_8px_32px_-8px_rgba(120,120,255,0.4)]
          "
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 shadow-[0_0_20px_rgba(120,120,255,0.5)]">
            <Mic className="h-5 w-5 text-white" strokeWidth={1.5} />
          </span>
          <span className="text-sm font-medium">
            <span className="text-white/50">탭해서 </span>
            <span className="text-white">말씀하세요</span>
          </span>
        </motion.button>
      </div>
    </div>
  );
}

// ────────────────── 메인 페이지 ──────────────────

export default function V3Dashboard() {
  const navigate = useNavigate();
  const [connectionsOpen, setConnectionsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const handleHeroTap = () => {
    navigate("/v2/transactions");
  };
  const handleNetIncomeTap = () => {
    console.log("drill-down: net income");
  };
  const handleVatTap = () => {
    console.log("drill-down: vat");
  };
  const handleInsightTap = (id: string) => {
    console.log("drill-down insight:", id);
  };

  return (
    <div
      data-theme="v3"
      className="
        fixed inset-0 overflow-y-auto
        text-white
      "
      style={{
        background:
          "linear-gradient(180deg, #0A0A0F 0%, #12121A 50%, #0E0E16 100%)",
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(88,86,214,0.14) 0%, rgba(0,122,255,0.06) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <HeaderBar
        onOpenMenu={() => setMenuOpen(true)}
        onOpenConnections={() => setConnectionsOpen(true)}
      />

      <main
        className="relative z-10 mx-auto max-w-md px-4 space-y-4"
        style={{
          paddingTop: "calc(env(safe-area-inset-top) + 76px)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 120px)",
        }}
      >
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="px-1 pb-1"
        >
          <p className="text-xs text-white/50">
            {mockData.connections.lastSync} 기준 · 대표님
          </p>
        </motion.div>

        {/* Hero Headline */}
        <HeroHeadline onTap={handleHeroTap} />

        {/* Secondary 2-up */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          className="grid grid-cols-2 gap-3"
        >
          <SecondaryCard
            label="이번달 순이익 추정"
            value={formatWon(mockData.month.netIncomeEstimate)}
            meta={`지난달 대비 +${mockData.month.vsLastMonth}% · ${mockData.month.daysLeft}일 남음`}
            onClick={handleNetIncomeTap}
          />
          <SecondaryCard
            label="다음 부가세 예상"
            value={formatWon(mockData.vat.estimate)}
            meta={`${mockData.vat.dueDateLabel} 납부 · D-${mockData.vat.daysUntilDue}`}
            onClick={handleVatTap}
          />
        </motion.div>

        {/* Section: 세무·재무 인사이트 (Tier 1) — 자동+수동 캐러셀 */}
        <div className="pt-4 pb-1 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[11px] uppercase tracking-widest text-white/40">
            오늘 꼭 알아야 할 것
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18, ease: "easeOut" }}
        >
          <V3CardCarousel autoScrollMs={6000} pauseAfterInteractionMs={8000}>
            <V3CashRunwayCard onTap={() => console.log("drill-down: cash runway")} />
            <V3BepProgressCard onTap={() => console.log("drill-down: bep")} />
            <V3MissedReceiptCard onTap={() => console.log("drill-down: missed receipt")} />
          </V3CardCarousel>
        </motion.div>

        {/* Delivery Settlement */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
          className="pt-2"
        >
          <V3DeliverySettlementCard
            onTap={() => console.log("open settlement detail")}
          />
        </motion.div>

        {/* Sales Pattern Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.34, ease: "easeOut" }}
          className="pt-1"
        >
          <V3SalesPatternCarousel />
        </motion.div>

        {/* Divider label */}
        <div className="pt-4 pb-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[11px] uppercase tracking-widest text-white/40">
            오늘의 알림
          </span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* Insights */}
        <div className="space-y-3">
          {mockData.insights.map((insight, i) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
            >
              <InsightItem
                title={insight.title}
                description={insight.description}
                severity={insight.severity}
                onClick={() => handleInsightTap(insight.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* More entry */}
        <motion.button
          onClick={() => navigate("/v2/transactions")}
          whileTap={{ scale: 0.98 }}
          className="
            w-full mt-3 h-12 rounded-2xl
            border border-white/[0.08] bg-white/[0.02]
            flex items-center justify-center gap-2
            text-sm text-white/70 font-medium
            hover:bg-white/[0.05] transition
          "
        >
          전체 거래 보기
          <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
        </motion.button>
      </main>

      <VoiceBottomBar onTap={() => setChatOpen(true)} />

      {/* Overlays */}
      <V3MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <V3ConnectionsSheet
        open={connectionsOpen}
        onClose={() => setConnectionsOpen(false)}
      />
      <V3ChatSheet open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
