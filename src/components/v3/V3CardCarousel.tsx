import {
  Children,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * V3 제네릭 카드 캐러셀.
 *
 * - 자식 노드 배열을 그대로 스와이프 가능한 캐러셀로 래핑
 * - 자동 스크롤 + 수동 스와이프
 * - 사용자 인터랙션 시 일정 시간 동안 자동 스크롤 일시중지
 * - 무한 루프 (앞뒤 클론 + scrollend 디바운스 텔레포트)
 * - dot indicator
 *
 * 사용 예:
 *   <V3CardCarousel autoScrollMs={5000}>
 *     <V3CashRunwayCard />
 *     <V3BepProgressCard />
 *     <V3MissedReceiptCard />
 *   </V3CardCarousel>
 */

interface V3CardCarouselProps {
  children: ReactNode;
  /** 자동 스크롤 간격 (ms). 0 또는 미지정 = 비활성. */
  autoScrollMs?: number;
  /** 사용자 인터랙션 후 자동 스크롤 재개까지 대기 시간 (ms). */
  pauseAfterInteractionMs?: number;
  /** 카드 사이 여백 (Tailwind 간격 유닛). 기본 2(0.5rem). */
  gap?: number;
  /** 컨테이너 여백 제거 여부. */
  className?: string;
}

export function V3CardCarousel({
  children,
  autoScrollMs = 6000,
  pauseAfterInteractionMs = 8000,
  className = "",
}: V3CardCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const pauseTimerRef = useRef<number | null>(null);

  const baseItems = useMemo(() => {
    return Children.toArray(children).filter((c) => c !== null && c !== undefined);
  }, [children]);

  // 무한 루프: [last, ...all, first]
  const items = useMemo(() => {
    if (baseItems.length <= 1) return baseItems;
    return [baseItems[baseItems.length - 1], ...baseItems, baseItems[0]];
  }, [baseItems]);

  const hasClones = items.length > baseItems.length;

  const scrollToLogical = useCallback((logicalIdx: number, smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = hasClones ? 1 : 0;
    const target = (logicalIdx + offset) * el.clientWidth;
    el.scrollTo({ left: target, behavior: smooth ? "smooth" : "auto" });
  }, [hasClones]);

  // 초기 위치
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;
    requestAnimationFrame(() => {
      el.scrollTo({
        left: hasClones ? el.clientWidth : 0,
        behavior: "auto",
      });
    });
  }, [items.length, hasClones]);

  // 스크롤 핸들링 (settle 감지 + 텔레포트)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;

    let settleTimer: number | null = null;

    const updateIndicator = () => {
      const w = el.clientWidth;
      if (w === 0) return;
      const idx = Math.round(el.scrollLeft / w);
      if (!hasClones) {
        setCurrent(idx);
        return;
      }
      const logical =
        idx <= 0
          ? baseItems.length - 1
          : idx >= items.length - 1
          ? 0
          : idx - 1;
      setCurrent(logical);
    };

    const settle = () => {
      if (!hasClones) return;
      const w = el.clientWidth;
      if (w === 0) return;
      const idx = Math.round(el.scrollLeft / w);
      if (idx >= items.length - 1) {
        el.scrollTo({ left: w, behavior: "auto" });
      } else if (idx <= 0) {
        el.scrollTo({ left: (items.length - 2) * w, behavior: "auto" });
      }
    };

    const handleScroll = () => {
      updateIndicator();
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, 150);
    };

    const supportsScrollEnd =
      typeof (el as HTMLElement & { onscrollend?: unknown }).onscrollend !== "undefined";

    el.addEventListener("scroll", handleScroll, { passive: true });
    if (supportsScrollEnd) el.addEventListener("scrollend", settle);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (supportsScrollEnd) el.removeEventListener("scrollend", settle);
      if (settleTimer !== null) window.clearTimeout(settleTimer);
    };
  }, [items.length, baseItems.length, hasClones]);

  // 자동 스크롤
  useEffect(() => {
    if (paused || baseItems.length <= 1 || autoScrollMs <= 0) return;

    const timer = window.setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const w = el.clientWidth;
      if (w === 0) return;
      const nextLeft = el.scrollLeft + w;
      el.scrollTo({ left: nextLeft, behavior: "smooth" });
    }, autoScrollMs);

    return () => window.clearInterval(timer);
  }, [paused, autoScrollMs, baseItems.length]);

  // 사용자 인터랙션 시 일시중지
  const handleInteract = useCallback(() => {
    setPaused(true);
    if (pauseTimerRef.current !== null) window.clearTimeout(pauseTimerRef.current);
    pauseTimerRef.current = window.setTimeout(() => {
      setPaused(false);
      pauseTimerRef.current = null;
    }, pauseAfterInteractionMs);
  }, [pauseAfterInteractionMs]);

  useEffect(() => {
    return () => {
      if (pauseTimerRef.current !== null) window.clearTimeout(pauseTimerRef.current);
    };
  }, []);

  if (baseItems.length === 0) return null;

  return (
    <div className={className}>
      {/* Carousel track */}
      <div
        ref={scrollRef}
        onTouchStart={handleInteract}
        onPointerDown={handleInteract}
        className="flex overflow-x-auto"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <style>{`
          .v3-carousel-track::-webkit-scrollbar { display: none; }
        `}</style>
        {items.map((node, idx) => (
          <div
            key={idx}
            className="w-full shrink-0"
            style={{ scrollSnapAlign: "start" }}
          >
            {node}
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      {baseItems.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {baseItems.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                handleInteract();
                scrollToLogical(i);
              }}
              aria-label={`${i + 1}번째 카드`}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === current ? 18 : 6,
                background:
                  i === current ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.2)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
