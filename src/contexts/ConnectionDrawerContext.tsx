import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { ConnectionHub, ServiceType } from "@/components/onboarding/ConnectionHub";
import { useQueryClient } from "@tanstack/react-query";
import { useConnectorInstances } from "@/hooks/useConnectors";
import { ConnectionContext } from "@/contexts/ConnectionContext";
import { isCardCompanyConnected, isConnectorConnected } from "@/lib/connectionStatus";

// Keep backward compatibility with old ConnectionType
export type ConnectionType = ServiceType;

interface ConnectionDrawerContextValue {
  openDrawer: (type?: ConnectionType) => void;
  closeDrawer: () => void;
  isDrawerOpen: boolean;
  activeDrawerType: ConnectionType | null;
}

const ConnectionDrawerContext = createContext<ConnectionDrawerContextValue>({
  openDrawer: () => {},
  closeDrawer: () => {},
  isDrawerOpen: false,
  activeDrawerType: null,
});

export function ConnectionDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ConnectionType | null>(null);
  const queryClient = useQueryClient();
  
  const { data: connectorInstances = [] } = useConnectorInstances();
  const connection = useContext(ConnectionContext);
  const hometaxConnected = connection?.hometaxConnected ?? false;
  const accountConnected = connection?.accountConnected ?? false;

  const connectionStatus = useMemo(() => {
    return {
      hometax: hometaxConnected,
      card: isCardCompanyConnected(connectorInstances, "crefia"),
      account: accountConnected,
      baemin: isConnectorConnected(connectorInstances, "hyphen_baemin"),
      coupangeats: isConnectorConnected(connectorInstances, "hyphen_coupangeats"),
    };
  }, [connectorInstances, hometaxConnected, accountConnected]);

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
    queryClient.invalidateQueries({ queryKey: ["connector-status"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    // 배달앱 관련 쿼리
    queryClient.invalidateQueries({ queryKey: ["delivery_orders"] });
    queryClient.invalidateQueries({ queryKey: ["delivery_menus"] });
    queryClient.invalidateQueries({ queryKey: ["delivery_stores"] });
    queryClient.invalidateQueries({ queryKey: ["delivery_settlements"] });
    queryClient.invalidateQueries({ queryKey: ["delivery_reviews"] });
    queryClient.invalidateQueries({ queryKey: ["delivery_statistics"] });
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
  return useContext(ConnectionDrawerContext);
}
