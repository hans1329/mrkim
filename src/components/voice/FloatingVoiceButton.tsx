import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useVoice } from "@/contexts/VoiceContext";
import { useChat } from "@/contexts/ChatContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { cn } from "@/lib/utils";

const DEFAULT_ICON = "/images/icc-5.webp";

export function FloatingVoiceButton() {
  const { isOpen: isVoiceOpen, openVoice } = useVoice();
  const { isOpen: isChatOpen } = useChat();
  const isMobile = useIsMobile();
  const { profile, loading } = useProfileQuery();

  const avatarUrl = profile?.secretary_avatar_url || null;
  const imgSrc = avatarUrl || DEFAULT_ICON;

  // 이미지 프리로딩 & 캐싱
  const preloadedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!preloadedRef.current.has(imgSrc)) {
      const img = new Image();
      img.src = imgSrc;
      preloadedRef.current.add(imgSrc);
    }
  }, [imgSrc]);

  if (isVoiceOpen || isChatOpen) return null;

  return (
    <Button
      onClick={openVoice}
      size="lg"
      className={cn(
        "h-16 w-16 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all z-50 bg-primary hover:bg-primary/90 p-0 animate-bounce-subtle overflow-hidden ring-2 ring-white",
        isMobile
          ? "absolute bottom-20 right-4"
          : "fixed bottom-6 right-6"
      )}
    >
      <img
        src={imgSrc}
        alt="김비서"
        className={cn(
          "rounded-full",
          avatarUrl
            ? "h-full w-full object-cover"
            : "h-10 w-10 object-contain"
        )}
        loading="eager"
        decoding="async"
      />
    </Button>
  );
}
