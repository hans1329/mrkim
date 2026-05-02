import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
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
    title: "AI 비서 구독",
    description: "사장님 대신 일하는 AI",
    icon: Sparkles,
    price: "월 ₩30,000",
    features: ["AI한테 말로 시키기", "매출/지출 자동 정리", "직원 급여 알아서 처리", "오늘 장사 어땠는지 브리핑"],
    color: "primary",
    badge: "기본",
  },
  {
    id: "programmable",
    title: "자동 자금 관리",
    description: "규칙 정하면 돈이 알아서 움직여요",
    icon: Zap,
    price: "무료",
    features: ["세금 10% 따로 모으기", "월급날 전에 미리 준비", "조건 맞으면 자동 이체", "사장님은 신경 안 써도 OK"],
    color: "warning",
    badge: "핵심",
  },
  {
    id: "investment",
    title: "남는 돈 굴리기",
    description: "안 쓰는 돈으로 이자 받기",
    icon: PiggyBank,
    price: "매달 이자 +₩5만",
    features: ["파킹통장 자동 이체", "연 2~3% 이자", "필요할 때 바로 출금", "예금자 보호 적용"],
    color: "success",
    badge: "수익",
  },
  {
    id: "loan",
    title: "급할 때 빌리기",
    description: "매출 보고 1분 만에 승인",
    icon: Banknote,
    price: "연 5.9%~",
    features: ["최대 5천만원까지", "서류 없이 1분 승인", "매출 기록으로 심사", "미리 갚아도 수수료 없음"],
    color: "primary",
    badge: "긴급",
  },
  {
    id: "payment",
    title: "수수료 절약 결제",
    description: "카드 수수료 반으로 줄이기",
    icon: CreditCard,
    price: "수수료 0.5%",
    features: ["기존 대비 50% 절약", "정산 바로바로", "해외 송금도 저렴하게", "24시간 가능"],
    color: "secondary",
    badge: "준비 중",
    comingSoon: true,
  },
];

const benefits = [
  { icon: Shield, title: "안전하게", description: "예금자 보호 적용" },
  { icon: TrendingUp, title: "이자 받기", description: "남는 돈 자동 굴리기" },
  { icon: Zap, title: "자동으로", description: "귀찮은 일 알아서" },
  { icon: Wallet, title: "한눈에", description: "돈 흐름 깔끔 정리" },
];

export default function FinancialServices() {
  const navigate = useNavigate();

  return (
    <MainLayout title="김비서 서비스" subtitle="사장님을 위한 금융 기능" showBackButton>
      <div className="space-y-6">
        {/* 히어로 섹션 */}
        <div className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-5 text-primary-foreground">
          <Badge className="mb-3 bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30">
            사장님 전용
          </Badge>
          <h2 className="text-xl font-bold mb-2">
            사장님은 장사에만<br />집중하세요
          </h2>
          <p className="text-sm opacity-90 mb-4">
            세금 모으기, 월급 주기, 남는 돈 굴리기...<br />
            귀찮은 돈 관리는 김비서가 알아서 해요.
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
        <div className="grid grid-cols-4 gap-2">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="text-center">
              <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <benefit.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="text-xs font-medium">{benefit.title}</p>
            </div>
          ))}
        </div>

        {/* 서비스 목록 */}
        <div className="space-y-3">
          <h3 className="font-semibold">이런 것들을 해드려요</h3>
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
              월 3만원으로 귀찮은 돈 관리에서 해방!
            </p>
            <Button className="w-full" onClick={() => navigate("/")}>
              무료 체험하기
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
