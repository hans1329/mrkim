import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  ArrowRight, 
  ArrowLeft,
  Shield, 
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Smartphone,
  Lock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCardConnection } from "@/hooks/useCardConnection";
import { useCardSync } from "@/hooks/useCardSync";
import { useConnection } from "@/contexts/ConnectionContext";
import { toast } from "sonner";

// 카드사 목록 (실제 Codef 지원 카드사)
const CARD_COMPANIES = [
  { id: "shinhan", name: "신한카드", logo: "💳", color: "bg-blue-500" },
  { id: "samsung", name: "삼성카드", logo: "💳", color: "bg-blue-600" },
  { id: "kb", name: "KB국민카드", logo: "💳", color: "bg-yellow-500" },
  { id: "hyundai", name: "현대카드", logo: "💳", color: "bg-black" },
  { id: "lotte", name: "롯데카드", logo: "💳", color: "bg-red-500" },
  { id: "bc", name: "BC카드", logo: "💳", color: "bg-red-600" },
  { id: "hana", name: "하나카드", logo: "💳", color: "bg-green-500" },
  { id: "woori", name: "우리카드", logo: "💳", color: "bg-blue-400" },
  { id: "nh", name: "NH농협카드", logo: "💳", color: "bg-green-600" },
];

type FlowStep = "select-company" | "auth" | "loading" | "select-cards" | "complete";

interface CardConnectionFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

interface CardInfo {
  cardNo: string;
  cardName: string;
  cardType: string;
  validPeriod: string;
  issueDate: string;
  userName: string;
  sleepYN: string;
}

