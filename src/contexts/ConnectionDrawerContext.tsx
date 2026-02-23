import { createContext, useContext, useState, ReactNode } from "react";
import { ConnectionDrawer, ConnectionType } from "@/components/onboarding/ConnectionDrawer";
import { useQueryClient } from "@tanstack/react-query";

interface ConnectionDrawerContextValue {
  openDrawer: (type: ConnectionType) => void;
  closeDrawer: () => void;
}

const ConnectionDrawerContext = createContext<ConnectionDrawerContextValue | null>(null);

export function ConnectionDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ConnectionType | null>(null);
  const queryClient = useQueryClient();

  const openDrawer = (t: ConnectionType) => {
    setType(t);
    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
  };

  const handleComplete = () => {
    // 재연동 완료 후 거래 관련 쿼리 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-weekly-chart"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-recent-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-unclassified-count"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-action-data"] });
    closeDrawer();
  };

  return (
    <ConnectionDrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}
      <ConnectionDrawer
        open={open}
        type={type}
        onClose={closeDrawer}
        onComplete={handleComplete}
      />
    </ConnectionDrawerContext.Provider>
  );
}

export function useConnectionDrawer() {
  const ctx = useContext(ConnectionDrawerContext);
  if (!ctx) throw new Error("useConnectionDrawer must be used within ConnectionDrawerProvider");
  return ctx;
}
