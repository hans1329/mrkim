import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Bell, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIChatPanel } from "@/components/chat/AIChatPanel";
import { VoiceOverlay } from "@/components/voice/VoiceOverlay";
import mainIllust from "@/assets/main-illust.webp";
import mainIllust2 from "@/assets/main-illust2.webp";
import qrCode from "@/assets/qr-code.png";
import { Bot } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showBackButton?: boolean;
  onBack?: () => void;
  stickyHeader?: ReactNode;
}

export function AppLayout({
  children,
  title = "김비서",
  subtitle,
  showHeader = true,
  showBackButton = false,
  onBack,
  stickyHeader
}: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex h-[100dvh] overflow-hidden justify-center bg-card lg:gap-8 lg:px-8">
      {/* PC 좌측 마케팅 영역 */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] lg:flex-col lg:justify-center lg:relative">
        <div className="relative z-10 p-8 space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground leading-tight">
              사장님은<br />
              <span className="text-primary">명령만</span> 하세요!
            </h1>
            <p className="text-lg text-muted-foreground flex items-center gap-1">
              실행은 김비서가 합니다 <Bot className="h-5 w-5 text-primary" />
            </p>
          </div>
          <div className="flex justify-center">
            <img src={mainIllust} alt="김비서 일러스트" className="w-full max-w-xs rounded-2xl" />
          </div>
          <div className="flex justify-center">
            <img src={mainIllust2} alt="김비서 일러스트" className="w-72" />
          </div>
          <div className="flex flex-wrap gap-2">
            {["직원관리", "급여계산", "세무처리", "매출분석", "수익창출"].map(tag => (
              <span key={tag} className="px-3 py-1 bg-card/80 backdrop-blur-sm rounded-full text-sm text-foreground border border-border/50">
                {tag}
              </span>
            ))}
          </div>
          {/* 앱 다운로드 통합 박스 */}
          <div className="relative overflow-hidden p-5 bg-card/95 backdrop-blur-md rounded-3xl border border-border/50 shadow-lg">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-secondary/20 rounded-full blur-xl" />
            <div className="relative flex items-center gap-5">
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-2xl">
                  <img src={qrCode} alt="QR Code" className="w-20 h-20" />
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">QR 스캔</p>
              </div>
              <div className="h-20 w-px bg-border/50" />
              <div className="flex-1 space-y-3">
                <p className="text-sm font-semibold text-foreground">📲 앱으로 편리하게 관리하세요!</p>
                <div className="flex flex-col gap-2">
                  <a href="#" className="group inline-flex items-center gap-2.5 px-4 py-2 bg-foreground text-background rounded-xl hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                    </svg>
                    <div className="text-left">
                      <div className="text-[9px] opacity-70 leading-none">Download on the</div>
                      <div className="text-sm font-semibold leading-tight">App Store</div>
                    </div>
                  </a>
                  <a href="#" className="group inline-flex items-center gap-2.5 px-4 py-2 bg-foreground text-background rounded-xl hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 9.99l-2.302 2.302-8.634-8.634z" />
                    </svg>
                    <div className="text-left">
                      <div className="text-[9px] opacity-70 leading-none">GET IT ON</div>
                      <div className="text-sm font-semibold leading-tight">Google Play</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 앱 영역 */}
      <div className="w-full h-full lg:w-[580px] xl:w-[640px] lg:flex-shrink-0" style={{ paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)' }}>
        <div className="relative flex h-full max-w-xl flex-col shadow-2xl lg:max-w-none mx-auto overflow-hidden bg-card">
          <div className={`flex-1 overflow-auto ${stickyHeader ? "[background:linear-gradient(to_bottom,hsl(var(--primary))_50%,hsl(var(--background))_50%)]" : "bg-background"}`} id="app-scroll-container">
            {/* 커스텀 sticky 헤더 (홈 등) - scroll container 직속 자식 */}
            {stickyHeader}

            {/* 서브페이지 전용 미니 헤더 (뒤로가기 있을 때만) */}
            {!stickyHeader && showHeader && showBackButton && (
              <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-1" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.25rem)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={() => {
                      if (onBack) {
                        onBack();
                      } else if (window.history.length > 1) {
                        navigate(-1);
                      } else {
                        navigate("/");
                      }
                    }}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-lg font-bold text-foreground">{title}</h1>
                  </div>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 [&_svg]:!size-5" onClick={() => navigate("/notifications")}>
                    <Bell />
                    <span className="absolute right-0 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                      2
                    </span>
                  </Button>
                </div>
              </header>
            )}

            {/* Main Content */}
            <main className={showBackButton ? "p-4 pb-24 overflow-x-hidden" : stickyHeader ? "overflow-x-hidden relative -mt-[calc(env(safe-area-inset-top,0px)+60px)] pb-24" : "pb-24 overflow-x-hidden"}>
              {children}
            </main>
          </div>


          {/* Bottom Navigation - fixed 하단 고정 */}
          <div className="fixed bottom-0 left-0 right-0 z-20 lg:static">
            <BottomNav />
          </div>

          {/* Voice Overlay - 전체화면 음성 UI */}
          <VoiceOverlay />

          {/* AI Chat Panel - 텍스트 채팅 */}
          <AIChatPanel />
        </div>
      </div>
    </div>
  );
}
