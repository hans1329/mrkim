import { createContext, useContext, useRef, ReactNode } from "react";
import { AIChatPanel, AIChatPanelRef } from "@/components/chat/AIChatPanel";

interface ChatContextType {
  openChat: () => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const chatRef = useRef<AIChatPanelRef>(null);

  const openChat = () => {
    chatRef.current?.open();
  };

  const closeChat = () => {
    chatRef.current?.close();
  };

  return (
    <ChatContext.Provider value={{ openChat, closeChat }}>
      {children}
      <AIChatPanel ref={chatRef} />
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
