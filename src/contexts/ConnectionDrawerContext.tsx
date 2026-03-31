import { createContext, useContext, useState, ReactNode, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectionHub, ServiceType } from "@/components/onboarding/ConnectionHub";
import { useQueryClient } from "@tanstack/react-query";
import { useConnectorInstances } from "@/hooks/useConnectors";
import { useConnection } from "@/contexts/ConnectionContext";
import { isCardCompanyConnected, isConnectorConnected } from "@/lib/connectionStatus";
import { supabase } from "@/integrations/supabase/client";

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
  const navigate = useNavigate();
  const { data: connectorInstances = [] } = useConnectorInstances();
  const { hometaxConnected, accountConnected } = useConnection();

  const connectionStatus = useMemo(() => {
    return {
      hometax: hometaxConnected,
      card: isCardCompanyConnected(connectorInstances, "crefia"),
      account: accountConnected,
      baemin: isConnectorConnected(connectorInstances, "hyphen_baemin"),
      coupangeats: isConnectorConnected(connectorInstances, "hyphen_coupangeats"),
    };
  }, [connectorInstances, hometaxConnected, accountConnected]);

  const openDrawer = useCallback(async (t?: ConnectionType) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }
    setType(t || null);
    setOpen(true);
  }, [navigate]);

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
  return useContext(ConnectionDrawerContext);
}
