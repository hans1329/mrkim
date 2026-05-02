import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Briefcase,
  ChevronRight,
  CircleDollarSign,
  FileText,
  LogOut,
  Receipt,
  Settings,
  UserRound,
  Users,
  X,
} from "lucide-react";

/**
 * V3 좌측 슬라이드 메뉴. 스크린 80% 너비, safe-area 대응.
 */

interface V3MenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

interface MenuItem {
  label: string;
  path?: string;
  icon: typeof Receipt;
  destructive?: boolean;
  onClick?: () => void;
}

const PRIMARY_ITEMS: MenuItem[] = [
  { label: "거래 내역", path: "/v2/transactions", icon: Receipt },
  { label: "매출 패턴", path: "/v2/sales-pattern", icon: FileText },
  { label: "직원 관리", path: "/employees", icon: Users },
  { label: "자금 관리", path: "/funds", icon: CircleDollarSign },
  { label: "세무사", path: "/tax-accountant", icon: Briefcase },
];

const SECONDARY_ITEMS: MenuItem[] = [
  { label: "알림", path: "/notifications", icon: Bell },
  { label: "내 정보", path: "/profile", icon: UserRound },
  { label: "설정", path: "/settings", icon: Settings },
];

export function V3MenuDrawer({ open, onClose }: V3MenuDrawerProps) {
  const navigate = useNavigate();

  const handleItem = (item: MenuItem) => {
    if (item.onClick) item.onClick();
    else if (item.path) navigate(item.path);
    onClose();
  };

  const handleLogout = () => {
    // TODO: 실제 로그아웃
    console.log("logout");
    onClose();
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

          {/* Drawer */}
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="
              fixed top-0 left-0 bottom-0 z-50
              w-[84%] max-w-[340px]
              overflow-y-auto
              text-white
            "
            style={{
              background:
                "linear-gradient(180deg, #0F0F16 0%, #13131D 50%, #0E0E16 100%)",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <p className="text-xs text-white/50">메뉴</p>
                <p className="mt-0.5 text-lg font-semibold text-white">대표님</p>
              </div>
              <button
                onClick={onClose}
                aria-label="닫기"
                className="h-11 w-11 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center active:scale-95 transition"
              >
                <X className="h-5 w-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Primary items */}
            <nav className="mt-4 px-2">
              <ul className="space-y-0.5">
                {PRIMARY_ITEMS.map((item) => (
                  <MenuRow key={item.label} item={item} onSelect={handleItem} />
                ))}
              </ul>
            </nav>

            {/* Divider */}
            <div className="mx-5 my-4 h-px bg-white/[0.06]" />

            {/* Secondary items */}
            <nav className="px-2">
              <ul className="space-y-0.5">
                {SECONDARY_ITEMS.map((item) => (
                  <MenuRow key={item.label} item={item} onSelect={handleItem} />
                ))}
              </ul>
            </nav>

            {/* Footer: logout */}
            <div className="mx-2 mt-6 border-t border-white/[0.06] pt-4">
              <button
                onClick={handleLogout}
                className="
                  flex w-full items-center gap-3 rounded-xl px-4 py-3
                  text-left text-sm text-white/70
                  active:bg-white/[0.04]
                "
              >
                <LogOut className="h-5 w-5 text-white/50" strokeWidth={1.5} />
                <span>로그아웃</span>
              </button>
            </div>

            <div className="h-6" />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function MenuRow({
  item,
  onSelect,
}: {
  item: MenuItem;
  onSelect: (item: MenuItem) => void;
}) {
  const Icon = item.icon;
  return (
    <li>
      <button
        onClick={() => onSelect(item)}
        className="
          flex w-full items-center gap-3 rounded-xl px-4 py-3.5
          text-left
          active:bg-white/[0.06]
          transition
        "
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05]">
          <Icon className="h-5 w-5 text-white/75" strokeWidth={1.5} />
        </span>
        <span className="flex-1 text-[15px] font-medium text-white/90">
          {item.label}
        </span>
        <ChevronRight className="h-4 w-4 text-white/25" strokeWidth={1.5} />
      </button>
    </li>
  );
}
