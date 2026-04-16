import { ReactNode, useState } from "react";
import { V2VoiceProvider } from "./V2VoiceContext";
import { V2Header } from "./V2Header";
import { V2NavigationDrawer } from "./V2NavigationDrawer";
import { V2PCProvider } from "./V2PCContext";
import { V2ChatHistoryPanel } from "./V2ChatHistoryPanel";
import { V2DetailPanel } from "./V2DetailPanel";
import { useIsMobile } from "@/hooks/use-mobile";

interface V2LayoutProps {
  children: ReactNode;
  hideHeader?: boolean;
}

export const V2Layout = ({ children, hideHeader = false }: V2LayoutProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useIsMobile();

  const bgStyle = {
    background: "linear-gradient(180deg, #0A0A0F 0%, #12121A 50%, #0E0E16 100%)",
  };

  // PC: 3-panel layout
  if (!isMobile) {
    return (
      <V2VoiceProvider>
        <V2PCProvider>
          <div
            data-theme="v2"
            className="v2-root h-full flex flex-col overflow-hidden relative"
            style={bgStyle}
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
            {!hideHeader && (
              <V2Header isDrawerOpen={drawerOpen} onToggleDrawer={() => setDrawerOpen(prev => !prev)} />
            )}

            {/* 3-panel body */}
            <div className="relative z-10 flex flex-1 overflow-hidden">
              {/* Left: Chat History */}
              <div className="w-[300px] min-w-[260px] flex-shrink-0 overflow-hidden">
                <V2ChatHistoryPanel />
              </div>

              {/* Center: Feed (same as mobile) */}
              <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {children}
              </div>

              {/* Right: Detail Panel */}
              <div className="w-[340px] min-w-[280px] flex-shrink-0 overflow-hidden">
                <V2DetailPanel />
              </div>
            </div>

            {/* Navigation Drawer */}
            <V2NavigationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
          </div>
        </V2PCProvider>
      </V2VoiceProvider>
    );
  }

  // Mobile: single column (unchanged)
  return (
    <V2VoiceProvider>
      <V2PCProvider>
        <div
          data-theme="v2"
          className="v2-root h-full flex flex-col overflow-hidden relative"
          style={bgStyle}
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
          {!hideHeader && <V2Header isDrawerOpen={drawerOpen} onToggleDrawer={() => setDrawerOpen(prev => !prev)} />}

          <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
            {children}
          </div>

          {/* Navigation Drawer */}
          <V2NavigationDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        </div>
      </V2PCProvider>
    </V2VoiceProvider>
  );
};
