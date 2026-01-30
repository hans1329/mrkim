import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Bot, 
  TrendingUp, 
  Users, 
  Calculator, 
  PiggyBank, 
  ArrowRight,
  Sparkles,
  Shield,
  Zap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import mainIllust from "@/assets/main-illust.webp";

const features = [
  {
    icon: Bot,
    title: "AI 경영 비서",
    description: "자연어로 명령하면 김비서가 실행합니다",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: TrendingUp,
    title: "매출/매입 관리",
    description: "실시간 매출 현황과 분석 리포트",
    color: "from-green-500 to-green-600",
  },
  {
    icon: Users,
    title: "직원 관리",
    description: "급여, 4대보험, 퇴사 처리 자동화",
    color: "from-purple-500 to-purple-600",
  },
  {
    icon: Calculator,
    title: "세무 처리",
    description: "부가세, 원천세 신고 자동 처리",
    color: "from-orange-500 to-orange-600",
  },
  {
    icon: PiggyBank,
    title: "자금 관리",
    description: "파킹통장 자동이체, 예금 관리",
    color: "from-pink-500 to-pink-600",
  },
  {
    icon: Shield,
    title: "안전한 데이터",
    description: "금융권 수준의 보안으로 데이터 보호",
    color: "from-slate-500 to-slate-600",
  },
];

export function WelcomePage() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* 모바일 레이아웃 */}
      <div className="lg:hidden">
        <MobileWelcome onLogin={login} />
      </div>

      {/* PC 레이아웃 */}
      <div className="hidden lg:block">
        <PCWelcome onLogin={login} />
      </div>
    </div>
  );
}

function MobileWelcome({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground">김비서</span>
          </div>
          <Button size="sm" onClick={onLogin}>
            시작하기
          </Button>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="px-4 py-8 text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          AI 기반 백오피스 자동화
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          사장님은 <span className="text-primary">명령만</span> 하세요
        </h1>
        <p className="text-muted-foreground">
          실행은 김비서가 합니다
        </p>
        
        {/* 일러스트 */}
        <div className="mt-6 flex justify-center">
          <img 
            src={mainIllust} 
            alt="김비서 일러스트" 
            className="w-48 h-48 object-contain"
          />
        </div>
      </section>

      {/* 기능 카드 그리드 */}
      <section className="px-4 pb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4">주요 기능</h2>
        <div className="grid grid-cols-2 gap-3">
          {features.slice(0, 4).map((feature) => (
            <FeatureCard key={feature.title} {...feature} compact />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-auto p-4 border-t bg-card">
        <Button className="w-full h-12 text-base gap-2" onClick={onLogin}>
          무료로 시작하기
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          가입 시 30일 무료 체험
        </p>
      </section>
    </div>
  );
}

function PCWelcome({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex min-h-screen">
      {/* 좌측 히어로 영역 */}
      <div className="w-1/2 flex flex-col justify-center p-12 lg:p-16">
        <div className="max-w-lg">
          {/* 로고 */}
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">김비서</span>
          </div>

          {/* 타이틀 */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI 기반 백오피스 자동화
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4">
            사장님은<br />
            <span className="text-primary">명령만</span> 하세요
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            실행은 김비서가 합니다
          </p>

          {/* 특징 태그 */}
          <div className="flex flex-wrap gap-2 mb-8">
            {["직원관리", "급여계산", "세무처리", "매출분석", "수익창출"].map((tag) => (
              <span 
                key={tag} 
                className="px-3 py-1.5 bg-muted rounded-full text-sm text-foreground"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* CTA 버튼 */}
          <div className="flex gap-3">
            <Button size="lg" className="h-12 px-8 text-base gap-2" onClick={onLogin}>
              무료로 시작하기
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 text-base">
              자세히 알아보기
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            <Zap className="h-3.5 w-3.5 inline mr-1" />
            가입 시 30일 무료 체험 · 신용카드 불필요
          </p>
        </div>
      </div>

      {/* 우측 기능 카드 그리드 */}
      <div className="w-1/2 bg-muted/30 p-12 lg:p-16 flex items-center">
        <div className="w-full max-w-xl mx-auto">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            김비서가 도와드리는 업무
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  color,
  compact = false 
}: { 
  icon: typeof Bot; 
  title: string; 
  description: string; 
  color: string;
  compact?: boolean;
}) {
  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-card">
      <CardContent className={compact ? "p-3" : "p-4"}>
        <div 
          className={`${compact ? "h-8 w-8 mb-2" : "h-10 w-10 mb-3"} rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}
        >
          <Icon className={`${compact ? "h-4 w-4" : "h-5 w-5"} text-white`} />
        </div>
        <h3 className={`font-semibold text-foreground ${compact ? "text-sm mb-0.5" : "mb-1"}`}>
          {title}
        </h3>
        <p className={`text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
          {description}
        </p>
      </CardContent>
    </Card>
  );
}
