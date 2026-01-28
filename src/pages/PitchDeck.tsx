import { useEffect, useState } from "react";
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

  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("section");
      const scrollPos = window.scrollY + window.innerHeight / 2;

      sections.forEach((section, index) => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          setActiveSection(index);
        }
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToNext = () => {
    const sections = document.querySelectorAll("section");
    if (activeSection < sections.length - 1) {
      sections[activeSection + 1].scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-[#0a0a0f] text-white min-h-screen">
      {/* Navigation Dots */}
      <nav className="fixed right-6 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-2">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <button
            key={i}
            onClick={() => document.querySelectorAll("section")[i]?.scrollIntoView({ behavior: "smooth" })}
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
            Series Seed · 2025
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
              <PiggyBank className="h-5 w-5" />
              <span>수익 창출</span>
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

          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-4xl font-bold text-red-400 mb-2">68%</div>
                <p className="text-white/80 font-medium">사장님이 직접 회계 처리</p>
                <p className="text-white/50 text-sm mt-2">매일 1-2시간 소요</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-6">
                <div className="text-4xl font-bold text-red-400 mb-2">₩2.4M</div>
                <p className="text-white/80 font-medium">연간 카드수수료</p>
                <p className="text-white/50 text-sm mt-2">소상공인 평균 기준</p>
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
        <div className="max-w-5xl mx-auto">
          <Badge className="mb-4 bg-blue-500/20 text-blue-400 border-blue-500/30">Market</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            시장 기회
          </h2>
          <p className="text-xl text-white/60 mb-12">
            한국 소상공인 시장은 거대하지만, 디지털화는 이제 시작
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-semibold mb-6 text-white/90">TAM → SAM → SOM</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">TAM (전체 시장)</span>
                    <span className="text-2xl font-bold">₩45조</span>
                  </div>
                  <p className="text-sm text-white/40 mt-1">소상공인 금융/경영 서비스</p>
                </div>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">SAM (접근 가능)</span>
                    <span className="text-2xl font-bold">₩8조</span>
                  </div>
                  <p className="text-sm text-white/40 mt-1">클라우드 ERP + 핀테크</p>
                </div>
                <div className="p-4 rounded-xl bg-blue-500/20 border border-blue-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-400">SOM (초기 목표)</span>
                    <span className="text-2xl font-bold text-blue-400">₩2,000억</span>
                  </div>
                  <p className="text-sm text-white/40 mt-1">음식점/소매업 AI ERP</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-6 text-white/90">성장 동력</h3>
              <div className="space-y-4">
                {[
                  { icon: TrendingUp, title: "디지털 전환 가속", desc: "코로나 이후 SaaS 도입률 3배 증가" },
                  { icon: Users, title: "MZ 사장님 증가", desc: "30대 자영업자 비율 28% (역대 최고)" },
                  { icon: Building2, title: "오픈뱅킹 확대", desc: "API 기반 금융 서비스 규제 완화" },
                  { icon: Sparkles, title: "생성AI 대중화", desc: "자연어 명령 인터페이스 수용도 급증" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <item.icon className="h-6 w-6 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">{item.title}</p>
                      <p className="text-sm text-white/50">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Slide>

      {/* Slide 4: Solution */}
      <Slide className="bg-[#0d0d14]">
        <div className="max-w-5xl mx-auto">
          <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">Solution</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            김비서가<br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
              해결합니다
            </span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
            {[
              {
                icon: Bot,
                title: "AI 비서",
                desc: "말로 시키면 알아서 처리",
                example: '"김비서, 이번 달 매출 정리해줘"',
                color: "blue",
              },
              {
                icon: Zap,
                title: "자동 자금 관리",
                desc: "규칙대로 돈이 움직임",
                example: "매출 10% → 세금 계좌 자동 이체",
                color: "yellow",
              },
              {
                icon: PiggyBank,
                title: "수익 창출",
                desc: "남는 돈으로 이자 받기",
                example: "파킹통장 자동 이체 → 연 3%",
                color: "green",
              },
              {
                icon: Banknote,
                title: "신용 연결",
                desc: "매출 기반 즉시 대출",
                example: "1분 승인 · 최대 5천만원",
                color: "purple",
              },
            ].map((item, i) => (
              <Card key={i} className={`bg-white/5 border-white/10 hover:bg-white/10 transition group`}>
                <CardContent className="p-6">
                  <div className={`inline-flex p-3 rounded-xl bg-${item.color}-500/20 mb-4`}>
                    <item.icon className={`h-6 w-6 text-${item.color}-400`} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-white/60 mb-4">{item.desc}</p>
                  <p className="text-sm text-white/40 italic">"{item.example}"</p>
                </CardContent>
              </Card>
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
                  ["자동 자금 관리", "❌", "❌", "✅"],
                  ["예치금 수익화", "❌", "❌", "✅"],
                  ["매출 기반 대출", "❌", "❌", "✅"],
                  ["모바일 최적화", "△", "✅", "✅"],
                  ["월 비용", "₩10만+", "무료", "₩3만"],
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

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, title: "조회가 아닌 실행", desc: "데이터를 보여주는 게 아니라, 업무를 완결" },
              { icon: Shield, title: "안전한 자금 운용", desc: "예금자 보호 적용, 원금 보장형 상품만" },
              { icon: Clock, title: "시간 절약", desc: "월 20시간 이상 행정 업무 자동화" },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20">
                <item.icon className="h-8 w-8 text-orange-400 mb-4" />
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
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
            다층 수익 구조
          </h2>
          <p className="text-xl text-white/60 mb-12">
            SaaS를 넘어 금융 인프라로
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "SaaS 구독료",
                price: "₩30,000/월",
                desc: "AI 에이전트 + ERP 기능",
                metrics: "LTV ₩1.08M · CAC ₩150K",
                color: "blue",
              },
              {
                title: "예치금 운용 수익",
                price: "연 0.3~0.5%",
                desc: "고객 유휴자금 운용 마진",
                metrics: "고객당 평균 ₩18M 예치",
                color: "green",
              },
              {
                title: "대출 연결 수수료",
                price: "1~2%",
                desc: "대출 실행금액 기준",
                metrics: "평균 대출 ₩15M",
                color: "purple",
              },
              {
                title: "결제 수수료 (예정)",
                price: "0.5%",
                desc: "스테이블코인 기반 결제",
                metrics: "기존 PG 대비 50% 절감",
                color: "orange",
              },
            ].map((item, i) => (
              <Card key={i} className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold">{item.title}</h3>
                    <span className={`text-${item.color}-400 font-bold`}>{item.price}</span>
                  </div>
                  <p className="text-white/60 mb-4">{item.desc}</p>
                  <p className="text-sm text-white/40">{item.metrics}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 p-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
            <div className="grid md:grid-cols-3 gap-6 text-center">
              <StatCard value="₩420K" label="ARPU (연간)" sublabel="SaaS + 금융 수익" />
              <StatCard value="7.2x" label="LTV/CAC" sublabel="업계 평균 3x 대비" />
              <StatCard value="85%" label="예상 Gross Margin" sublabel="금융 수익 포함" />
            </div>
          </div>
        </div>
      </Slide>

      {/* Slide 7: Roadmap */}
      <Slide>
        <div className="max-w-5xl mx-auto">
          <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Roadmap</Badge>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            성장 로드맵
          </h2>
          <p className="text-xl text-white/60 mb-12">
            18개월 내 PMF 달성 및 Series A 목표
          </p>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { 
                phase: "Phase 1", 
                period: "2025 상반기", 
                title: "MVP 런칭", 
                status: "In Progress",
                items: ["AI 채팅 기반 조회/명령", "자금 현황 대시보드", "베타 유저 500명 확보"],
                color: "blue"
              },
              { 
                phase: "Phase 2", 
                period: "2025 하반기", 
                title: "금융 연동", 
                status: "Planned",
                items: ["오픈뱅킹 API 연동", "파킹통장 자동 이체", "유저 5,000명 달성"],
                color: "purple"
              },
              { 
                phase: "Phase 3", 
                period: "2026 상반기", 
                title: "대출 서비스", 
                status: "Planned",
                items: ["금융사 제휴 체결", "매출 기반 신용평가", "유저 20,000명 달성"],
                color: "orange"
              },
              { 
                phase: "Phase 4", 
                period: "2026 하반기", 
                title: "스케일업", 
                status: "Planned",
                items: ["결제 서비스 런칭", "B2B 파트너십 확대", "유저 50,000명 달성"],
                color: "cyan"
              },
            ].map((item, i) => (
              <Card key={i} className={`bg-white/5 border-white/10 hover:border-${item.color}-500/30 transition-all group relative overflow-hidden`}>
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-${item.color}-500 to-${item.color}-400`} />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-mono text-${item.color}-400`}>{item.phase}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-[10px] ${item.status === "In Progress" ? "border-green-500/50 text-green-400" : "border-white/20 text-white/50"}`}
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-white/50 text-sm mb-1">{item.period}</p>
                  <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                  <ul className="space-y-2">
                    {item.items.map((li, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-white/60">
                        <CheckCircle2 className={`h-4 w-4 text-${item.color}-400 shrink-0 mt-0.5`} />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">500 → 50K</div>
              <p className="text-white/60">18개월 유저 성장 목표</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">₩10억+</div>
              <p className="text-white/60">ARR 목표 (2026년)</p>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-2">3개</div>
              <p className="text-white/60">금융사 제휴 목표</p>
            </div>
          </div>
        </div>
      </Slide>

      {/* Slide 8: Ask */}
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

          <div className="flex flex-col items-center gap-4">
            <Button size="lg" className="bg-white text-black hover:bg-white/90 gap-2 text-lg px-8">
              <Mail className="h-5 w-5" />
              contact@kimsecretary.ai
            </Button>
            <p className="text-white/40 text-sm">IR 자료 요청 및 미팅 문의</p>
          </div>
        </div>
      </Slide>
    </div>
  );
}
