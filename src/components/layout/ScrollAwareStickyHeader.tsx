import { ReactNode, useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ScrollAwareStickyHeaderProps {
  children: (scrolled: boolean) => ReactNode;
  className?: string;
}

export function ScrollAwareStickyHeader({ children, className }: ScrollAwareStickyHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Find the nearest scrollable ancestor
    let scrollParent: HTMLElement | null = el.parentElement;
    while (scrollParent) {
      const overflow = getComputedStyle(scrollParent).overflowY;
      if (overflow === "auto" || overflow === "scroll") break;
      scrollParent = scrollParent.parentElement;
    }
    if (!scrollParent) return;

    const handleScroll = () => {
      setScrolled(scrollParent!.scrollTop > 20);
    };

    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => scrollParent!.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={ref} className={cn("sticky top-0 z-20 transition-all duration-300", className)}>
      {children(scrolled)}
    </div>
  );
}
