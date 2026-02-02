import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Bot, ArrowRight, Shield, Zap, TrendingUp, Calculator, Users, FileText, Phone, MessageCircle, Link2, Sparkles, CheckCircle2, Star, Mail } from "lucide-react";
import mainIllust from "@/assets/main-illust.webp";
import mainIllust2 from "@/assets/main-illust2.webp";
import qrCode from "@/assets/qr-code.png";
import logo from "@/assets/icc-3.webp";
import logoWhite from "@/assets/icc-white.webp";
import iccBlue from "@/assets/icc-blue.webp";
import icc from "@/assets/icc.webp";

const PreLoginLanding = () => {
  const navigate = useNavigate();
  
  const features = [{
    icon: Calculator,
    title: "세무 자동화",
    description: "홈택스 연동으로 세금 신고 자동 처리"
  }, {
    icon: Users,
    title: "직원 관리",
    description: "급여 계산부터 4대보험까지 원클릭"
  }, {
    icon: TrendingUp,
    title: "매출 분석",
    description: "실시간 매출/비용 현황 한눈에"
  }, {
    icon: FileText,
    title: "리포트",
    description: "월간 경영 보고서 자동 생성"
  }];

  const benefits = [{
    icon: Zap,
    text: "3분 만에 시작",
    highlight: true
  }, {
    icon: Shield,
    text: "금융보안 인증 완료"
  }, {
    icon: Phone,
    text: "24시간 AI 상담"
  }];

  const howItWorks = [{
    step: 1,
    icon: Link2,
    title: "계좌 연동",
    description: "사업용 계좌와 카드를 안전하게 연결하세요"
  }, {
    step: 2,
    icon: Sparkles,
    title: "AI 분석",
    description: "김비서가 자동으로 거래를 분류하고 분석합니다"
  }, {
    step: 3,
    icon: CheckCircle2,
    title: "명령만 하세요",
    description: "세금 신고, 급여 계산 등 필요한 건 말만 하세요!"
  }];

  const testimonials = [{
    name: "김○○ 사장님",
    business: "카페 운영 3년차",
    rating: 5,
    text: "세무사 비용 아끼고 시간도 절약! 이제 세금 걱정 없이 커피에만 집중해요."
  }, {
    name: "이○○ 대표님",
    business: "온라인 쇼핑몰",
    rating: 5,
    text: "직원 급여 계산하느라 매달 스트레스였는데, 이제 원터치로 끝나요."
  }, {
    name: "박○○ 원장님",
    business: "피부과 의원",
    rating: 5,
    text: "매출 분석 리포트 덕분에 어떤 시술이 수익성 좋은지 한눈에 파악돼요."
  }];

  const faqs = [{
    question: "정말 무료인가요?",
    answer: "네! 기본 기능은 평생 무료입니다. 계좌 연동, 매출/지출 분석, AI 상담 등 핵심 기능을 무료로 이용하실 수 있어요. 세무 신고 대행, 급여 자동 이체 등 고급 기능은 프로 플랜에서 제공됩니다."
  }, {
    question: "내 금융 정보는 안전한가요?",
    answer: "물론입니다. 금융보안원 인증을 받은 보안 시스템을 사용하며, 모든 데이터는 암호화되어 저장됩니다. 김비서는 조회만 가능하고 출금이나 이체 권한은 없어요."
  }, {
    question: "어떤 은행/카드사를 연동할 수 있나요?",
    answer: "국내 대부분의 시중은행(국민, 신한, 우리, 하나, 기업 등)과 주요 카드사를 지원합니다. 토스, 카카오뱅크 등 인터넷은행도 연동 가능해요."
  }, {
    question: "세무사가 없어도 되나요?",
    answer: "간단한 세금 신고는 김비서가 자동으로 처리해드려요. 복잡한 세무 상담이 필요하시면 협력 세무사를 연결해드릴 수도 있습니다."
  }];
  return <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="김비서 로고" className="h-6 w-auto opacity-90" />
            <span className="font-bold text-lg">김비서</span>
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
      <section className="relative overflow-hidden flex-1 flex items-center bg-background">
        <div className="max-w-4xl mx-auto px-4 py-12 lg:py-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 items-center">
            {/* Left: Text Content */}
            <div className="space-y-5 text-center lg:text-left">
              
              
              <h1 className="text-4xl lg:text-5xl font-black leading-tight">
                사장님은<br />
                <span className="text-primary">명령만</span> 하세요!
              </h1>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                세금, 급여, 매출 관리까지<br className="lg:hidden" />
                <span className="font-semibold text-foreground">실행은 김비서가 합니다</span>
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button size="lg" className="h-14 px-8 text-lg font-bold gap-2 rounded-xl" onClick={() => navigate("/login")}>
                  <img src={icc} alt="김비서" className="h-6 w-auto" />
                  무료로 시작하기
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-medium rounded-xl" onClick={() => navigate("/landing")}>
                  <Calculator className="h-5 w-5 mr-2" />
                  생존 기간 테스트
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
                {benefits.map((benefit, i) => <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${benefit.highlight ? 'bg-primary/10 text-primary font-medium' : 'bg-muted text-muted-foreground'}`}>
                    <benefit.icon className="h-4 w-4" />
                    {benefit.text}
                  </div>)}
              </div>
            </div>

            {/* Right: Illustration */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative">
                <img src={mainIllust} alt="김비서 AI" className="w-72 lg:w-96" />
                {/* Floating Chat Bubble */}
                <div className="absolute -left-4 -top-2 bg-card p-3 rounded-2xl shadow-lg border animate-fade-in">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium">"이번 달 세금 얼마야?"</span>
                  </div>
                </div>
                {/* Floating Response */}
                <div className="absolute -right-4 top-[85%] bg-primary text-primary-foreground p-3 rounded-2xl shadow-lg animate-fade-in" style={{
                animationDelay: '0.2s'
              }}>
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

      {/* Wave Divider - Hero to How It Works */}
      <div className="relative -mb-1">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-12 lg:h-20" preserveAspectRatio="none">
          <path d="M0 120L60 105C120 90 240 60 360 50C480 40 600 50 720 60C840 70 960 80 1080 75C1200 70 1320 50 1380 40L1440 30V120H0Z" className="fill-muted/30" />
        </svg>
      </div>

      {/* How It Works Section */}
      <section className="py-14 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold mb-3">
              <span className="text-primary">3단계</span>로 시작하세요
            </h2>
            <p className="text-muted-foreground">
              복잡한 설정 없이 바로 시작할 수 있어요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {howItWorks.map((item, i) => (
              <div key={i} className="relative text-center">
                {/* Connector Line */}
                {i < howItWorks.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-primary/20" />
                )}
                
                <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                  <item.icon className="h-8 w-8 text-primary" />
                  <span className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wave Divider - How It Works to Testimonials */}
      <div className="relative -mb-1">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-12 lg:h-20" preserveAspectRatio="none">
          <path d="M0 0V60C60 75 180 90 300 85C420 80 540 55 660 45C780 35 900 40 1020 55C1140 70 1260 95 1380 100L1440 105V0H0Z" className="fill-muted/30" />
          <path d="M0 120L48 105C96 90 192 60 288 55C384 50 480 70 576 80C672 90 768 90 864 80C960 70 1056 50 1152 45C1248 40 1344 50 1392 55L1440 60V120H0Z" className="fill-white dark:fill-card" />
        </svg>
      </div>

      {/* Testimonials Section */}
      <section className="py-14 bg-white dark:bg-card">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold mb-3">
              사장님들의 <span className="text-primary">생생한 후기</span>
            </h2>
            <p className="text-muted-foreground">
              이미 많은 사장님들이 김비서와 함께하고 있어요
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((review, i) => (
              <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-5">
                  {/* Stars */}
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(review.rating)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  
                  {/* Quote */}
                  <p className="text-sm text-foreground mb-4 leading-relaxed">
                    "{review.text}"
                  </p>
                  
                  {/* Author */}
                  <div className="pt-3 border-t">
                    <p className="font-semibold text-sm">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.business}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Wave Divider - Testimonials to FAQ */}
      <div className="relative -mb-1">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-12 lg:h-20" preserveAspectRatio="none">
          <path d="M0 0V70C120 85 240 95 360 90C480 85 600 65 720 55C840 45 960 45 1080 55C1200 65 1320 85 1380 95L1440 100V0H0Z" className="fill-white dark:fill-card" />
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H0Z" className="fill-muted/30" />
        </svg>
      </div>

      {/* FAQ Section */}
      <section className="py-14 bg-muted/30">
        <div className="max-w-2xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl lg:text-3xl font-bold mb-3">
              자주 묻는 질문
            </h2>
            <p className="text-muted-foreground">
              궁금한 점이 있으시면 언제든 물어보세요
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem 
                key={i} 
                value={`faq-${i}`}
                className="bg-card rounded-xl border-0 shadow-sm px-5"
              >
                <AccordionTrigger className="text-left font-semibold hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Wave Divider */}
      <div className="relative -mb-1">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-16 lg:h-24" preserveAspectRatio="none">
          <path d="M0 120L48 110C96 100 192 80 288 70C384 60 480 60 576 65C672 70 768 80 864 85C960 90 1056 95 1152 95C1248 95 1344 90 1392 88L1440 85V120H0Z" className="fill-white dark:fill-card" />
          <path d="M0 120L48 105C96 90 192 60 288 50C384 40 480 50 576 60C672 70 768 80 864 85C960 90 1056 90 1152 88C1248 86 1344 82 1392 80L1440 78V120H0Z" className="fill-white dark:fill-card" />
        </svg>
      </div>

      {/* Features Section */}
      <section className="py-14 bg-white dark:bg-card">
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
            {features.map((feature, i) => <Card key={i} className="border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-card/90 backdrop-blur overflow-hidden group">
                <CardContent className="p-5 text-center">
                  <div className="mb-4 flex justify-center">
                    <feature.icon className="h-12 w-12 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>)}
          </div>
        </div>
      </section>

      {/* Wave Divider - Features to Social Proof */}
      <div className="relative -mb-1 bg-white dark:bg-card">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-10 lg:h-16" preserveAspectRatio="none">
          {/* Fill the lower section color with a pronounced wave to ensure the divider stays visible */}
          <path
            d="M0 120V68C120 98 240 110 360 94C480 78 600 48 720 54C840 60 960 98 1080 98C1200 98 1320 82 1440 72V120H0Z"
            className="fill-muted/30"
          />
          {/* Subtle stroke to prevent the wave from visually blending into adjacent blocks */}
          <path
            d="M0 68C120 98 240 110 360 94C480 78 600 48 720 54C840 60 960 98 1080 98C1200 98 1320 82 1440 72"
            fill="none"
            className="stroke-border/40"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Social Proof */}
      <section className="py-10 bg-muted/30">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-10 flex-wrap justify-center">
            <div>
              <p className="text-4xl lg:text-5xl font-black text-primary">3 min</p>
              <p className="text-sm text-muted-foreground mt-1">초기 설정 완료</p>
            </div>
            <div className="w-px h-14 bg-border hidden sm:block" />
            <div>
              <p className="text-4xl lg:text-5xl font-black text-primary">Free</p>
              <p className="text-sm text-muted-foreground mt-1">기본 기능 평생</p>
            </div>
            <div className="w-px h-14 bg-border hidden sm:block" />
            <div>
              <p className="text-4xl lg:text-5xl font-black text-primary">24 H</p>
              <p className="text-sm text-muted-foreground mt-1">24시간 AI 상담</p>
            </div>
          </div>
        </div>
      </section>

      {/* Wave Divider - Social Proof to App Download */}
      <div className="relative -mb-1 bg-muted/30">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-10 lg:h-14" preserveAspectRatio="none">
          <path d="M0 0V50C100 65 200 75 300 70C400 65 500 50 600 45C700 40 800 45 900 55C1000 65 1100 80 1200 85C1300 90 1400 85 1440 80V0H0Z" className="fill-muted/30" />
          <path d="M0 120L60 108C120 96 240 72 360 60C480 48 600 48 720 54C840 60 960 72 1080 78C1200 84 1320 84 1380 84L1440 84V120H0Z" className="fill-white dark:fill-card" />
        </svg>
      </div>

      {/* App Download Section */}
      <section className="py-10 bg-white dark:bg-card">
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

      {/* Wave Divider - App Download to Final CTA */}
      <div className="relative -mb-1 bg-white dark:bg-card">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-12 lg:h-16" preserveAspectRatio="none">
          <path
            d="M0 120V68C120 98 240 110 360 94C480 78 600 48 720 54C840 60 960 98 1080 98C1200 98 1320 82 1440 72V120H0Z"
            className="fill-muted/30"
          />
          <path
            d="M0 68C120 98 240 110 360 94C480 78 600 48 720 54C840 60 960 98 1080 98C1200 98 1320 82 1440 72"
            fill="none"
            className="stroke-border/40"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      {/* Final CTA */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="mb-8">
            <img src={mainIllust2} alt="김비서" className="w-80 lg:w-96 mx-auto" />
          </div>
          <h2 className="text-xl lg:text-2xl font-bold mb-2">
            지금 바로 시작하세요
          </h2>
          <p className="text-muted-foreground text-sm mb-5">
            연결만 하면 김비서가 알아서 합니다
          </p>
          <Button size="lg" className="h-14 px-10 text-lg font-bold gap-2 rounded-xl" onClick={() => navigate("/login")}>
            <img src={icc} alt="김비서" className="h-7 w-auto" />
            무료로 시작하기
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Wave Divider - Final CTA to Footer */}
      <div className="relative -mb-1">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-10 lg:h-14" preserveAspectRatio="none">
          <path d="M0 0V60C120 75 240 85 360 80C480 75 600 55 720 50C840 45 960 55 1080 65C1200 75 1320 85 1380 90L1440 95V0H0Z" className="fill-white dark:fill-card" />
          <path d="M0 120L60 108C120 96 240 72 360 66C480 60 600 72 720 78C840 84 960 84 1080 78C1200 72 1320 60 1380 54L1440 48V120H0Z" className="fill-muted/30" />
        </svg>
      </div>

      {/* Footer */}
      <footer className="py-10 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col gap-6">
            {/* Top: Logo & Contact & Social */}
            <div className="flex flex-col sm:flex-row justify-between gap-6">
              {/* Logo & Brand */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="김비서 로고" className="h-6 w-auto opacity-50" />
                  
                  <span className="text-xs text-muted-foreground">Mr. Kim</span>
                </div>
                <p className="text-sm text-muted-foreground"> AI 기반 경영 비서 서비스</p>
              </div>
              
              {/* Business Info */}
              <div className="space-y-0.5 text-xs text-muted-foreground/60">
                <p><span className="font-medium text-muted-foreground">상호: 주식회사 더김비서</span> | 개인정보책임자: 송하진</p>
                <p>소재지: 서울 서초구 서초동 1338-12</p>
                <p>사업자등록번호: 692-86-03042 | 통신판매업신고번호: 2023-서울중구-0345</p>
              </div>
              
              {/* Contact Us */}
              <div className="space-y-2">
                <p className="font-medium text-sm text-muted-foreground/60">Contact Us</p>
                <div className="flex items-center gap-3">
                  {/* 이메일 */}
                  <a href="mailto:hajin@thenexa.io" className="w-9 h-9 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 hover:bg-muted/70 hover:text-muted-foreground transition-all" aria-label="이메일">
                    <Mail className="w-5 h-5" />
                  </a>
                  {/* 카카오톡 */}
                  <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 hover:bg-muted/70 hover:text-muted-foreground transition-all" aria-label="카카오톡">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.477 3 2 6.463 2 10.727c0 2.746 1.823 5.153 4.555 6.535-.2.746-.726 2.7-.832 3.118-.13.514.189.506.397.368.163-.108 2.6-1.765 3.652-2.48.733.104 1.488.159 2.228.159 5.523 0 10-3.463 10-7.727S17.523 3 12 3z" />
                    </svg>
                  </a>
                  {/* 인스타그램 */}
                  <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 hover:bg-muted/70 hover:text-muted-foreground transition-all" aria-label="인스타그램">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </a>
                  {/* 유튜브 */}
                  <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 hover:bg-muted/70 hover:text-muted-foreground transition-all" aria-label="유튜브">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                  </a>
                  {/* 블로그 */}
                  <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full bg-muted/50 text-muted-foreground/60 hover:bg-muted/70 hover:text-muted-foreground transition-all" aria-label="네이버 블로그">
                    <span className="text-xs font-bold">N</span>
                  </a>
                </div>
              </div>
            </div>
            
            {/* Divider */}
            <div className="border-t" />
            
            {/* Copyright & Links */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
              <p>© 2025 김비서. All rights reserved.</p>
              
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-foreground transition-colors">이용약관</a>
                <a href="#" className="hover:text-foreground transition-colors">개인정보처리방침</a>
                <a href="#" className="hover:text-foreground transition-colors">고객센터</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>;
};
export default PreLoginLanding;