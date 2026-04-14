import { ReactNode, useState } from "react";
import { V2VoiceProvider } from "./V2VoiceContext";
import { V2Header } from "./V2Header";
import { V2NavigationDrawer } from "./V2NavigationDrawer";

interface V2LayoutProps {
  children: ReactNode;
}

export const V2Layout = ({ children }: V2LayoutProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <V2VoiceProvider>
      <div
        data-theme="v2"
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

        {/* Header */}
        <V2Header onMenuOpen={() => setDrawerOpen(true)} />

        <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
          {children}
        </div>

        {/* Navigation Drawer */}
        <V2NavigationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>
    </V2VoiceProvider>
  );
};
