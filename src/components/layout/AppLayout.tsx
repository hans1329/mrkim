import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { Bell, Settings, ChevronLeft, Smartphone, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showHeader?: boolean;
  showBackButton?: boolean;
}

export function AppLayout({ 
  children, 
  title = "김비서", 
  subtitle,
  showHeader = true,
  showBackButton = false
}: AppLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 lg:gap-12 lg:px-8">
      {/* PC 좌측 마케팅 영역 */}
      <div className="hidden lg:flex lg:w-80 lg:flex-col lg:justify-center">
        <div className="space-y-8">
          {/* 로고 및 타이틀 */}
          <div className="space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Smartphone className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">김비서</h1>
              <p className="text-muted-foreground">AI 비즈니스 어시스턴트</p>
            </div>
          </div>

          {/* 앱 설명 */}
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">
              언제 어디서나 업무를 스마트하게
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              직원 관리, 급여 계산, 세무 처리까지<br />
              김비서가 모든 비즈니스 업무를 도와드립니다.
            </p>
          </div>

          {/* 다운로드 링크 */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">앱 다운로드</p>
            <div className="flex flex-col gap-2">
              <a 
                href="#" 
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="w-4 h-4" />
                App Store
              </a>
              <a 
                href="#" 
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Download className="w-4 h-4" />
                Google Play
              </a>
            </div>
          </div>

          {/* QR 코드 */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">QR로 다운로드</p>
            <div className="bg-card rounded-xl p-3 border border-border/50 inline-block">
              <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground">QR Code</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 앱 영역 */}
      <div className="w-full h-full lg:w-[480px] lg:flex-shrink-0">
        <div className="relative flex h-full max-w-xl flex-col bg-background shadow-2xl lg:max-w-none mx-auto">
          {/* Header */}
          {showHeader && (
            <header className="flex-shrink-0 border-b bg-card/70 backdrop-blur-md px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {showBackButton && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 -ml-2"
                      onClick={() => navigate(-1)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                  )}
                  <div 
                    className={`rounded-lg px-2 py-1 -my-1 transition-colors ${!showBackButton ? "cursor-pointer hover:bg-muted -mx-2" : ""}`}
                    onClick={() => !showBackButton && navigate("/profile")}
                  >
                    <h1 className="text-lg font-bold text-foreground">{title}</h1>
                    {subtitle && (
                      <p className="text-xs text-muted-foreground">{subtitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {/* Notifications */}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-9 w-9"
                    onClick={() => navigate("/notifications")}
                  >
                    <Bell className="h-5 w-5" />
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                      2
                    </span>
                  </Button>

                  {/* Settings */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => navigate("/settings")}
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </header>
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-4 pb-20">
            {children}
          </main>

          {/* Bottom Navigation */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
