import { useRef, useEffect } from "react";
import { Menu, Mic } from "lucide-react";
import { useV2Voice } from "./V2VoiceContext";

// Reactive wave path for oscilloscope
const ReactiveWavePath = ({
  volumeRef, baseAmplitude, maxBoost, stroke, strokeWidth, freq, speed, phase,
}: {
  volumeRef: React.RefObject<number>;
  baseAmplitude: number; maxBoost: number;
  stroke: string; strokeWidth: number;
  freq: number; speed: number; phase: number;
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const animRef = useRef<number>();

  useEffect(() => {
    const animate = () => {
      const el = pathRef.current;
      if (!el) return;
      const t = Date.now() / 1000;
      const vol = volumeRef.current ?? 0;
      const amp = baseAmplitude + vol * maxBoost;
      const points: string[] = [];
      for (let x = 0; x <= 260; x += 3) {
        const y = 16 + Math.sin(x * freq + t * speed + phase) * amp
          + Math.sin(x * freq * 1.7 + t * speed * 0.7 + phase * 0.5) * amp * 0.3;
        points.push(`${x === 0 ? "M" : "L"}${x},${y.toFixed(1)}`);
      }
      el.setAttribute("d", points.join(" "));
      animRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [volumeRef, baseAmplitude, maxBoost, freq, speed, phase]);

  return <path ref={pathRef} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" />;
};

interface V2HeaderProps {
  onMenuOpen: () => void;
}

export const V2Header = ({ onMenuOpen }: V2HeaderProps) => {
  const { isConnected, volumeRef, toggleVoice } = useV2Voice();

  const baseAmplitude = 2;
  const maxBoost = 14;

  return (
    <div
      className="relative z-20 flex items-center gap-3 px-4 pt-3 pb-2"
      style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      {/* Hamburger */}
      <button
        onClick={onMenuOpen}
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <Menu className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
      </button>

      {/* Oscilloscope area */}
      <div className="flex-1 h-8 overflow-hidden rounded-xl relative"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <svg viewBox="0 0 260 32" preserveAspectRatio="none" className="w-full h-full" style={{ filter: "blur(0.8px)" }}>
          <defs>
            <linearGradient id="hwave1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#007AFF" stopOpacity="0" />
              <stop offset="30%" stopColor="#007AFF" stopOpacity="0.6" />
              <stop offset="50%" stopColor="#5856D6" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#AF52DE" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#AF52DE" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="hwave2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B9D" stopOpacity="0" />
              <stop offset="25%" stopColor="#FF6B9D" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#007AFF" stopOpacity="0.4" />
              <stop offset="75%" stopColor="#34C759" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#34C759" stopOpacity="0" />
            </linearGradient>
          </defs>
          <ReactiveWavePath volumeRef={volumeRef} baseAmplitude={baseAmplitude} maxBoost={maxBoost}
            stroke="url(#hwave1)" strokeWidth={2} freq={0.024} speed={1.8} phase={0} />
          <ReactiveWavePath volumeRef={volumeRef} baseAmplitude={baseAmplitude * 0.6} maxBoost={maxBoost * 0.5}
            stroke="url(#hwave2)" strokeWidth={1.4} freq={0.032} speed={2.3} phase={1.5} />
        </svg>
      </div>

      {/* Mic toggle */}
      <button
        onClick={toggleVoice}
        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition-colors duration-200"
        style={{
          background: isConnected ? "rgba(0,122,255,0.2)" : "rgba(255,255,255,0.06)",
        }}
      >
        <Mic className="w-4.5 h-4.5" style={{ color: isConnected ? "#007AFF" : "rgba(255,255,255,0.35)" }} />
      </button>
    </div>
  );
};
