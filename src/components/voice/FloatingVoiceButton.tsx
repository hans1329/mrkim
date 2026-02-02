import { Button } from "@/components/ui/button";
import { useVoice } from "@/contexts/VoiceContext";
import { useChat } from "@/contexts/ChatContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const chatbotIcon = "/images/icc-5.webp";

export function FloatingVoiceButton() {
  const { isOpen: isVoiceOpen, openVoice } = useVoice();
  const { isOpen: isChatOpen } = useChat();
  const isMobile = useIsMobile();
  
  if (isVoiceOpen || isChatOpen) return null;
  
  return (
    <Button
      onClick={openVoice}
      size="lg"
      className={cn(
        "h-16 w-16 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 bg-primary hover:bg-primary/90 p-2 animate-bounce-subtle",
        isMobile 
          ? "absolute bottom-20 right-4" 
          : "fixed bottom-6 right-6"
      )}
    >
      <img src={chatbotIcon} alt="김비서" className="h-10 w-auto object-contain opacity-90" />
    </Button>
  );
}
