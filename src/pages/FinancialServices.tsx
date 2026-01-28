import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  TrendingUp,
  Banknote,
  CreditCard,
  Shield,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Zap,
  PiggyBank,
  ArrowRight,
} from "lucide-react";

const services = [
  {
    id: "subscription",
    title: "AI ERP 구독",
    description: "AI 에이전트 + 백오피스 자동화",
    icon: Sparkles,
    price: "월 ₩30,000",
    features: ["AI 비서 무제한 사용", "매출/매입 자동 관리", "직원 급여 자동화", "실시간 경영 브리핑"],
    color: "primary",
    badge: "기본 서비스",
  },
  {
    id: "programmable",
    title: "프로그래머블 머니",
    description: "자금을 규칙대로 자동 실행",
    icon: Zap,
    price: "무료",
    features: ["부가세 10% 자동 분리", "급여 자동 적립", "조건부 자동이체", "스마트 컨트랙트 기반"],
    color: "warning",
    badge: "핵심 기능",
  },
  {
    id: "investment",
    title: "예치금 운용",
    description: "유휴 자금으로 추가 수익 창출",
    icon: PiggyBank,
    price: "연 3~4% 수익",
    features: ["MMF 자동 운용", "국채/안전 자산 투자", "언제든 출금 가능", "원금 보장형 상품"],
    color: "success",
    badge: "수익 창출",
  },
  {
    id: "loan",
    title: "단기 대출 연결",
    description: "매출 기반 AI 신용평가",
    icon: Banknote,
    price: "연 5.9%~",
    features: ["최대 5천만원 한도", "1분 내 승인", "매출 데이터 기반 심사", "조기 상환 수수료 無"],
    color: "primary",
    badge: "긴급 자금",
  },
  {
    id: "payment",
    title: "스테이블코인 결제",
    description: "저렴한 수수료로 송금/결제",
    icon: CreditCard,
    price: "0.5% 수수료",
    features: ["기존 PG 대비 50% 절감", "실시간 정산", "해외 송금 지원", "24시간 운영"],
    color: "secondary",
    badge: "출시 예정",
    comingSoon: true,
  },
];

const benefits = [
  { icon: Shield, title: "안전한 자금 관리", description: "예금자 보호 및 안전 자산 운용" },
  { icon: TrendingUp, title: "추가 수익 창출", description: "유휴 자금 자동 운용으로 수익" },
  { icon: Zap, title: "업무 자동화", description: "반복 업무를 AI가 대신 처리" },
  { icon: Wallet, title: "자금 흐름 최적화", description: "프로그래머블 머니로 효율화" },
];

export default function FinancialServices() {
  const navigate = useNavigate();

  return (
    <MainLayout title="금융 서비스" subtitle="김비서의 금융 인프라" showBackButton>
      <div className="space-y-6">
        {/* 히어로 섹션 */}
        <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-5 text-primary-foreground">
          <Badge className="mb-3 bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30">
            AI 금융 자동화
          </Badge>
          <h2 className="text-xl font-bold mb-2">
            단순 ERP가 아닌,<br />금융 인프라입니다
          </h2>
          <p className="text-sm opacity-90 mb-4">
            김비서는 프로그래머블 머니를 기반으로<br />
            자금 관리부터 수익 창출까지 자동화합니다.
          </p>
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={() => navigate("/funds")}
          >
            자금 관리 시작하기
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* 핵심 혜택 */}
        <div className="grid grid-cols-2 gap-2">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="border-0 bg-muted/50">
              <CardContent className="p-3">
                <benefit.icon className="h-5 w-5 text-primary mb-2" />
                <p className="text-sm font-medium">{benefit.title}</p>
                <p className="text-xs text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 서비스 목록 */}
        <div className="space-y-3">
          <h3 className="font-semibold">서비스 구성</h3>
          {services.map((service) => (
            <Card 
              key={service.id} 
              className={`transition-all ${service.comingSoon ? "opacity-60" : "cursor-pointer hover:shadow-md"}`}
              onClick={() => !service.comingSoon && navigate("/funds")}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-${service.color}/10`}>
                    <service.icon className={`h-5 w-5 text-${service.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{service.title}</p>
                      <Badge 
                        variant={service.comingSoon ? "outline" : "secondary"} 
                        className="text-xs"
                      >
                        {service.badge}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{service.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary">{service.price}</span>
                      {!service.comingSoon && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>
                {/* 기능 목록 */}
                <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-1.5">
                  {service.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                      <span className="text-xs text-muted-foreground">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <Card className="border-2 border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary mb-2" />
            <p className="font-semibold mb-1">지금 시작하세요</p>
            <p className="text-sm text-muted-foreground mb-3">
              월 ₩30,000으로 모든 금융 서비스를 이용하세요
            </p>
            <Button className="w-full" onClick={() => navigate("/")}>
              무료 체험 시작
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
