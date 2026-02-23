import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ChatContextType {
  isOpen: boolean;
  initialMessage: string | null;
  openChat: () => void;
  openChatWithMessage: (message: string) => void;
  closeChat: () => void;
  consumeInitialMessage: () => string | null;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMessage, setInitialMessage] = useState<string | null>(null);

  const openChat = useCallback(() => setIsOpen(true), []);
  
  const openChatWithMessage = useCallback((message: string) => {
    setInitialMessage(message);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setInitialMessage(null);
  }, []);

  const consumeInitialMessage = useCallback(() => {
    const msg = initialMessage;
    setInitialMessage(null);
    return msg;
  }, [initialMessage]);

  return (
    <ChatContext.Provider value={{ isOpen, initialMessage, openChat, openChatWithMessage, closeChat, consumeInitialMessage }}>
      {children}
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
