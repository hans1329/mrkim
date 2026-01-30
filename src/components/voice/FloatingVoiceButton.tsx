import { Button } from "@/components/ui/button";
import { AudioLines } from "lucide-react";
import { useVoice } from "@/contexts/VoiceContext";

export function FloatingVoiceButton() {
  const { isOpen, openVoice } = useVoice();
  
  if (isOpen) return null;
  
  return (
    <Button
      onClick={openVoice}
      className="absolute bottom-20 right-4 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform z-40 bg-gradient-to-br from-primary to-primary/80"
      size="icon"
    >
      <AudioLines className="h-8 w-8" />
    </Button>
  );
}
