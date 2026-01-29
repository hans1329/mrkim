import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bot, TrendingDown, Wallet, Building2, Users, Lightbulb, ArrowRight, Sparkles } from "lucide-react";
import survivalImage from "@/assets/survival-quiz.webp";

const Landing = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState<string>("");
  const [monthlyRevenue, setMonthlyRevenue] = useState<string>("");
  const [monthlyCost, setMonthlyCost] = useState<string>("");
  const [result, setResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-background to-red-50/30">
      <div className="max-w-lg mx-auto px-4 py-6">
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
                <span className="text-muted-foreground mx-2">인가?</span>
                <span className="text-destructive">탈락</span>
                <span className="text-muted-foreground">인가!</span>
              </h1>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div className="text-center mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-3">
            <Sparkles className="h-4 w-4" />
            사장님 생존 계산기
          </div>
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
                <Label htmlFor="balance" className="text-sm text-muted-foreground">💰 현재 잔고</Label>
                <Input
                  id="balance"
                  placeholder="50,000,000원"
                  value={balance}
                  onChange={(e) => setBalance(formatNumber(e.target.value))}
                  className="h-12 text-lg font-medium rounded-xl border-2 focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="revenue" className="text-sm text-muted-foreground">📈 월평균 매출</Label>
                <Input
                  id="revenue"
                  placeholder="10,000,000원"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(formatNumber(e.target.value))}
                  className="h-12 text-lg font-medium rounded-xl border-2 focus:border-primary"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cost" className="text-sm text-muted-foreground">💸 월 고정비 (임대료, 인건비 등)</Label>
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
          </div>
        )}

        {/* Footer spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default Landing;
