import { ReactNode, useState } from "react";

type WeatherState = "sunny" | "partly-cloudy" | "cloudy" | "rainy" | "storm";

interface V2LayoutProps {
  children: ReactNode;
}

export const V2Layout = ({ children }: V2LayoutProps) => {
  const [weather] = useState<WeatherState>("sunny");

  return (
    <div
      data-theme="v2"
      data-weather={weather}
      className="v2-root h-full flex flex-col overflow-hidden relative"
      style={{
        background: "linear-gradient(180deg, #0A0A0F 0%, #12121A 50%, #0E0E16 100%)",
      }}
    >
      {/* Ambient gradient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(88,86,214,0.12) 0%, rgba(0,122,255,0.06) 40%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      <div className="relative z-10 flex flex-col h-full">
        {children}
      </div>
    </div>
  );
};
