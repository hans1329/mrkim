import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useServiceChat } from "@/contexts/ServiceChatContext";

export function FloatingServiceChatButton() {
  const { isOpen, openChat } = useServiceChat();
  
  if (isOpen) return null;
  
  return (
    <Button
      onClick={openChat}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform z-40"
      size="icon"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
}
