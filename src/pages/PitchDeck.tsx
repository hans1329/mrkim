import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bot,
  TrendingUp,
  Zap,
  PiggyBank,
  Banknote,
  Users,
  Building2,
  ChevronDown,
  CheckCircle2,
  ArrowRight,
  Target,
  Lightbulb,
  BarChart3,
  Shield,
  Clock,
  DollarSign,
  Sparkles,
  Mail,
  Coins,
  CircleDollarSign,
  Wallet,
  Star,
  MessageSquare,
  UtensilsCrossed,
  MapPin,
  Megaphone,
  LineChart,
} from "lucide-react";

// Slide Component
interface SlideProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

function Slide({ children, className = "", id }: SlideProps) {
  return (
    <section
      id={id}
      className={`min-h-screen flex flex-col justify-center px-6 py-16 md:px-12 lg:px-24 ${className}`}
    >
      {children}
    </section>
  );
}

// Stat Card
interface StatCardProps {
  value: string;
  label: string;
  sublabel?: string;
}

function StatCard({ value, label, sublabel }: StatCardProps) {
  return (
    <div className="text-center p-6 rounded-2xl bg-white/5 backdrop-blur border border-white/10">
      <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        {value}
      </p>
      <p className="text-white/80 font-medium mt-1">{label}</p>
      {sublabel && <p className="text-white/50 text-sm mt-1">{sublabel}</p>}
    </div>
  );
}

