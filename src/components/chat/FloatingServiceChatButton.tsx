import { Button } from "@/components/ui/button";
import { useServiceChat } from "@/contexts/ServiceChatContext";
import chatbotIcon from "@/assets/icc-4.webp";

export function FloatingServiceChatButton() {
  const { isVoiceOpen, isChatOpen, openVoice } = useServiceChat();
  
  if (isVoiceOpen || isChatOpen) return null;
  
  return (
    <Button
      onClick={openVoice}
      className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:scale-105 transition-transform z-40 bg-white hover:bg-white/90 p-1 animate-bounce-subtle"
      size="icon"
    >
      <img src={chatbotIcon} alt="김비서" className="h-12 w-12 object-contain" style={{ filter: 'invert(37%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(97%) contrast(101%)' }} />
    </Button>
  );
}
