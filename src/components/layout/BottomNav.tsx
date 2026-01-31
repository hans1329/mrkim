import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Receipt, Users, Wallet, TrendingUp } from "lucide-react";

const navItems = [
  { title: "홈", url: "/", icon: LayoutDashboard },
  { title: "매출/매입", url: "/transactions", icon: Receipt },
  { title: "직원", url: "/employees", icon: Users },
  { title: "자금", url: "/funds", icon: Wallet },
  { title: "리포트", url: "/reports", icon: TrendingUp },
];

export function BottomNav() {
  return (
    <nav className="absolute bottom-0 left-0 right-0 z-50 bg-primary shadow-[0_-4px_20px_rgba(0,0,0,0.15)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/"}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 text-primary-foreground/70 transition-colors active:bg-white/10"
            )}
            activeClassName="text-white"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
