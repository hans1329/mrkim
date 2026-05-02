import { useState, useEffect, useRef } from "react";

/**
 * Animates a number from 0 to the target value.
 * Returns the current display value as a formatted string.
 */
export function useCountUp(
  target: number,
  options?: {
    duration?: number; // ms, default 1200
    delay?: number; // ms, default 0
    formatter?: (n: number) => string;
    enabled?: boolean;
  }
): string {
  const duration = options?.duration ?? 1200;
  const delay = options?.delay ?? 0;
  const enabled = options?.enabled ?? true;
  const formatter = options?.formatter ?? ((n: number) => n.toLocaleString());

  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>();

  useEffect(() => {
    if (!enabled || target === 0) {
      setCurrent(target);
      return;
    }

    setCurrent(0);

    const timeoutId = setTimeout(() => {
      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const animate = (timestamp: number) => {
        if (!startRef.current) startRef.current = timestamp;
        const elapsed = timestamp - startRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);

        setCurrent(Math.round(easedProgress * target));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        }
      };

      startRef.current = undefined;
      rafRef.current = requestAnimationFrame(animate);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, delay, enabled]);

  return formatter(current);
}
