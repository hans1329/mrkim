import { createContext, useContext, useState, ReactNode } from "react";

interface ServiceChatContextType {
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
}

const ServiceChatContext = createContext<ServiceChatContextType | null>(null);

export function ServiceChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);

  return (
    <ServiceChatContext.Provider value={{ isOpen, openChat, closeChat }}>
      {children}
    </ServiceChatContext.Provider>
  );
}

export function useServiceChat() {
  const context = useContext(ServiceChatContext);
  if (!context) {
    throw new Error("useServiceChat must be used within ServiceChatProvider");
  }
  return context;
}
