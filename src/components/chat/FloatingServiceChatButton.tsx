import { Button } from "@/components/ui/button";
import { useServiceChat } from "@/contexts/ServiceChatContext";
import chatbotIcon from "@/assets/icc-blue.webp";

export function FloatingServiceChatButton() {
  const { isVoiceOpen, isChatOpen, openVoice } = useServiceChat();
  
  if (isVoiceOpen || isChatOpen) return null;
  
  return (
    <Button
      onClick={openVoice}
      className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:scale-105 transition-transform z-40 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 p-1 animate-bounce-subtle"
      size="icon"
    >
      <img src={chatbotIcon} alt="김비서" className="h-12 w-12 object-contain" />
    </Button>
  );
}
