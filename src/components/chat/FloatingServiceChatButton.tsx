import { Button } from "@/components/ui/button";
import { useServiceChat } from "@/contexts/ServiceChatContext";
const chatbotIcon = "/images/icc-5.webp";

export function FloatingServiceChatButton() {
  const { isVoiceOpen, isChatOpen, openVoice } = useServiceChat();
  
  const isHidden = isVoiceOpen || isChatOpen;
  
  return (
    <Button
      onClick={openVoice}
      className={`fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:scale-105 transition-all z-40 bg-primary hover:bg-primary/90 p-1 animate-bounce-subtle ${
        isHidden ? "opacity-0 pointer-events-none scale-90" : "opacity-100"
      }`}
      size="icon"
    >
      <img src={chatbotIcon} alt="김비서" className="h-12 w-12 object-contain opacity-90" />
    </Button>
  );
}
