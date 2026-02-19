import { createContext, useContext, useState, ReactNode } from "react";
import { ConnectionDrawer, ConnectionType } from "@/components/onboarding/ConnectionDrawer";

interface ConnectionDrawerContextValue {
  openDrawer: (type: ConnectionType) => void;
  closeDrawer: () => void;
}

const ConnectionDrawerContext = createContext<ConnectionDrawerContextValue | null>(null);

export function ConnectionDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ConnectionType | null>(null);

  const openDrawer = (t: ConnectionType) => {
    setType(t);
    setOpen(true);
  };

  const closeDrawer = () => {
    setOpen(false);
  };

  return (
    <ConnectionDrawerContext.Provider value={{ openDrawer, closeDrawer }}>
      {children}
      <ConnectionDrawer
        open={open}
        type={type}
        onClose={closeDrawer}
      />
    </ConnectionDrawerContext.Provider>
  );
}

export function useConnectionDrawer() {
  const ctx = useContext(ConnectionDrawerContext);
  if (!ctx) throw new Error("useConnectionDrawer must be used within ConnectionDrawerProvider");
  return ctx;
}
