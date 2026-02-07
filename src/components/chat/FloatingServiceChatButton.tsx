import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useServiceChat } from "@/contexts/ServiceChatContext";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

const DEFAULT_ICON = "/images/icc-5.webp";

export function FloatingServiceChatButton() {
  const { isVoiceOpen, isChatOpen, openVoice } = useServiceChat();
  const { profile } = useProfile();

  const avatarUrl = profile?.secretary_avatar_url || null;
  const imgSrc = avatarUrl || DEFAULT_ICON;
  const isHidden = isVoiceOpen || isChatOpen;

  // 이미지 프리로딩 & 캐싱
  const preloadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!preloadedRef.current.has(imgSrc)) {
      const img = new Image();
      img.src = imgSrc;
      preloadedRef.current.add(imgSrc);
    }
  }, [imgSrc]);

  return (
    <Button
      onClick={openVoice}
      className={cn(
        "fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:scale-105 transition-all z-40 bg-primary hover:bg-primary/90 p-1 animate-bounce-subtle overflow-hidden ring-2 ring-white",
        isHidden ? "opacity-0 pointer-events-none scale-90" : "opacity-100"
      )}
      size="icon"
    >
      <img
        src={imgSrc}
        alt="김비서"
        className={cn(
          "object-contain opacity-90",
          avatarUrl ? "h-14 w-14 rounded-full object-cover" : "h-12 w-12"
        )}
        loading="eager"
        decoding="async"
      />
    </Button>
  );
}
