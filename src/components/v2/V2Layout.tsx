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
      className="v2-root h-full flex flex-col overflow-hidden"
      style={{ background: "#FFFFFF" }}
    >
      {children}
    </div>
  );
};
