import { motion, AnimatePresence } from "framer-motion";
import { Home, BarChart3, Users, Wallet, Settings, User, FileText, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface V2NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { icon: Home, label: "홈", path: "/v2" },
  { icon: BarChart3, label: "매출 분석", path: "/reports" },
  { icon: FileText, label: "매출/매입", path: "/transactions" },
  { icon: Users, label: "직원 관리", path: "/employees" },
  { icon: Wallet, label: "자금 관리", path: "/funds" },
  { icon: User, label: "프로필", path: "/profile" },
  { icon: Settings, label: "설정", path: "/settings" },
  { icon: HelpCircle, label: "도움말", path: "/help" },
];

export const V2NavigationDrawer = ({ isOpen, onClose }: V2NavigationDrawerProps) => {
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute top-0 left-0 bottom-0 z-50 w-[280px] flex flex-col"
            style={{
              background: "linear-gradient(180deg, #14141E 0%, #0E0E16 100%)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
              paddingTop: "env(safe-area-inset-top, 0px)",
            }}
          >
            {/* Spacer for header alignment */}
            <div className="h-4" />

            {/* Logo / Brand */}
            <div className="px-6 pt-4 pb-6">
              <h2 className="text-lg font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>
                김비서
              </h2>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                AI 사업 비서
              </p>
            </div>

            {/* Menu items */}
            <nav className="flex-1 px-3 space-y-0.5">
              {menuItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <item.icon className="w-5 h-5" style={{ color: "rgba(255,255,255,0.4)" }} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Bottom */}
            <div className="px-6 py-6">
              <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.15)" }}>
                v2.0 Beta
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