export default function PitchDeck() {
  const [activeSection, setActiveSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const sections = container.querySelectorAll("section");
      const scrollPos = container.scrollTop + container.clientHeight / 2;

      sections.forEach((section, index) => {
        const el = section as HTMLElement;
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          setActiveSection(index);
        }
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToNext = () => {
    const container = containerRef.current;
    if (!container) return;
    const sections = container.querySelectorAll("section");
    if (activeSection < sections.length - 1) {
      (sections[activeSection + 1] as HTMLElement).scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToSection = (i: number) => {
    const container = containerRef.current;
    if (!container) return;
    const sections = container.querySelectorAll("section");
    (sections[i] as HTMLElement)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      ref={containerRef}
      style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden" }}
      className="bg-[#0a0a0f] text-white"
    >
      {/* Navigation Dots */}
      <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToSection(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              activeSection === i ? "bg-white scale-150" : "bg-white/30 hover:bg-white/50"
            }`}
          />
        ))}
      </nav>

      {/* Slide 1: Cover */}
      <Slide className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-orange-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
        
        <div className="relative z-10 max-w-4xl">
          <Badge className="mb-6 bg-white/10 text-white/90 border-white/20 hover:bg-white/20">
            Series Seed · 2026
          </Badge>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6">
            <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              김비서
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl lg:text-3xl font-light text-white/80 mb-4 leading-relaxed">
            사장님은 <span className="font-semibold text-white">명령</span>만 하세요.<br />
            실행은 <span className="font-semibold text-white">김비서</span>가 합니다.
          </p>
          
          <p className="text-lg text-white/50 mb-12 max-w-2xl">
            소상공인을 위한 AI 금융 자동화 플랫폼
          </p>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-white/60">
              <Bot className="h-5 w-5" />
              <span>AI 에이전트</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Zap className="h-5 w-5" />
              <span>자동 자금 관리</span>
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Coins className="h-5 w-5" />
              <span>스테이블코인 결제</span>
            </div>
          </div>
        </div>

        <button
          onClick={scrollToNext}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce text-white/50 hover:text-white transition"
        >
          <ChevronDown className="h-8 w-8" />
        </button>
      </Slide>

      {/* Slide 2: Problem */}
      <Slide className="bg-[#0d0d14]">
        <div className="max-w-5xl mx-auto">
          <Badge className="mb-4 bg-red-500/20 text-red-400 border-red-500/30">Problem</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8">
            소상공인의<br />
            <span className="text-white/40">보이지 않는 비용</span>
          </h2>

          <div className="grid md:grid-cols-4 gap-4 mt-12">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-4xl font-bold text-red-400 mb-2">68%</div>
                <p className="text-white/80 font-medium">사장님이 직접 회계 처리</p>
                <p className="text-white/50 text-sm mt-2">매일 1-2시간 소요</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-4xl font-bold text-red-400 mb-2">2.2%</div>
                <p className="text-white/80 font-medium">평균 카드수수료율</p>
                <p className="text-white/50 text-sm mt-2">연간 ₩240만 손실</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-4xl font-bold text-red-400 mb-2">D+3</div>
                <p className="text-white/80 font-medium">카드 정산 지연</p>
                <p className="text-white/50 text-sm mt-2">자금 흐름 비효율</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-4xl font-bold text-red-400 mb-2">0%</div>
                <p className="text-white/80 font-medium">유휴자금 수익률</p>
                <p className="text-white/50 text-sm mt-2">운영계좌 방치</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20">
            <p className="text-xl text-white/80">
              <span className="font-semibold text-white">760만 소상공인</span>이 매일 
              <span className="text-red-400 font-semibold"> 비효율적인 자금 관리</span>로 
              시간과 돈을 잃고 있습니다.
            </p>
          </div>
        </div>
      </Slide>

      {/* Slide 3: Market Opportunity */}
      <Slide>
        <div className="max-w-6xl mx-auto">
          <Badge className="mb-4 bg-blue-500/20 text-blue-400 border-blue-500/30">Market</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            시장 기회
          </h2>
          <p className="text-xl text-white/60 mb-10">
            스테이블코인 제도화가 여는 ₩45조 시장
          </p>

          {/* Market Size - Horizontal Funnel */}
          <div className="mb-12">
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-2">
              <div className="w-full md:w-auto flex-1 p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-white/50 text-sm mb-1">TAM</p>
                <p className="text-3xl md:text-4xl font-bold">₩45조</p>
                <p className="text-white/40 text-xs mt-1">소상공인 금융 서비스</p>
              </div>
              <ArrowRight className="h-6 w-6 text-white/30 hidden md:block" />
              <div className="w-full md:w-auto flex-1 p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <p className="text-white/50 text-sm mb-1">SAM</p>
                <p className="text-3xl md:text-4xl font-bold">₩8조</p>
                <p className="text-white/40 text-xs mt-1">디지털 결제 + 핀테크</p>
              </div>
              <ArrowRight className="h-6 w-6 text-white/30 hidden md:block" />
              <div className="w-full md:w-auto flex-1 p-6 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-center">
                <p className="text-blue-400 text-sm mb-1">SOM</p>
                <p className="text-3xl md:text-4xl font-bold text-blue-400">₩2,000억</p>
                <p className="text-white/40 text-xs mt-1">AI ERP + 스테이블결제</p>
              </div>
            </div>
          </div>

          {/* Key Drivers - Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { 
                icon: Coins, 
                title: "스테이블코인 제도화", 
                desc: "2025년 하반기",
                highlight: true 
              },
              { 
                icon: Users, 
                title: "760만 소상공인", 
                desc: "디지털 전환 수요",
                highlight: false 
              },
              { 
                icon: TrendingUp, 
                title: "결제 수수료 ₩12조", 
                desc: "연간 시장 규모",
                highlight: false 
              },
              { 
                icon: Sparkles, 
                title: "AI 도입률 급증", 
                desc: "MZ 사장님 28%",
                highlight: false 
              },
            ].map((item, i) => (
              <div 
                key={i} 
                className={`p-5 rounded-xl border text-center ${
                  item.highlight 
                    ? 'bg-cyan-500/10 border-cyan-500/30' 
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <item.icon className={`h-8 w-8 mx-auto mb-3 ${item.highlight ? 'text-cyan-400' : 'text-blue-400'}`} />
                <p className={`font-bold mb-1 ${item.highlight ? 'text-cyan-400' : 'text-white'}`}>{item.title}</p>
                <p className="text-white/50 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Stablecoin Highlight */}
          <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/20">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center">
                  <Coins className="h-8 w-8 text-cyan-400" />
                </div>
              </div>
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold mb-2">
                  <span className="text-cyan-400">2025년 스테이블코인 제도화</span> = 새로운 결제 인프라
                </h3>
                <p className="text-white/60">
                  카드 수수료 2.2% → 스테이블코인 0.5% 전환 시, 
                  <span className="text-white font-semibold"> 소상공인 연간 ₩2조+ 절감 </span>
                  가능. 김비서는 이 전환의 First Mover.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Slide>

      {/* Slide 4: Solution */}
      <Slide className="bg-[#0d0d14]">
        <div className="max-w-6xl mx-auto">
          <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">Solution</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2">
            김비서가 <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">해결합니다</span>
          </h2>
          <p className="text-xl text-white/50 mb-10">AI + 스테이블코인으로 소상공인 금융을 재정의</p>

          {/* Main Feature - Stablecoin Payment */}
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                    <Coins className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">스테이블코인 결제</h3>
                    <p className="text-cyan-400 text-sm">핵심 차별점</p>
                  </div>
                </div>
                <p className="text-white/70 mb-4">
                  카드 결제 수수료 2.2%를 0.5%로 낮추고, D+3 정산을 즉시 정산으로 전환합니다.
                </p>
                <div className="flex gap-6">
                  <div>
                    <p className="text-2xl font-bold text-cyan-400">75%</p>
                    <p className="text-white/50 text-sm">수수료 절감</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-cyan-400">D+0</p>
                    <p className="text-white/50 text-sm">즉시 정산</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-cyan-400">4~5%</p>
                    <p className="text-white/50 text-sm">예치 수익률</p>
                  </div>
                </div>
              </div>
              <div className="hidden md:block">
                <div className="relative p-4 rounded-xl bg-black/30 border border-white/10">
                  <div className="space-y-3 text-sm font-mono">
                    <div className="flex items-center justify-between text-white/50">
                      <span>카드 결제</span>
                      <span className="line-through text-red-400">₩22,000 수수료</span>
                    </div>
                    <div className="flex items-center justify-between text-white">
                      <span>스테이블코인</span>
                      <span className="text-cyan-400">₩5,000 수수료</span>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-white/50">월 ₩100만 결제 시</span>
                      <span className="text-green-400 font-bold">₩17,000 절감</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Other Features */}
          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                icon: Bot,
                title: "AI 비서",
                desc: "자연어로 업무 지시",
                stat: "월 20시간 절약",
                color: "blue",
              },
              {
                icon: Zap,
                title: "자동 자금 관리",
                desc: "규칙 기반 자동 이체",
                stat: "세금/급여/비용",
                color: "yellow",
              },
              {
                icon: PiggyBank,
                title: "수익 창출",
                desc: "유휴자금 자동 예치",
                stat: "연 4~5% 수익",
                color: "green",
              },
              {
                icon: Banknote,
                title: "신용 연결",
                desc: "매출 기반 즉시 대출",
                stat: "최대 5천만원",
                color: "purple",
              },
            ].map((item, i) => (
              <div 
                key={i} 
                className="p-5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className={`inline-flex p-2.5 rounded-lg bg-${item.color}-500/20 mb-3`}>
                  <item.icon className={`h-5 w-5 text-${item.color}-400`} />
                </div>
                <h3 className="font-bold mb-1 group-hover:text-white transition-colors">{item.title}</h3>
                <p className="text-white/50 text-sm mb-2">{item.desc}</p>
                <p className={`text-${item.color}-400 text-sm font-medium`}>{item.stat}</p>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      {/* Slide 5: USP */}
      <Slide>
        <div className="max-w-5xl mx-auto">
          <Badge className="mb-4 bg-orange-500/20 text-orange-400 border-orange-500/30">Why Us</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            왜 <span className="text-orange-400">김비서</span>인가
          </h2>
          <p className="text-xl text-white/60 mb-12">
            기존 솔루션과의 차별점
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-4 px-4 text-white/50 font-medium">기능</th>
                  <th className="py-4 px-4 text-white/50 font-medium">기존 ERP</th>
                  <th className="py-4 px-4 text-white/50 font-medium">단순 가계부</th>
                  <th className="py-4 px-4 text-orange-400 font-bold">김비서</th>
                </tr>
              </thead>
              <tbody className="text-sm md:text-base">
                {[
                  ["AI 자연어 명령", "❌", "❌", "✅"],
                  ["스테이블코인 결제", "❌", "❌", "✅"],
                  ["즉시 정산 (D+0)", "❌", "❌", "✅"],
                  ["자동 자금 관리", "❌", "❌", "✅"],
                  ["스테이블코인 수익화", "❌", "❌", "✅"],
                  ["매출 기반 대출", "❌", "❌", "✅"],
                  ["결제 수수료", "2.2%+", "2.2%+", "0.5%"],
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-4 px-4 text-white/80">{row[0]}</td>
                    <td className="py-4 px-4 text-white/40">{row[1]}</td>
                    <td className="py-4 px-4 text-white/40">{row[2]}</td>
                    <td className="py-4 px-4 text-orange-400 font-semibold">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-12 grid md:grid-cols-4 gap-4">
            {[
              { icon: Coins, title: "First Mover", desc: "스테이블코인 제도화 직후 시장 선점" },
              { icon: Target, title: "조회가 아닌 실행", desc: "데이터를 보여주는 게 아니라, 업무를 완결" },
              { icon: CircleDollarSign, title: "수수료 파괴", desc: "결제 수수료 2.2% → 0.5% (75% 절감)" },
              { icon: Clock, title: "즉시 정산", desc: "D+3 → D+0, 자금 흐름 최적화" },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20">
                <item.icon className="h-7 w-7 text-orange-400 mb-3" />
                <h3 className="text-base font-bold mb-2">{item.title}</h3>
                <p className="text-white/60 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Slide>

      {/* Slide 6: Business Model */}
      <Slide className="bg-[#0d0d14]">
        <div className="max-w-5xl mx-auto">
          <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">Business Model</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            수익 모델
          </h2>
          <p className="text-xl text-white/60 mb-10">
            SaaS 구독 + 금융 수익의 복합 모델로 높은 LTV 확보
          </p>

          {/* Revenue Streams - 4 Cards */}
          <div className="grid md:grid-cols-4 gap-4 mb-10">
            {/* SaaS */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <Sparkles className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-white/50 text-xs mb-1">SaaS 구독</p>
              <p className="text-2xl font-bold text-blue-400 mb-2">₩3만<span className="text-base font-normal text-white/40">/월</span></p>
              <p className="text-white/50 text-xs">AI 비서 + 자동화</p>
            </div>

            {/* Payment Fee */}
            <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 relative">
              <Badge className="absolute top-3 right-3 bg-cyan-500/20 text-cyan-400 border-cyan-500/30 text-[9px]">핵심</Badge>
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
                <Coins className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="text-white/50 text-xs mb-1">결제 수수료</p>
              <p className="text-2xl font-bold text-cyan-400 mb-2">0.5%</p>
              <p className="text-white/50 text-xs">스테이블코인 결제</p>
            </div>

            {/* Deposit Yield */}
            <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/30 relative">
              <Badge className="absolute top-3 right-3 bg-green-500/20 text-green-400 border-green-500/30 text-[9px]">고마진</Badge>
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <PiggyBank className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-white/50 text-xs mb-1">예치 운용</p>
              <p className="text-2xl font-bold text-green-400 mb-2">1~2%<span className="text-base font-normal text-white/40"> 마진</span></p>
              <p className="text-white/50 text-xs">DeFi 스프레드</p>
            </div>

            {/* Loan */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <Banknote className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-white/50 text-xs mb-1">대출 연결</p>
              <p className="text-2xl font-bold text-purple-400 mb-2">1~2%</p>
              <p className="text-white/50 text-xs">실행금액 기준</p>
            </div>
          </div>

          {/* Deposit Yield Detail */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-cyan-500/10 border border-green-500/20 mb-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold">예치금 운용 수익 상세</h3>
                <p className="text-white/50 text-sm">스테이블코인 DeFi 운용으로 안정적 마진 확보</p>
              </div>
            </div>

            <div className="grid md:grid-cols-5 gap-4 items-center">
              <div className="text-center p-4 rounded-xl bg-white/5">
                <p className="text-white/50 text-xs mb-1">고객 예치금</p>
                <p className="text-xl font-bold">₩18M</p>
                <p className="text-white/40 text-xs">고객당 평균</p>
              </div>
              <div className="hidden md:flex justify-center">
                <ArrowRight className="h-5 w-5 text-green-400/50" />
              </div>
              <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-white/50 text-xs mb-1">DeFi 운용</p>
                <p className="text-xl font-bold text-emerald-400">4~5%</p>
                <p className="text-white/40 text-xs">연간 수익률</p>
              </div>
              <div className="hidden md:flex justify-center">
                <ArrowRight className="h-5 w-5 text-green-400/50" />
              </div>
              <div className="text-center p-4 rounded-xl bg-green-500/20 border border-green-500/30">
                <p className="text-white/50 text-xs mb-1">김비서 마진</p>
                <p className="text-xl font-bold text-green-400">₩18만</p>
                <p className="text-white/40 text-xs">고객당 연간</p>
              </div>
            </div>

            <p className="text-center text-white/40 text-sm mt-4">
              1만 고객 × ₩18만 = <span className="text-green-400 font-semibold">연간 ₩18억</span> 예치금 수익
            </p>
          </div>

          {/* Unit Economics */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">₩420K</p>
              <p className="text-white/80 font-medium mt-1">ARPU (연간)</p>
              <p className="text-white/40 text-xs mt-1">SaaS ₩36만 + 금융 ₩6만</p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">7.2x</p>
              <p className="text-white/80 font-medium mt-1">LTV / CAC</p>
              <p className="text-white/40 text-xs mt-1">업계 평균 3x 대비</p>
            </div>
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">85%</p>
              <p className="text-white/80 font-medium mt-1">Gross Margin</p>
              <p className="text-white/40 text-xs mt-1">금융 수익 포함</p>
            </div>
          </div>
        </div>
      </Slide>

      {/* Slide 7: One More Thing */}
      <Slide className="bg-[#0a0a0f] relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <p className="text-2xl md:text-3xl text-white/40 font-light mb-8 tracking-wider">
            그런데...
          </p>
          <h2 className="text-5xl md:text-6xl lg:text-8xl font-black mb-6">
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text text-transparent">
              One More Thing.
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-white/60 font-light leading-relaxed max-w-2xl mx-auto">
            김비서는 단순히 돈을 관리하는 것을 넘어,<br />
            <span className="text-white font-semibold">사장님의 매장을 성장</span>시킵니다.
          </p>
        </div>
      </Slide>

      {/* Slide 8: 데이터를 활용한 마법 */}
      <Slide className="bg-[#0d0d14]">
        <div className="max-w-6xl mx-auto">
          <Badge className="mb-4 bg-amber-500/20 text-amber-400 border-amber-500/30">Data Magic</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2">
            데이터를 활용한 <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">마법</span>
          </h2>
          <p className="text-xl text-white/50 mb-10">
            배달앱 연동 데이터로 매장 경영을 혁신합니다
          </p>

          {/* Data Sources */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { icon: UtensilsCrossed, label: "메뉴 데이터", desc: "판매량·마진 분석" },
              { icon: Star, label: "리뷰 분석", desc: "AI 감성 분석" },
              { icon: LineChart, label: "매출 통계", desc: "시간대·요일 패턴" },
              { icon: MapPin, label: "상권 분석", desc: "인근 매출 비교" },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <item.icon className="h-7 w-7 mx-auto mb-2 text-amber-400" />
                <p className="font-bold text-sm">{item.label}</p>
                <p className="text-white/40 text-xs mt-1">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Killer Insight Example */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-red-500/10 border border-amber-500/20 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Lightbulb className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg mb-2 text-amber-400">AI가 발견하는 인사이트 예시</h3>
                <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                  <p className="text-white/80 text-sm leading-relaxed italic">
                    "사장님, <span className="text-amber-400 font-semibold">김치찌개 매출이 지난달 대비 20% 감소</span>했어요. 
                    같은 기간 '맛이 변했다'는 리뷰가 3건 증가했습니다. 
                    반면 <span className="text-green-400 font-semibold">된장찌개는 리뷰 평점 4.8점</span>으로 주문이 늘고 있어요. 
                    메뉴 구성 조정을 권합니다."
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* 리뷰 감성 분석 */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-rose-400" />
                </div>
                <h3 className="font-bold">리뷰 감성 분석</h3>
              </div>
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-rose-400 shrink-0" />긍정/부정 키워드 자동 분류</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-rose-400 shrink-0" />부정 리뷰 급증 시 즉시 알림</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-rose-400 shrink-0" />메뉴별 리뷰 만족도 추적</li>
              </ul>
            </div>

            {/* 메뉴 최적화 */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <UtensilsCrossed className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="font-bold">메뉴 성과 분석</h3>
              </div>
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />메뉴별 판매량 & 매출 랭킹</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />가격 변경 후 주문 변화 추적</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />저성과 메뉴 정리 제안</li>
              </ul>
            </div>

            {/* 광고 ROI & 상권 */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Megaphone className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-bold">광고·상권 인텔리전스</h3>
              </div>
              <ul className="space-y-2 text-sm text-white/60">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />광고비 대비 매출 ROI 자동 계산</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />인근 경쟁업체 대비 포지셔닝</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />요일·시간대별 최적 프로모션 제안</li>
              </ul>
            </div>
          </div>

          {/* Bottom Impact */}
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-2xl font-bold text-amber-400">배민 + 쿠팡이츠</p>
              <p className="text-white/50 text-sm mt-1">14 + 9개 API 완전 연동</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-2xl font-bold text-amber-400">실시간</p>
              <p className="text-white/50 text-sm mt-1">6시간 자동 동기화</p>
            </div>
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-2xl font-bold text-amber-400">AI 브리핑</p>
              <p className="text-white/50 text-sm mt-1">매일 아침 핵심 변화 알림</p>
            </div>
          </div>
        </div>
      </Slide>

      {/* Slide 9: 배민 독점 데이터 */}
      <Slide>
        <div className="max-w-6xl mx-auto">
          <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Baemin Exclusive</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-2">
            배민 <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">독점 인텔리전스</span>
          </h2>
          <p className="text-xl text-white/50 mb-10">
            배달의민족만 제공하는 4가지 전략 데이터
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 매출 통계 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">매출 통계</h3>
                  <p className="text-white/40 text-sm">statistics API</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                  <p className="text-white/50 text-xs mb-2">매출 트렌드 차트</p>
                  <div className="flex items-end gap-1 h-16">
                    {[40, 55, 45, 70, 65, 85, 90].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t bg-gradient-to-t from-cyan-500 to-cyan-400" style={{ height: `${h}%` }} />
                        <span className="text-[9px] text-white/30">{['월','화','수','목','금','토','일'][i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <p className="text-sm text-white/70">
                    <span className="text-cyan-400 font-semibold">"토요일 저녁 6~9시가 매출 피크"</span><br />
                    → 해당 시간대 인력 보강 제안
                  </p>
                </div>
              </div>
            </div>

            {/* 인근지역매출 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">상권 분석</h3>
                  <p className="text-white/40 text-sm">nearby_sales API</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                  <p className="text-white/50 text-xs mb-3">내 가게 vs 인근 평균</p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-emerald-400 font-medium">우리 가게</span>
                        <span className="text-emerald-400">₩820만</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: '82%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/50">동네 평균</span>
                        <span className="text-white/50">₩680만</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-white/30" style={{ width: '68%' }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-white/70">
                    <span className="text-emerald-400 font-semibold">"인근 치킨집 평균 대비 120%"</span><br />
                    → 경쟁 포지셔닝 & 가격 전략 제안
                  </p>
                </div>
              </div>
            </div>

            {/* 광고관리 */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Megaphone className="h-6 w-6 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">광고 ROI 분석</h3>
                  <p className="text-white/40 text-sm">ad_management API</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                  <p className="text-white/50 text-xs mb-3">이번 주 광고 성과</p>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold text-orange-400">₩15만</p>
                      <p className="text-white/40 text-[10px]">광고비</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-white/60">→</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-red-400">₩8만</p>
                      <p className="text-white/40 text-[10px]">매출 증가분</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-white/70">
                    <span className="text-red-400 font-semibold">"광고 효율 53% — 비용 대비 효과 낮음"</span><br />
                    → 광고 중단 또는 타겟 변경 권고
                  </p>
                </div>
              </div>
            </div>

            {/* 우리가게NOW */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">실시간 모니터링</h3>
                  <p className="text-white/40 text-sm">store_now API</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-black/30 border border-white/10">
                  <p className="text-white/50 text-xs mb-3">가게 상태 대시보드</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-sm text-white/80">강남점</span>
                      </div>
                      <span className="text-xs text-green-400 font-medium">영업중</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white/30" />
                        <span className="text-sm text-white/50">홍대점</span>
                      </div>
                      <span className="text-xs text-white/40 font-medium">마감</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-sm text-white/70">
                    <span className="text-purple-400 font-semibold">다점포 사장님 필수</span><br />
                    → 가게별 영업 상태 한눈에 파악
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Slide>

      {/* Slide 10: Roadmap */}
      <Slide>
        <div className="max-w-5xl mx-auto">
          <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Roadmap</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            성장 로드맵
          </h2>
          <p className="text-xl text-white/60 mb-12">
            18개월 내 PMF 달성 및 Series A 목표
          </p>

          {/* Vertical Timeline Tree */}
          <div className="relative">
            {/* Animated Vertical Line */}
            <div className="absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-0.5 bg-white/10">
              <div 
                className="w-full bg-gradient-to-b from-blue-500 via-purple-500 via-orange-500 to-cyan-500 animate-pulse"
                style={{ 
                  height: '100%',
                  animation: 'roadmapLine 3s ease-out forwards'
                }}
              />
            </div>

            {/* Timeline Items */}
            <div className="space-y-12">
              {[
                { 
                  phase: "Phase 1", 
                  period: "2025 상반기", 
                  title: "MVP 런칭", 
                  status: "In Progress",
                  items: ["AI 채팅 기반 조회/명령", "자금 현황 대시보드", "베타 유저 500명 확보"],
                  color: "blue",
                  delay: "0s"
                },
                { 
                  phase: "Phase 2", 
                  period: "2025 하반기", 
                  title: "스테이블코인 결제", 
                  status: "Planned",
                  items: ["스테이블코인 제도화 대응", "결제 인프라 구축", "파일럿 가맹점 100개"],
                  color: "cyan",
                  delay: "0.3s"
                },
                { 
                  phase: "Phase 3", 
                  period: "2026 상반기", 
                  title: "금융 서비스 확대", 
                  status: "Planned",
                  items: ["스테이블코인 예치 상품", "매출 기반 대출 연계", "유저 20,000명 달성"],
                  color: "purple",
                  delay: "0.6s"
                },
                { 
                  phase: "Phase 4", 
                  period: "2026 하반기", 
                  title: "결제 네트워크", 
                  status: "Planned",
                  items: ["B2B 결제 네트워크 구축", "해외 결제/송금 연동", "유저 50,000명 달성"],
                  color: "orange",
                  delay: "0.9s"
                },
              ].map((item, i) => (
                <div 
                  key={i} 
                  className={`relative flex items-start gap-6 md:gap-12 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                  style={{
                    animation: `fadeSlideIn 0.6s ease-out ${item.delay} both`
                  }}
                >
                  {/* Node Circle */}
                  <div className="absolute left-4 md:left-1/2 -translate-x-1/2 z-10">
                    <div className={`w-4 h-4 rounded-full bg-${item.color}-500 ring-4 ring-${item.color}-500/20 animate-pulse`}>
                      <div className={`absolute inset-0 rounded-full bg-${item.color}-400 animate-ping opacity-50`} />
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className={`ml-12 md:ml-0 md:w-[45%] ${i % 2 === 0 ? 'md:pr-8' : 'md:pl-8'}`}>
                    <Card className={`bg-white/5 border-white/10 hover:border-${item.color}-500/30 transition-all group relative overflow-hidden hover:scale-[1.02] hover:bg-white/10`}>
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-${item.color}-500 to-${item.color}-400`} />
                      
                      {/* Connecting Branch Line (Desktop) */}
                      <div className={`hidden md:block absolute top-6 ${i % 2 === 0 ? '-right-8 w-8' : '-left-8 w-8'} h-0.5 bg-gradient-to-r from-${item.color}-500/50 to-transparent ${i % 2 !== 0 ? 'rotate-180' : ''}`} />
                      
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-xs font-mono text-${item.color}-400 font-bold`}>{item.phase}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-[10px] ${item.status === "In Progress" ? "border-green-500/50 text-green-400 bg-green-500/10" : "border-white/20 text-white/50"}`}
                          >
                            {item.status}
                          </Badge>
                        </div>
                        <p className="text-white/50 text-sm mb-1">{item.period}</p>
                        <h3 className="text-xl font-bold mb-4 group-hover:text-white transition-colors">{item.title}</h3>
                        <ul className="space-y-2">
                          {item.items.map((li, j) => (
                            <li 
                              key={j} 
                              className="flex items-start gap-2 text-sm text-white/60"
                              style={{
                                animation: `fadeSlideIn 0.4s ease-out ${parseFloat(item.delay) + 0.1 * (j + 1)}s both`
                              }}
                            >
                              <CheckCircle2 className={`h-4 w-4 text-${item.color}-400 shrink-0 mt-0.5`} />
                              <span>{li}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Empty Space for alternating layout */}
                  <div className="hidden md:block md:w-[45%]" />
                </div>
              ))}
            </div>
          </div>

          {/* KPI Summary */}
          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div 
              className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-all hover:scale-105"
              style={{ animation: 'fadeSlideIn 0.6s ease-out 1.2s both' }}
            >
              <div className="text-3xl font-bold text-cyan-400 mb-2">500 → 50K</div>
              <p className="text-white/60">18개월 유저 성장 목표</p>
            </div>
            <div 
              className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-all hover:scale-105"
              style={{ animation: 'fadeSlideIn 0.6s ease-out 1.4s both' }}
            >
              <div className="text-3xl font-bold text-cyan-400 mb-2">₩10억+</div>
              <p className="text-white/60">ARR 목표 (2026년)</p>
            </div>
            <div 
              className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-all hover:scale-105"
              style={{ animation: 'fadeSlideIn 0.6s ease-out 1.6s both' }}
            >
              <div className="text-3xl font-bold text-cyan-400 mb-2">3개</div>
              <p className="text-white/60">금융사 제휴 목표</p>
            </div>
          </div>
        </div>

        {/* Custom Keyframes */}
        <style>{`
          @keyframes roadmapLine {
            from {
              height: 0%;
              opacity: 0;
            }
            to {
              height: 100%;
              opacity: 1;
            }
          }
          
          @keyframes fadeSlideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </Slide>

      {/* Slide 10: Ask */}
      <Slide className="bg-gradient-to-br from-[#0d0d14] via-[#0a0a0f] to-[#0d0d14]">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 bg-white/10 text-white/90 border-white/20">Investment</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            함께 성장할<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
              파트너를 찾습니다
            </span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mt-12 mb-12">
            <StatCard value="₩10억" label="Seed 라운드" sublabel="Pre-money ₩40억" />
            <StatCard value="18개월" label="Runway" sublabel="PMF 달성 목표" />
            <StatCard value="₩100억" label="Series A 목표" sublabel="2026년 하반기" />
          </div>

          <div className="p-8 rounded-2xl bg-white/5 border border-white/10 mb-12">
            <h3 className="text-xl font-bold mb-4">자금 사용 계획</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-400">50%</div>
                <p className="text-white/60 text-sm">제품 개발</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-400">30%</div>
                <p className="text-white/60 text-sm">마케팅/세일즈</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-400">20%</div>
                <p className="text-white/60 text-sm">운영/인건비</p>
              </div>
            </div>
          </div>

        </div>
      </Slide>
    </div>
  );
}
