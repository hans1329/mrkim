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
    <div className="flex min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* PC 좌측 마케팅 영역 */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:items-end lg:pr-12 lg:py-8">
        <div className="max-w-md text-right space-y-6">
          {/* 일러스트 영역 */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-2xl" />
            <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50">
              <div className="flex justify-end mb-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
                  <Smartphone className="w-10 h-10 text-primary-foreground" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">김비서</h1>
              <p className="text-muted-foreground text-lg">
                AI 기반 스마트 비즈니스 어시스턴트
              </p>
            </div>
          </div>

          {/* 앱 설명 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              언제 어디서나 업무를 스마트하게
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              직원 관리, 급여 계산, 세무 처리까지<br />
              김비서가 모든 비즈니스 업무를 도와드립니다.
            </p>
          </div>

          {/* 다운로드 버튼 */}
          <div className="space-y-3">
            <Button 
              size="lg" 
              className="w-full max-w-xs ml-auto gap-2 bg-foreground text-background hover:bg-foreground/90"
            >
              <Download className="w-5 h-5" />
              App Store에서 다운로드
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="w-full max-w-xs ml-auto gap-2"
            >
              <Download className="w-5 h-5" />
              Google Play에서 다운로드
            </Button>
          </div>

          {/* QR 코드 영역 */}
          <div className="flex justify-end">
            <div className="bg-card rounded-xl p-4 border border-border/50 text-center">
              <div className="w-24 h-24 bg-muted rounded-lg mb-2 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">QR Code</span>
              </div>
              <p className="text-xs text-muted-foreground">스캔하여 앱 다운로드</p>
            </div>
          </div>
        </div>
      </div>

      {/* 앱 영역 (우측) */}
      <div className="w-full lg:w-auto lg:flex-shrink-0">
        <div className="relative mx-auto flex min-h-screen max-w-xl flex-col bg-background shadow-2xl lg:mx-0 lg:ml-0">
          {/* Header */}
          {showHeader && (
            <header className="sticky top-0 z-40 border-b bg-card/70 backdrop-blur-md px-4 py-3 pt-[calc(env(safe-area-inset-top)+12px)]">
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
          <main className="flex-1 overflow-auto p-4 pb-24">
            {children}
          </main>

          {/* Bottom Navigation */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
