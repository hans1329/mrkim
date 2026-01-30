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
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";

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

// 목업 카드 데이터
const MOCK_CARDS = [
  { id: "1", name: "신한 Deep Dream", number: "****-****-****-1234", type: "신용" },
  { id: "2", name: "신한 Mr.Life", number: "****-****-****-5678", type: "체크" },
  { id: "3", name: "신한 법인카드", number: "****-****-****-9012", type: "법인" },
];

type FlowStep = "select-company" | "auth" | "verify" | "select-cards" | "complete";

interface CardConnectionFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

export function CardConnectionFlow({ onComplete, onBack }: CardConnectionFlowProps) {
  const [step, setStep] = useState<FlowStep>("select-company");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<"id" | "cert">("id");
  const [credentials, setCredentials] = useState({ id: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [agreedTerms, setAgreedTerms] = useState(false);

  const stepProgress: Record<FlowStep, number> = {
    "select-company": 20,
    "auth": 40,
    "verify": 60,
    "select-cards": 80,
    "complete": 100,
  };

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompany(companyId);
  };

  const handleAuth = async () => {
    if (!credentials.id || !credentials.password || !agreedTerms) return;
    setIsLoading(true);
    // 시뮬레이션: Codef API 인증 요청
    await new Promise((r) => setTimeout(r, 1500));
    setIsLoading(false);
    setStep("verify");
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) return;
    setIsLoading(true);
    // 시뮬레이션: SMS 인증 확인
    await new Promise((r) => setTimeout(r, 1000));
    setIsLoading(false);
    setStep("select-cards");
  };

  const handleSelectCards = async () => {
    if (selectedCards.length === 0) return;
    setIsLoading(true);
    // 시뮬레이션: 카드 연결 완료
    await new Promise((r) => setTimeout(r, 1000));
    setIsLoading(false);
    setStep("complete");
  };

  const handleComplete = () => {
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
          <span>인증</span>
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
                    공동인증서 선택 화면이 표시됩니다
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    (목업 모드에서는 아이디 로그인을 이용해주세요)
                  </p>
                </div>
              )}

              {/* 보안 안내 */}
              <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-3 text-xs">
                <Shield className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <div className="text-muted-foreground">
                  <p className="font-medium text-foreground">256bit SSL 암호화 전송</p>
                  <p className="mt-0.5">입력하신 정보는 암호화되어 안전하게 전송되며, 저장되지 않습니다.</p>
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
                  disabled={!credentials.id || !credentials.password || !agreedTerms || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      인증 중...
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

          {/* Step 3: SMS 인증 */}
          {step === "verify" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-2">
                  <Smartphone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold">본인 인증</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  등록된 휴대폰으로 인증번호가 발송되었습니다
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  010-****-1234
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">인증번호 6자리</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />
                <p className="text-xs text-muted-foreground text-center">
                  인증번호가 오지 않나요? <button className="text-primary underline">재발송</button>
                </p>
              </div>

              <div className="bg-yellow-500/10 rounded-lg p-3 text-xs text-yellow-700 dark:text-yellow-400">
                💡 <strong>목업 모드:</strong> 아무 6자리 숫자를 입력하세요
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("auth")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={verificationCode.length !== 6 || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      확인 중...
                    </>
                  ) : (
                    <>
                      확인
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: 카드 선택 */}
          {step === "select-cards" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/10 mx-auto flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-lg font-bold">카드 선택</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  연결할 카드를 선택해주세요
                </p>
              </div>

              <div className="space-y-2">
                {MOCK_CARDS.map((card) => (
                  <button
                    key={card.id}
                    onClick={() => {
                      setSelectedCards((prev) =>
                        prev.includes(card.id)
                          ? prev.filter((id) => id !== card.id)
                          : [...prev, card.id]
                      );
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      selectedCards.includes(card.id)
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
                    <div className="flex-1">
                      <p className="font-medium text-sm">{card.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {card.number} · {card.type}
                      </p>
                    </div>
                    <div className={cn(
                      "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      selectedCards.includes(card.id)
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    )}>
                      {selectedCards.includes(card.id) && (
                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("verify")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>
                <Button
                  onClick={handleSelectCards}
                  disabled={selectedCards.length === 0 || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      연결 중...
                    </>
                  ) : (
                    <>
                      {selectedCards.length}개 카드 연결
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
                <div className="w-16 h-16 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold">카드 연결 완료!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedCards.length}개의 카드가 연결되었습니다
                </p>
              </div>

              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                {MOCK_CARDS.filter((c) => selectedCards.includes(c.id)).map((card) => (
                  <div key={card.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{card.name}</span>
                    <span className="text-muted-foreground">({card.number})</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                지출 내역이 자동으로 분류되어 관리됩니다
              </p>

              <Button onClick={handleComplete} className="w-full">
                다음 단계로
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
