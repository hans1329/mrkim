import { createContext, useContext, useState, ReactNode } from "react";

interface ServiceChatContextType {
  isVoiceOpen: boolean;
  isChatOpen: boolean;
  openVoice: () => void;
  closeVoice: () => void;
  openChat: () => void;
  closeChat: () => void;
  switchToChat: () => void;
  switchToVoice: () => void;
}

const ServiceChatContext = createContext<ServiceChatContextType | null>(null);

export function ServiceChatProvider({ children }: { children: ReactNode }) {
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openVoice = () => {
    setIsChatOpen(false);
    setIsVoiceOpen(true);
  };
  
  const closeVoice = () => setIsVoiceOpen(false);
  
  const openChat = () => {
    setIsVoiceOpen(false);
    setIsChatOpen(true);
  };
  
  const closeChat = () => setIsChatOpen(false);

  const switchToChat = () => {
    setIsVoiceOpen(false);
    setIsChatOpen(true);
  };

  const switchToVoice = () => {
    setIsChatOpen(false);
    setIsVoiceOpen(true);
  };

  return (
    <ServiceChatContext.Provider value={{ 
      isVoiceOpen, 
      isChatOpen, 
      openVoice, 
      closeVoice, 
      openChat, 
      closeChat,
      switchToChat,
      switchToVoice
    }}>
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
