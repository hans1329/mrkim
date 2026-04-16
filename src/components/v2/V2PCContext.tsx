import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { FeedCard } from "@/hooks/useFeedCards";

interface V2PCContextType {
  selectedCard: FeedCard | null;
  selectCard: (card: FeedCard | null) => void;
  chatInput: string;
  setChatInput: (v: string) => void;
}

const V2PCContext = createContext<V2PCContextType | null>(null);

export function V2PCProvider({ children }: { children: ReactNode }) {
  const [selectedCard, setSelectedCard] = useState<FeedCard | null>(null);
  const [chatInput, setChatInput] = useState("");

  const selectCard = useCallback((card: FeedCard | null) => {
    setSelectedCard(card);
  }, []);

  return (
    <V2PCContext.Provider value={{ selectedCard, selectCard, chatInput, setChatInput }}>
      {children}
    </V2PCContext.Provider>
  );
}

export function useV2PC() {
  const ctx = useContext(V2PCContext);
  if (!ctx) throw new Error("useV2PC must be used within V2PCProvider");
  return ctx;
}
