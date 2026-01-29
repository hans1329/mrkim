import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bot, TrendingDown, Wallet, Building2, Users, Lightbulb, ArrowRight, RotateCcw } from "lucide-react";
import survivalImage from "@/assets/survival-quiz.webp";
import mainIllust from "@/assets/main-illust.webp";
import mainIllust2 from "@/assets/main-illust2.webp";
import qrCode from "@/assets/qr-code.png";

const Landing = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<string>("");
  const [monthlyRevenue, setMonthlyRevenue] = useState<string>("");
  const [monthlyCost, setMonthlyCost] = useState<string>("");
  const [result, setResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  const calculateRunway = () => {
    const balanceNum = parseFloat(balance.replace(/,/g, "")) || 0;
    const revenueNum = parseFloat(monthlyRevenue.replace(/,/g, "")) || 0;
    const costNum = parseFloat(monthlyCost.replace(/,/g, "")) || 0;

    const netBurn = costNum - revenueNum;
    
    if (netBurn <= 0) {
      setResult(-1);
    } else {
      const days = Math.floor((balanceNum / netBurn) * 30);
      setResult(days);
    }
    setShowResult(true);
    
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const formatNumber = (value: string) => {
    const num = value.replace(/[^\d]/g, "");
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const costSavingTips = [
    { icon: Building2, text: "임대료 협상 여지 발견", saving: "월 15만원" },
    { icon: Users, text: "인건비 최적화 포인트", saving: "월 8%" },
    { icon: TrendingDown, text: "불필요한 구독 서비스", saving: "월 12만원" },
  ];

  return (
    <div className={`flex h-screen overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/10 lg:gap-8 lg:px-8 transition-all duration-700 ${
      showResult ? 'justify-center' : 'justify-center lg:justify-center'
    }`}>
      {/* PC 좌측 마케팅 영역 */}
      <div className={`hidden lg:flex lg:flex-col lg:justify-center lg:relative transition-all duration-700 ${
        showResult ? 'lg:w-[480px] xl:w-[560px] opacity-100 blur-0' : 'lg:w-0 opacity-0 blur-sm overflow-hidden'
      }`}>
        <div className="relative z-10 p-8 space-y-6">
          {/* 헤드라인 */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-foreground leading-tight">
              사장님은<br />
              <span className="text-primary">명령만</span> 하세요!
            </h1>
            <p className="text-lg text-muted-foreground flex items-center gap-1">
              실행은 김비서가 합니다 <Bot className="h-5 w-5 text-primary" />
            </p>
          </div>

          {/* 메인 일러스트 */}
          <div className="flex justify-center">
            <img src={mainIllust} alt="김비서 일러스트" className="w-full max-w-xs rounded-2xl" />
          </div>

          {/* 서브 일러스트 */}
          <div className="flex justify-center">
            <img src={mainIllust2} alt="김비서 일러스트" className="w-72" />
          </div>

          {/* 기능 태그 */}
          <div className="flex flex-wrap gap-2">
            {["직원관리", "급여계산", "세무처리", "매출분석", "수익창출"].map(tag => (
              <span key={tag} className="px-3 py-1 bg-card/80 backdrop-blur-sm rounded-full text-sm text-foreground border border-border/50">
                {tag}
              </span>
            ))}
          </div>

          {/* 앱 다운로드 통합 박스 */}
          <div className="relative overflow-hidden p-5 bg-card/95 backdrop-blur-md rounded-3xl border border-border/50 shadow-lg">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-secondary/20 rounded-full blur-xl" />
            
            <div className="relative flex items-center gap-5">
              {/* QR 코드 */}
              <div className="flex-shrink-0">
                <div className="p-2.5 rounded-2xl">
                  <img src={qrCode} alt="QR Code" className="w-20 h-20" />
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">QR 스캔</p>
              </div>
              
              <div className="h-20 w-px bg-border/50" />
              
              {/* 스토어 버튼 영역 */}
              <div className="flex-1 space-y-3">
                <p className="text-sm font-semibold text-foreground">📲 앱으로 편리하게 관리하세요!</p>
                
                <div className="flex flex-col gap-2">
                  <a href="#" className="group inline-flex items-center gap-2.5 px-4 py-2 bg-foreground text-background rounded-xl hover:scale-[1.02] hover:shadow-md transition-all duration-200">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                    </svg>
                    <div className="text-left">
                      <div className="text-[9px] opacity-70 leading-none">Download on the</div>
                      <div className="text-sm font-semibold leading-tight">App Store</div>
                    </div>
                  </a>

                  <a href="#" className="group inline-flex items-center gap-2.5 px-4 py-2 bg-foreground text-background rounded-xl hover:scale-[1.02] hover:shadow-md transition-all duration-200">
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
          </div>
        </div>
      </div>

      {/* 앱 영역 */}
      <div className="w-full h-full lg:w-[480px] lg:flex-shrink-0">
        <div className="relative flex h-full max-w-xl flex-col bg-background shadow-2xl lg:max-w-none mx-auto overflow-hidden">
          <div className="flex-1 overflow-auto">
            {/* Landing Content */}
            <div className="p-4 pb-8">
              {/* Hero Image with Title Overlay */}
              <div className="relative mb-6 animate-fade-in">
                <img 
                  src={survivalImage} 
                  alt="생존 vs 탈락" 
                  className="w-full rounded-3xl shadow-xl"
                />
                <div className="absolute inset-0 flex items-end justify-center pb-4">
                  <div className="bg-background/90 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-lg">
                    <h1 className="text-xl font-bold text-center">
                      <span className="text-primary">생존</span>
                      <span className="text-muted-foreground">인가?</span>
                      <span className="text-muted-foreground mx-2"></span>
                      <span className="text-destructive">탈락</span>
                      <span className="text-muted-foreground">인가!</span>
                    </h1>
                  </div>
                </div>
              </div>

              {/* Main Title */}
              <div className="text-center mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
                <h2 className="text-3xl font-black text-foreground mb-2 flex items-center justify-center gap-2">
                  <Bot className="h-8 w-8 text-primary" />
                  <span className="bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-transparent">
                    사장님 생존 계산기
                  </span>
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  사업의 가장 무서운 순간은 <span className="font-semibold text-destructive">"돈이 마르는 날"</span><br />
                  지금 내 사업은 얼마나 버틸 수 있을까?
                </p>
              </div>

              {/* Calculator Card */}
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur rounded-3xl overflow-hidden animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <CardContent className="p-6 space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <span className="font-semibold text-foreground">내 사업 현황</span>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="balance" className="text-sm text-muted-foreground">현재 잔고</Label>
                      <Input
                        id="balance"
                        placeholder="50,000,000원"
                        value={balance}
                        onChange={(e) => setBalance(formatNumber(e.target.value))}
                        className="h-12 text-lg font-medium rounded-xl border-2 focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="revenue" className="text-sm text-muted-foreground">월평균 매출</Label>
                      <Input
                        id="revenue"
                        placeholder="10,000,000원"
                        value={monthlyRevenue}
                        onChange={(e) => setMonthlyRevenue(formatNumber(e.target.value))}
                        className="h-12 text-lg font-medium rounded-xl border-2 focus:border-primary"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cost" className="text-sm text-muted-foreground">월 고정비 (임대료, 인건비 등)</Label>
                      <Input
                        id="cost"
                        placeholder="15,000,000원"
                        value={monthlyCost}
                        onChange={(e) => setMonthlyCost(formatNumber(e.target.value))}
                        className="h-12 text-lg font-medium rounded-xl border-2 focus:border-primary"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={calculateRunway} 
                    className="w-full h-14 text-lg font-bold rounded-xl hover-scale"
                    disabled={!balance || !monthlyRevenue || !monthlyCost}
                  >
                    🔮 내 생존 기간 확인하기
                  </Button>
                </CardContent>
              </Card>

              {/* Result Section */}
              {showResult && (
                <div ref={resultRef}>
                <div className="mt-6 space-y-5 animate-fade-in">
                  {/* Survival Days */}
                  <Card className={`border-0 rounded-3xl shadow-xl overflow-hidden ${
                    result === -1 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                      : result && result < 90 
                        ? 'bg-gradient-to-br from-red-500 to-rose-600' 
                        : 'bg-gradient-to-br from-amber-500 to-orange-500'
                  }`}>
                    <CardContent className="pt-8 pb-8 text-center text-white">
                      {result === -1 ? (
                        <>
                          <div className="text-5xl mb-3">🎉</div>
                          <p className="text-lg opacity-90 mb-1">축하합니다!</p>
                          <p className="text-2xl font-bold">
                            수익이 비용을 초과해요!
                          </p>
                          <p className="text-sm opacity-80 mt-2">
                            하지만 더 큰 성장을 위한 기회가 있어요
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="text-5xl mb-3">{result && result < 90 ? "😱" : "🤔"}</div>
                          <p className="text-lg opacity-90 mb-1">사장님의 생존 가능 기간</p>
                          <p className="text-6xl font-black mb-1">
                            {result}<span className="text-3xl font-bold">일</span>
                          </p>
                          <p className="text-sm opacity-90">
                            {result && result < 90 ? "긴급한 대응이 필요해요!" : "조금 여유가 있지만 방심은 금물!"}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Cost Saving Tips Preview */}
                  <Card className="border-0 rounded-3xl shadow-lg bg-card/80 backdrop-blur overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-semibold">김비서의 비용 절감 포인트</span>
                      </div>
                      
                      <div className="space-y-3">
                        {costSavingTips.map((tip, index) => (
                          <div 
                            key={index}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-background rounded-lg shadow-sm">
                                <tip.icon className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-sm font-medium">{tip.text}</span>
                            </div>
                            <span className="text-sm font-bold text-green-600">-{tip.saving}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex items-center justify-center gap-2 pt-4 text-muted-foreground">
                        <Lightbulb className="h-4 w-4" />
                        <span className="text-sm">더 많은 절감 포인트가 있어요...</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* CTA Section */}
                  <Card className="border-0 rounded-3xl shadow-xl bg-gradient-to-br from-primary to-blue-600 overflow-hidden">
                    <CardContent className="p-6 text-center text-white">
                      <p className="text-sm opacity-90 mb-2">
                        생존 기간을 확인한 사장님 중
                      </p>
                      <p className="text-2xl font-bold mb-4">
                        80%가 비용 최적화 리포트를<br />신청했어요!
                      </p>
                      
                      <Button 
                        onClick={() => navigate("/")}
                        size="lg"
                        variant="secondary"
                        className="w-full h-14 text-lg font-bold gap-2 rounded-xl hover-scale bg-white text-primary hover:bg-white/90"
                      >
                        <Bot className="h-5 w-5" />
                        AI 비서 무료로 시작하기
                        <ArrowRight className="h-5 w-5" />
                      </Button>
                      
                      <p className="text-xs opacity-80 mt-3">
                        ✨ 3분 내에 맞춤형 비용 절감 리포트를 받아보세요
                      </p>
                    </CardContent>
                  </Card>

                  {/* 다시하기 버튼 */}
                  <div className="text-center">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setBalance("");
                        setMonthlyRevenue("");
                        setMonthlyCost("");
                        setResult(null);
                        setShowResult(false);
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      다시 계산하기
                    </Button>
                  </div>
                </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
