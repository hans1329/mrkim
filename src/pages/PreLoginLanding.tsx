import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, ArrowRight, Shield, Zap, TrendingUp, Calculator, Users, FileText, Phone, MessageCircle } from "lucide-react";
import mainIllust from "@/assets/main-illust.webp";
import mainIllust2 from "@/assets/main-illust2.webp";
import qrCode from "@/assets/qr-code.png";

const PreLoginLanding = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Calculator, title: "세무 자동화", description: "홈택스 연동으로 세금 신고 자동 처리" },
    { icon: Users, title: "직원 관리", description: "급여 계산부터 4대보험까지 원클릭" },
    { icon: TrendingUp, title: "매출 분석", description: "실시간 매출/비용 현황 한눈에" },
    { icon: FileText, title: "리포트", description: "월간 경영 보고서 자동 생성" },
  ];

  const benefits = [
    { icon: Zap, text: "3분 만에 시작", highlight: true },
    { icon: Shield, text: "금융보안 인증 완료" },
    { icon: Phone, text: "24시간 AI 상담" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">김비서</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              로그인
            </Button>
            <Button onClick={() => navigate("/login")}>
              무료 시작
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden flex-1 flex items-center">
        <div className="max-w-4xl mx-auto px-4 py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
            {/* Left: Text Content */}
            <div className="space-y-5 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full text-sm font-medium text-primary">
                <Zap className="h-4 w-4" />
                사업자를 위한 AI 비서
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-black leading-tight">
                사장님은<br />
                <span className="text-primary">명령만</span> 하세요!
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                세금, 급여, 매출 관리까지<br className="lg:hidden" />
                <span className="font-semibold text-foreground">실행은 김비서가 합니다</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  className="h-14 px-8 text-lg font-bold gap-2 rounded-xl"
                  onClick={() => navigate("/login")}
                >
                  <Bot className="h-5 w-5" />
                  무료로 시작하기
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="h-14 px-8 text-lg font-medium rounded-xl"
                  onClick={() => navigate("/landing")}
                >
                  <Calculator className="h-5 w-5 mr-2" />
                  생존 기간 테스트
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
                {benefits.map((benefit, i) => (
                  <div 
                    key={i}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                      benefit.highlight 
                        ? 'bg-primary/10 text-primary font-medium' 
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <benefit.icon className="h-4 w-4" />
                    {benefit.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Illustration */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <img 
                  src={mainIllust} 
                  alt="김비서 AI" 
                  className="w-72 lg:w-96"
                />
                {/* Floating Chat Bubble */}
                <div className="absolute -left-4 -top-2 bg-card p-3 rounded-2xl shadow-lg border animate-fade-in">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">"이번 달 세금 얼마야?"</span>
                  </div>
                </div>
                {/* Floating Response */}
                <div className="absolute -right-4 top-[85%] bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg animate-fade-in" style={{ animationDelay: '0.2s' }}>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    <span className="text-sm font-medium">부가세 320만원 예정</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-14 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold mb-3">
              사업 운영, 이제 <span className="text-primary">AI가</span> 대신합니다
            </h2>
            <p className="text-muted-foreground">
              복잡한 업무는 김비서에게 맡기고 사장님은 본업에 집중하세요
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <Card 
                key={i} 
                className="border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card/90 backdrop-blur overflow-hidden group"
              >
                <CardContent className="p-5 text-center">
                  <div className="mb-4 flex justify-center">
                    <feature.icon className="h-12 w-12 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-10">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-8 flex-wrap justify-center">
            <div>
              <p className="text-3xl font-black text-primary">3분</p>
              <p className="text-xs text-muted-foreground">초기 설정 완료</p>
            </div>
            <div className="w-px h-10 bg-border hidden sm:block" />
            <div>
              <p className="text-3xl font-black text-primary">무료</p>
              <p className="text-xs text-muted-foreground">기본 기능 평생</p>
            </div>
            <div className="w-px h-10 bg-border hidden sm:block" />
            <div>
              <p className="text-3xl font-black text-primary">24시간</p>
              <p className="text-xs text-muted-foreground">AI 상담 지원</p>
            </div>
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="py-10 bg-muted/30">
        <div className="max-w-xl mx-auto px-4">
          <Card className="border-0 shadow-xl overflow-hidden bg-card/95 backdrop-blur">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* QR Code */}
                <div className="flex-shrink-0 text-center">
                  <div className="p-3 bg-background rounded-2xl shadow-inner">
                    <img src={qrCode} alt="QR Code" className="w-24 h-24" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">QR 스캔</p>
                </div>
                
                <div className="hidden sm:block w-px h-24 bg-border" />
                
                {/* Store Buttons */}
                <div className="flex-1 space-y-3 text-center sm:text-left">
                  <p className="font-semibold text-foreground">📲 앱으로 더 편리하게!</p>
                  
                  <div className="flex flex-col gap-2">
                    <a href="#" className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                      </svg>
                      <div className="text-left">
                        <div className="text-[9px] opacity-70 leading-none">Download on the</div>
                        <div className="text-sm font-semibold leading-tight">App Store</div>
                      </div>
                    </a>

                    <a href="#" className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 bg-foreground text-background rounded-xl hover:opacity-90 transition-opacity">
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
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="mb-6">
            <img src={mainIllust2} alt="김비서" className="w-56 mx-auto" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold mb-2">
            지금 바로 시작하세요
          </h2>
          <p className="text-muted-foreground text-sm mb-5">
            연결만 하면 김비서가 알아서 합니다
          </p>
          <Button 
            size="lg" 
            className="h-12 px-8 text-base font-bold gap-2 rounded-xl"
            onClick={() => navigate("/login")}
          >
            <Bot className="h-5 w-5" />
            무료로 시작하기
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-semibold">김비서</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">이용약관</a>
              <a href="#" className="hover:text-foreground transition-colors">개인정보처리방침</a>
              <a href="#" className="hover:text-foreground transition-colors">고객센터</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PreLoginLanding;
