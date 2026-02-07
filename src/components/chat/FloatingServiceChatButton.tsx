import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useServiceChat } from "@/contexts/ServiceChatContext";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { cn } from "@/lib/utils";

const DEFAULT_ICON = "/images/icc-5.webp";

export function FloatingServiceChatButton() {
  const { isVoiceOpen, isChatOpen, openVoice } = useServiceChat();
  const { profile, loading } = useProfileQuery();

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
        "fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg hover:scale-105 transition-all z-40 bg-white hover:bg-white/90 p-0 animate-bounce-subtle overflow-hidden ring-2 ring-white",
        isHidden ? "opacity-0 pointer-events-none scale-90" : "opacity-100"
      )}
      size="icon"
    >
      <img
        src={imgSrc}
        alt="김비서"
        className="h-full w-full rounded-full object-cover"
        loading="eager"
        decoding="async"
      />
    </Button>
  );
}
