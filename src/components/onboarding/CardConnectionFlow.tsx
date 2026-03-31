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
  AlertCircle,
  ExternalLink,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCardConnection } from "@/hooks/useCardConnection";
import { useCardSync } from "@/hooks/useCardSync";
import { useConnection } from "@/contexts/ConnectionContext";
import { toast } from "sonner";

type FlowStep = "auth" | "signup" | "loading" | "select-cards" | "complete";

interface CardConnectionFlowProps {
  onComplete: () => void;
  onBack: () => void;
  onStepChange?: (title: string) => void;
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

// 여신금융협회 카드매출 조회 서비스 관련 상수
const CREDIT_FINANCE_ASSOCIATION = {
  id: "crefia",
  name: "여신금융협회",
  signupUrl: "https://www.cardsales.or.kr/member/join",
  findIdUrl: "https://www.cardsales.or.kr/member/findId",
  findPwUrl: "https://www.cardsales.or.kr/member/findPw",
};

export function CardConnectionFlow({ onComplete, onBack, onStepChange }: CardConnectionFlowProps) {
  const [step, setStep] = useState<FlowStep>("auth");
  const [credentials, setCredentials] = useState({ id: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [fetchedCards, setFetchedCards] = useState<CardInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number } | null>(null);

  const { isLoading, registerCardAccount, getCards } = useCardConnection();
  const cardSync = useCardSync();
  const { refetch: refetchProfile } = useConnection();

  const stepProgress: Record<FlowStep, number> = {
    "auth": 25,
    "signup": 25,
    "loading": 50,
    "select-cards": 75,
    "complete": 100,
  };


  const handleAuth = async () => {
    if (!agreedTerms) return;
    if (!credentials.id || !credentials.password) return;
    
    setError(null);
    setStep("loading");
    
    try {
      let newConnectedId: string | null = null;
      const cardCompanyId = CREDIT_FINANCE_ASSOCIATION.id;

      newConnectedId = await registerCardAccount(
        cardCompanyId,
        credentials.id,
        credentials.password
      );
      
      if (newConnectedId) {
        localStorage.setItem("codef_connected_id", newConnectedId);
        localStorage.setItem("codef_card_company", cardCompanyId);
        localStorage.setItem("codef_card_company_name", CREDIT_FINANCE_ASSOCIATION.name);
        
        const cards = await getCards(cardCompanyId, newConnectedId);
        setFetchedCards(cards);
        setStep("select-cards");
      } else {
        setError("여신금융협회 연결에 실패했습니다. 로그인 정보를 확인해주세요.");
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
    
    setIsSyncing(true);
    setStep("complete");
    
    try {
      const storedConnectedId = localStorage.getItem("codef_connected_id");
      const storedCardCompany = localStorage.getItem("codef_card_company");
      const storedCardCompanyName = localStorage.getItem("codef_card_company_name");
      
      if (storedConnectedId && storedCardCompany) {
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
    refetchProfile();
    onComplete();
  };

  const stepTitle: Record<FlowStep, string> = {
    auth: "카드 연결",
    signup: "여신금융 회원가입",
    loading: "연결 중",
    "select-cards": "카드 선택",
    complete: "연결 완료",
  };

  const handleBack = () => {
    if (step === "signup") {
      setStep("auth");
    } else {
      onBack();
    }
  };

  return (
    <div className="space-y-4">
      {/* 서브 헤더 */}
      <div className="flex items-center gap-2 py-2.5">
        <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="text-base font-semibold">{stepTitle[step]}</h3>
      </div>

      {/* 진행 상태 */}
      <div className="space-y-2">
        <Progress value={stepProgress[step]} className="h-1.5" />
        <div className="flex justify-between text-[10px] text-muted-foreground">
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
          {/* Step 1: 여신금융협회 로그인 */}
          {step === "auth" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center bg-primary/10 mb-2">
                  <CreditCard className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold">카드매출 분석을 위해</h3>
                <h3 className="text-lg font-bold">여신금융 로그인이 필요해요</h3>
                <button
                  type="button"
                  onClick={() => window.open("https://www.cardsales.or.kr", "_blank")}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-2 hover:text-primary transition-colors"
                >
                  <Info className="h-3 w-3" />
                  여신금융협회가 무엇인가요?
                </button>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 rounded-lg p-3 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  <p className="text-destructive">{error}</p>
                </div>
              )}

              {/* 아이디/비밀번호 입력 */}
              <div className="space-y-3">
                  <div>

                    <Input
                      placeholder="여신금융협회 아이디"
                      value={credentials.id}
                      onChange={(e) => setCredentials({ ...credentials, id: e.target.value })}
                    />
                  </div>
                  <div>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="여신금융협회 비밀번호"
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

              {/* 보안 안내 */}
              <div className="bg-primary/5 rounded-lg p-3 text-xs">
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

              {/* 로그인 버튼 */}
              <Button
                onClick={handleAuth}
                disabled={
                  !agreedTerms || isLoading ||
                  !credentials.id || !credentials.password
                }
                className="w-full h-12 text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    연결 중...
                  </>
                ) : (
                  "로그인"
                )}
              </Button>

              {/* 하단 링크 (회원가입, 아이디/비밀번호 찾기) */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => setStep("signup")}
                  className="w-full text-sm"
                >
                  여신금융 회원가입
                </Button>
                <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => window.open(CREDIT_FINANCE_ASSOCIATION.findIdUrl, "_blank")}
                    className="hover:text-foreground transition-colors"
                  >
                    아이디 찾기
                  </button>
                  <span className="text-border">|</span>
                  <button
                    type="button"
                    onClick={() => window.open(CREDIT_FINANCE_ASSOCIATION.findPwUrl, "_blank")}
                    className="hover:text-foreground transition-colors"
                  >
                    비밀번호 찾기
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* 여신금융협회 회원가입 (iframe) */}
          {step === "signup" && (
            <div className="space-y-4">

              <div className="rounded-xl border overflow-hidden bg-background" style={{ height: "60vh" }}>
                <iframe
                  src="https://m.cardsales.or.kr/page/member/join/joinForm"
                  className="w-full h-full border-0"
                  title="여신금융협회 회원가입"
                  referrerPolicy="no-referrer"
                />
              </div>

              <Button
                onClick={() => setStep("auth")}
                className="w-full h-12 text-base"
              >
                가입 완료, 로그인하기
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>

            </div>
          )}

          {/* Step 2: 로딩 화면 */}
          {step === "loading" && (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-bold">여신금융협회 연결 중</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  카드 매출 정보를 가져오고 있습니다...
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                최대 30초까지 소요될 수 있습니다
              </p>
            </div>
          )}

          {/* Step 3: 카드 선택 */}
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
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary text-primary-foreground">
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
                    여신금융협회에 등록된 카드가 있는지 확인해주세요
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

          {/* Step 4: 완료 */}
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
                    : "여신금융협회를 통해 카드매출이 연결되었습니다"}
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
