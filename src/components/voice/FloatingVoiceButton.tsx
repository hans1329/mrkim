import { Button } from "@/components/ui/button";
import { useVoice } from "@/contexts/VoiceContext";

export function FloatingVoiceButton() {
  const { isOpen, openVoice } = useVoice();
  
  if (isOpen) return null;
  
  return (
    <Button
      onClick={openVoice}
      className="absolute bottom-20 right-4 h-16 w-16 rounded-full shadow-lg hover:scale-105 transition-transform z-40 bg-primary hover:bg-primary/90 p-1 animate-bounce-subtle"
      size="icon"
    >
      <img src="/images/icc-5.webp" alt="김비서" className="h-10 w-auto object-contain opacity-80" />
    </Button>
  );
}
