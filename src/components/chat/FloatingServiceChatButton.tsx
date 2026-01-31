import { Button } from "@/components/ui/button";
import { AudioLines } from "lucide-react";
import { useServiceChat } from "@/contexts/ServiceChatContext";

export function FloatingServiceChatButton() {
  const { isVoiceOpen, isChatOpen, openVoice } = useServiceChat();
  
  if (isVoiceOpen || isChatOpen) return null;
  
  return (
    <Button
      onClick={openVoice}
      className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform z-40 bg-white hover:bg-white/90 text-primary"
      size="icon"
    >
      <AudioLines className="h-8 w-8" />
    </Button>
  );
}
