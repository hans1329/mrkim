import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Bot, TrendingDown, Wallet, Building2, Users, AlertTriangle, Lightbulb, ArrowRight } from "lucide-react";

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
      // 수익이 비용보다 크면 무한 생존
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
    <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-primary/10">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-destructive/10 to-transparent" />
        <div className="relative max-w-lg mx-auto px-4 pt-12 pb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 rounded-full mb-6">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">경고: 현실 직시 필요</span>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            사장님 생존 계산기
          </h1>
          <p className="text-xl font-semibold text-destructive mb-4">
            생존인가? 탈락인가!
          </p>
          <p className="text-muted-foreground">
            스타트업과 소상공인 모두에게<br />
            가장 공포스러운 것은 <span className="text-destructive font-semibold">"돈 마르는 날"</span>
          </p>
        </div>
      </div>

      {/* Calculator Section */}
      <div className="max-w-lg mx-auto px-4 pb-8">
        <Card className="border-2 border-border/50 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              내 사업 현황 입력
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="balance">현재 잔고 (원)</Label>
              <Input
                id="balance"
                placeholder="50,000,000"
                value={balance}
                onChange={(e) => setBalance(formatNumber(e.target.value))}
                className="text-lg font-medium"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="revenue">월평균 매출 (원)</Label>
              <Input
                id="revenue"
                placeholder="10,000,000"
                value={monthlyRevenue}
                onChange={(e) => setMonthlyRevenue(formatNumber(e.target.value))}
                className="text-lg font-medium"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost">월 고정비 (임대료, 인건비 등) (원)</Label>
              <Input
                id="cost"
                placeholder="15,000,000"
                value={monthlyCost}
                onChange={(e) => setMonthlyCost(formatNumber(e.target.value))}
                className="text-lg font-medium"
              />
            </div>

            <Button 
              onClick={calculateRunway} 
              className="w-full h-12 text-lg font-semibold"
              disabled={!balance || !monthlyRevenue || !monthlyCost}
            >
              생존 기간 계산하기
            </Button>
          </CardContent>
        </Card>

        {/* Result Section */}
        {showResult && (
          <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Survival Days */}
            <Card className={`border-2 ${result === -1 ? 'border-green-500/50 bg-green-500/5' : result && result < 90 ? 'border-destructive/50 bg-destructive/5' : 'border-yellow-500/50 bg-yellow-500/5'}`}>
              <CardContent className="pt-6 text-center">
                {result === -1 ? (
                  <>
                    <p className="text-lg text-muted-foreground mb-2">축하합니다!</p>
                    <p className="text-2xl font-bold text-green-600">
                      수익이 비용을 초과합니다 🎉
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      하지만 더 큰 성장을 위한 최적화 포인트가 있습니다
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg text-muted-foreground mb-2">사장님의 생존 가능 기간은</p>
                    <p className="text-5xl font-bold text-destructive mb-2">
                      {result}일
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {result < 90 ? "⚠️ 긴급한 대응이 필요합니다" : "조금 더 여유가 있지만 방심은 금물!"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Cost Saving Tips Preview */}
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  김비서가 제안하는 비용 절감 포인트
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {costSavingTips.map((tip, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-card rounded-lg border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <tip.icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-medium">{tip.text}</span>
                    </div>
                    <span className="text-sm font-bold text-green-600">-{tip.saving}</span>
                  </div>
                ))}
                
                <div className="flex items-center justify-center gap-2 pt-2 text-muted-foreground">
                  <Lightbulb className="h-4 w-4" />
                  <span className="text-sm">더 많은 절감 포인트가 있습니다...</span>
                </div>
              </CardContent>
            </Card>

            {/* CTA Section */}
            <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="pt-6 text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  내 생존일을 확인한 사장님들 중
                </p>
                <p className="text-2xl font-bold text-primary">
                  80%가 비용 최적화 리포트를 신청했습니다
                </p>
                
                <Button 
                  onClick={() => navigate("/")}
                  size="lg"
                  className="w-full h-14 text-lg font-bold gap-2 bg-primary hover:bg-primary/90"
                >
                  <Bot className="h-5 w-5" />
                  AI 비서의 제안 무료로 받기
                  <ArrowRight className="h-5 w-5" />
                </Button>
                
                <p className="text-xs text-muted-foreground">
                  가입 후 3분 내에 맞춤형 비용 절감 리포트를 받아보세요
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Landing;
