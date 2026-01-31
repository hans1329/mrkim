import { Button } from "@/components/ui/button";
import { useVoice } from "@/contexts/VoiceContext";
import chatbotIcon from "@/assets/icc-4.webp";

export function FloatingVoiceButton() {
  const { isOpen, openVoice } = useVoice();
  
  if (isOpen) return null;
  
  return (
    <Button
      onClick={openVoice}
      className="absolute bottom-20 right-4 h-16 w-16 rounded-full shadow-lg hover:scale-105 transition-transform z-40 bg-white hover:bg-white/90 p-1 animate-bounce-subtle"
      size="icon"
    >
      <img src={chatbotIcon} alt="김비서" className="h-12 w-12 object-contain" style={{ filter: 'invert(37%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(97%) contrast(101%)' }} />
    </Button>
  );
}