export function CardConnectionFlow({ onComplete, onBack }: CardConnectionFlowProps) {
  const [step, setStep] = useState<FlowStep>("select-company");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<"id" | "cert">("id");
  const [credentials, setCredentials] = useState({ id: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [fetchedCards, setFetchedCards] = useState<CardInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number } | null>(null);

  const { isLoading, registerCardAccount, getCards, connectedId } = useCardConnection();
  const cardSync = useCardSync();
  const { refetch: refetchProfile } = useConnection();

  const stepProgress: Record<FlowStep, number> = {
    "select-company": 25,
    "auth": 50,
    "loading": 75,
    "select-cards": 85,
    "complete": 100,
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompany(companyId);
    setError(null);
  };

  const handleAuth = async () => {
    if (!credentials.id || !credentials.password || !agreedTerms || !selectedCompany) return;
    
    setError(null);
    setStep("loading");
    
    try {
      // 실제 Codef API 호출 - connectedId 반환
      const newConnectedId = await registerCardAccount(
        selectedCompany,
        credentials.id,
        credentials.password
      );
      
      if (newConnectedId) {
        // 로컬스토리지에 연동 정보 저장 (거래 동기화에서 사용)
        localStorage.setItem("codef_connected_id", newConnectedId);
        localStorage.setItem("codef_card_company", selectedCompany);
        localStorage.setItem("codef_card_company_name", selectedCompanyData?.name || selectedCompany);
        
        // 카드 목록 조회 - 반환된 connectedId 직접 전달
        const cards = await getCards(selectedCompany, newConnectedId);
        setFetchedCards(cards);
        setStep("select-cards");
      } else {
        setError("카드사 연결에 실패했습니다. 로그인 정보를 확인해주세요.");
        setStep("auth");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err instanceof Error ? err.message : "연결 중 오류가 발생했습니다.");
      setStep("auth");
    }
  };

  const handleSelectCards = async () => {
    if (fetchedCards.length > 0 && selectedCards.length === 0) return;
    
    // 거래 내역 동기화 시작
    setIsSyncing(true);
    setStep("complete");
    
    try {
      const storedConnectedId = localStorage.getItem("codef_connected_id");
      const storedCardCompany = localStorage.getItem("codef_card_company");
      const storedCardCompanyName = localStorage.getItem("codef_card_company_name");
      
      if (storedConnectedId && storedCardCompany) {
        // 최근 3개월 거래 내역 동기화
        const today = new Date();
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const startDate = threeMonthsAgo.toISOString().split("T")[0].replace(/-/g, "");
        const endDate = today.toISOString().split("T")[0].replace(/-/g, "");
        
        const result = await cardSync.mutateAsync({
          connectedId: storedConnectedId,
          cardCompanyId: storedCardCompany,
          cardCompanyName: storedCardCompanyName || storedCardCompany,
          startDate,
          endDate,
        });
        
        setSyncResult({ synced: result.synced, skipped: result.skipped });
        
        if (result.synced > 0) {
          toast.success(`${result.synced}건의 거래 내역을 동기화했습니다`);
        }
      }
    } catch (err) {
      console.error("Card sync error:", err);
      toast.error("거래 내역 동기화 중 오류가 발생했습니다. 나중에 다시 시도해주세요.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleComplete = () => {
    // 프로필 캐시 즉시 갱신하여 대시보드에서 연동 상태 반영
    refetchProfile();
    onComplete();
  };

  const selectedCompanyData = CARD_COMPANIES.find((c) => c.id === selectedCompany);

  return (
    <div className="space-y-4">
      {/* 진행 상태 */}
      <div className="space-y-2">
        <Progress value={stepProgress[step]} className="h-1.5" />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>카드사 선택</span>
          <span>로그인</span>
          <span>연결 중</span>
          <span>카드 선택</span>
          <span>완료</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: 카드사 선택 */}
          {step === "select-company" && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold">카드사 선택</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  연결할 카드사를 선택해주세요
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {CARD_COMPANIES.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleSelectCompany(company.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                      selectedCompany === company.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg",
                      company.color
                    )}>
                      {company.logo}
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight">
                      {company.name}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={onBack} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>
                <Button
                  onClick={() => setStep("auth")}
                  disabled={!selectedCompany}
                  className="flex-1"
                >
                  다음
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: 인증 정보 입력 */}
          {step === "auth" && selectedCompanyData && (
            <div className="space-y-4">
              <div className="text-center">
                <div className={cn(
                  "w-12 h-12 rounded-xl mx-auto flex items-center justify-center text-white text-xl mb-2",
                  selectedCompanyData.color
                )}>
                  {selectedCompanyData.logo}
                </div>
                <h3 className="text-lg font-bold">{selectedCompanyData.name} 로그인</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  카드사 홈페이지 로그인 정보를 입력해주세요
                </p>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 rounded-lg p-3 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  <p className="text-destructive">{error}</p>
                </div>
              )}

              {/* 인증 방법 선택 */}
              <div className="flex gap-2 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setAuthMethod("id")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm transition-all",
                    authMethod === "id" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <Smartphone className="h-4 w-4" />
                  아이디 로그인
                </button>
                <button
                  onClick={() => setAuthMethod("cert")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm transition-all",
                    authMethod === "cert" ? "bg-background shadow-sm" : "text-muted-foreground"
                  )}
                >
                  <Lock className="h-4 w-4" />
                  공동인증서
                </button>
              </div>

              {authMethod === "id" ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">아이디</Label>
                    <Input
                      placeholder="카드사 홈페이지 아이디"
                      value={credentials.id}
                      onChange={(e) => setCredentials({ ...credentials, id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">비밀번호</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="비밀번호"
                        value={credentials.password}
                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <Lock className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    공동인증서 로그인은 준비 중입니다
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    아이디 로그인을 이용해주세요
                  </p>
                </div>
              )}

              {/* 보안 안내 */}
              <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-3 text-xs">
                <Shield className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">256bit SSL 암호화 전송</p>
                  <p className="mt-0.5">입력하신 정보는 RSA로 암호화되어 안전하게 전송됩니다.</p>
                </div>
              </div>

              {/* 동의 */}
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="terms" 
                  checked={agreedTerms}
                  onCheckedChange={(checked) => setAgreedTerms(checked as boolean)}
                />
                <label htmlFor="terms" className="text-xs text-muted-foreground">
                  개인정보 수집 및 이용에 동의합니다 <span className="text-primary">(필수)</span>
                </label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("select-company")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>
                <Button
                  onClick={handleAuth}
                  disabled={!credentials.id || !credentials.password || !agreedTerms || isLoading || authMethod === "cert"}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      연결 중...
                    </>
                  ) : (
                    <>
                      로그인
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: 로딩 화면 */}
          {step === "loading" && (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-bold">카드사 연결 중</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedCompanyData?.name}에 접속하고 있습니다...
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                최대 30초까지 소요될 수 있습니다
              </p>
            </div>
          )}

          {/* Step 4: 카드 선택 */}
          {step === "select-cards" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/10 mx-auto flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-lg font-bold">카드 연결 완료</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {fetchedCards.length > 0 
                    ? "연결할 카드를 선택해주세요"
                    : "카드사 연결이 완료되었습니다"}
                </p>
              </div>

              {fetchedCards.length > 0 ? (
                <div className="space-y-2">
                  {fetchedCards.map((card, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedCards((prev) =>
                          prev.includes(card.cardNo)
                            ? prev.filter((no) => no !== card.cardNo)
                            : [...prev, card.cardNo]
                        );
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        selectedCards.includes(card.cardNo)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        selectedCompanyData?.color || "bg-gray-500",
                        "text-white"
                      )}>
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{card.cardName}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {card.cardNo}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {card.cardType}
                        </p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        selectedCards.includes(card.cardNo)
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )}>
                        {selectedCards.includes(card.cardNo) && (
                          <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <CreditCard className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    조회된 카드가 없습니다
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    카드사에 등록된 카드가 있는지 확인해주세요
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("auth")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>
                <Button
                  onClick={handleSelectCards}
                  disabled={fetchedCards.length > 0 && selectedCards.length === 0}
                  className="flex-1"
                >
                  {fetchedCards.length > 0 ? (
                    <>
                      {selectedCards.length}개 카드 연결
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  ) : (
                    <>
                      완료
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 5: 완료 */}
          {step === "complete" && (
            <div className="space-y-4 text-center">
              <div className="relative">
                {isSyncing ? (
                  <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {isSyncing ? "거래 내역 동기화 중..." : "카드 연결 완료!"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {isSyncing 
                    ? "최근 3개월 거래 내역을 가져오고 있습니다"
                    : `${selectedCompanyData?.name}가 연결되었습니다`}
                </p>
              </div>

              {/* 동기화 결과 표시 */}
              {!isSyncing && syncResult && (
                <div className="bg-primary/5 rounded-xl p-4 text-sm">
                  <p className="font-medium text-primary">
                    {syncResult.synced > 0 
                      ? `✓ ${syncResult.synced}건의 거래 내역이 동기화되었습니다`
                      : "새로 동기화할 거래 내역이 없습니다"}
                  </p>
                  {syncResult.skipped > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {syncResult.skipped}건은 이미 동기화됨
                    </p>
                  )}
                </div>
              )}

              {fetchedCards.length > 0 && selectedCards.length > 0 && !isSyncing && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  {fetchedCards
                    .filter((c) => selectedCards.includes(c.cardNo))
                    .map((card, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div className="text-left">
                          <p className="font-medium">{card.cardName}</p>
                          <p className="text-muted-foreground font-mono text-xs mt-0.5">{card.cardNo}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {isSyncing 
                  ? "잠시만 기다려주세요..."
                  : "지출 내역이 자동으로 분류되어 관리됩니다"}
              </p>

              <Button onClick={handleComplete} disabled={isSyncing} className="w-full">
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    동기화 중...
                  </>
                ) : (
                  <>
                    다음 단계로
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
