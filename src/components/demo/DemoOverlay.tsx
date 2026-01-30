import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, X, ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const demoFeatures = [
  { 
    title: "AI 경영 비서", 
    description: "자연어로 업무를 지시하면 김비서가 실행합니다",
    icon: Bot 
  },
  { 
    title: "자동 세무 처리", 
    description: "부가세, 원천세 신고를 자동으로 처리합니다",
    icon: Sparkles 
  },
  { 
    title: "스마트 자금 관리", 
    description: "남는 돈은 파킹통장으로 자동 이체합니다",
    icon: Lock 
  },
];

export function DemoOverlay() {
  const { isDemo, login } = useAuth();
  const [showOverlay, setShowOverlay] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);
  const [currentFeature, setCurrentFeature] = useState(0);

  // 일정 인터랙션 후 오버레이 표시 (dismissed가 아닐 때만)
  useEffect(() => {
    if (isDemo && interactionCount >= 5 && !showOverlay && !dismissed) {
      setShowOverlay(true);
    }
  }, [interactionCount, isDemo, showOverlay, dismissed]);

  // 자동으로 feature 순환
  useEffect(() => {
    if (showOverlay) {
      const timer = setInterval(() => {
        setCurrentFeature((prev) => (prev + 1) % demoFeatures.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [showOverlay]);

  // 오버레이 닫기
  const handleDismiss = () => {
    setShowOverlay(false);
    setDismissed(true);
  };

  // 전역 클릭 감지 (오버레이가 열려있지 않을 때만)
  useEffect(() => {
    if (!isDemo || showOverlay || dismissed) return;
    
    const handleClick = () => {
      setInteractionCount((prev) => prev + 1);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [isDemo, showOverlay, dismissed]);

  if (!isDemo || !showOverlay) return null;

  const CurrentIcon = demoFeatures[currentFeature].icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 배경 블러 */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleDismiss}
      />
      
      {/* 오버레이 카드 */}
      <div className="relative z-10 mx-4 w-full max-w-md animate-fade-in">
        <div className="rounded-3xl bg-card border shadow-2xl overflow-hidden">
          {/* 상단 그라데이션 */}
          <div className="bg-gradient-to-br from-primary via-primary to-primary/80 p-6 text-primary-foreground">
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={handleDismiss}
            >
              <X className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-foreground/20">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">김비서 체험 중</h2>
                <p className="text-sm text-primary-foreground/70">데모 모드입니다</p>
              </div>
            </div>

            {/* Feature 슬라이더 */}
            <div className="bg-primary-foreground/10 rounded-2xl p-4 min-h-[100px]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/20 shrink-0">
                  <CurrentIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{demoFeatures[currentFeature].title}</h3>
                  <p className="text-sm text-primary-foreground/80 mt-1">
                    {demoFeatures[currentFeature].description}
                  </p>
                </div>
              </div>
              
              {/* 인디케이터 */}
              <div className="flex justify-center gap-2 mt-4">
                {demoFeatures.map((_, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      idx === currentFeature 
                        ? "w-6 bg-primary-foreground" 
                        : "w-1.5 bg-primary-foreground/30"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 하단 CTA */}
          <div className="p-6 space-y-3">
            <Button 
              className="w-full h-12 text-base gap-2"
              onClick={login}
            >
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground"
              onClick={handleDismiss}
            >
              계속 둘러보기
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 데모 모드 배지
export function DemoBadge() {
  const { isDemo, login } = useAuth();
  
  if (!isDemo) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] animate-fade-in">
      <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2 backdrop-blur-sm">
        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-medium text-primary">데모 모드</span>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-6 px-2 text-xs text-primary hover:bg-primary/10"
          onClick={login}
        >
          로그인
        </Button>
      </div>
    </div>
  );
}
