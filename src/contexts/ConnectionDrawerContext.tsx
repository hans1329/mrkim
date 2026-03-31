import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { ConnectionHub, ServiceType } from "@/components/onboarding/ConnectionHub";
import { useQueryClient } from "@tanstack/react-query";
import { useConnectorInstances } from "@/hooks/useConnectors";

// Keep backward compatibility with old ConnectionType
export type ConnectionType = ServiceType;

interface ConnectionDrawerContextValue {
  openDrawer: (type?: ConnectionType) => void;
  closeDrawer: () => void;
  isDrawerOpen: boolean;
  activeDrawerType: ConnectionType | null;
}

const ConnectionDrawerContext = createContext<ConnectionDrawerContextValue | null>(null);

export function ConnectionDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ConnectionType | null>(null);
  const queryClient = useQueryClient();
  const { data: connectorInstances = [] } = useConnectorInstances();

  const connectionStatus = useMemo(() => {
    const isConnected = (connectorId: string) =>
      connectorInstances.some(
        (i: any) => i.connector_id === connectorId && i.status === "connected"
      );

    return {
      hometax: isConnected("codef_hometax_tax_invoice"),
      card: isConnected("codef_card_usage") || isConnected("codef_card_sales"),
      account: isConnected("codef_bank_account"),
      baemin: isConnected("hyphen_baemin"),
      coupangeats: isConnected("hyphen_coupangeats"),
    };
  }, [connectorInstances]);

  const openDrawer = useCallback((t?: ConnectionType) => {
    setType(t || null);
    setOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpen(false);
    setType(null);
  }, []);

  const handleComplete = useCallback(() => {
    // 연동 완료 후 관련 쿼리 캐시 무효화
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary-stats"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-weekly-chart"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-recent-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-unclassified-count"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-action-data"] });
    queryClient.invalidateQueries({ queryKey: ["connector_instances"] });
  }, [queryClient]);

  return (
    <ConnectionDrawerContext.Provider value={{ openDrawer, closeDrawer, isDrawerOpen: open, activeDrawerType: type }}>
      {children}
      <ConnectionHub
        open={open}
        onClose={closeDrawer}
        onComplete={handleComplete}
        initialService={type}
        connectionStatus={connectionStatus}
      />
    </ConnectionDrawerContext.Provider>
  );
}

export function useConnectionDrawer() {
  const ctx = useContext(ConnectionDrawerContext);
  if (!ctx) throw new Error("useConnectionDrawer must be used within ConnectionDrawerProvider");
  return ctx;
}
