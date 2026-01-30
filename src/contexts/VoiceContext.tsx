import { createContext, useContext, useState, ReactNode } from "react";

interface VoiceContextType {
  isOpen: boolean;
  openVoice: () => void;
  closeVoice: () => void;
}

const VoiceContext = createContext<VoiceContextType | null>(null);

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openVoice = () => setIsOpen(true);
  const closeVoice = () => setIsOpen(false);

  return (
    <VoiceContext.Provider value={{ isOpen, openVoice, closeVoice }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error("useVoice must be used within VoiceProvider");
  }
  return context;
}
