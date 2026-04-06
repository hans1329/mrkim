import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  CreditCard, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  Upload,
  FileKey,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCardConnection } from "@/hooks/useCardConnection";
import { useCardSync } from "@/hooks/useCardSync";
import { useConnection } from "@/contexts/ConnectionContext";
import { useCardConnectionInfo } from "@/hooks/useCardConnectionInfo";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type FlowStep = "select-card" | "auth" | "loading" | "select-cards" | "complete";

interface CardConnectionFlowProps {
  onComplete: () => void;
  onBack: () => void;
  onStepChange?: (title: string) => void;
}

export interface CardConnectionFlowRef {
  handleBack: () => void;
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

// 카드사 목록
const CARD_COMPANIES = [
  { id: "shinhan", name: "신한카드", color: "bg-blue-500" },
  { id: "samsung", name: "삼성카드", color: "bg-blue-700" },
  { id: "kb", name: "KB국민카드", color: "bg-yellow-500" },
  { id: "hyundai", name: "현대카드", color: "bg-slate-700" },
  { id: "lotte", name: "롯데카드", color: "bg-red-500" },
  { id: "bc", name: "BC카드", color: "bg-red-600" },
  { id: "hana", name: "하나카드", color: "bg-green-500" },
  { id: "woori", name: "우리카드", color: "bg-blue-600" },
  { id: "nh", name: "NH농협카드", color: "bg-green-600" },
];

export const CardConnectionFlow = forwardRef<CardConnectionFlowRef, CardConnectionFlowProps>(function CardConnectionFlow({ onComplete, onBack, onStepChange }, ref) {
  const [step, setStep] = useState<FlowStep>("select-card");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ id: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [fetchedCards, setFetchedCards] = useState<CardInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; skipped: number } | null>(null);
  const [showReconnectDialog, setShowReconnectDialog] = useState(false);
  const [pendingCompanyId, setPendingCompanyId] = useState<string | null>(null);

  // 인증서 로그인 관련
  const [useCertLogin, setUseCertLogin] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null); // signPri.key (DER+KEY 분리)
  const [certPassword, setCertPassword] = useState("");
  const [showCertPassword, setShowCertPassword] = useState(false);
  const certFileInputRef = useRef<HTMLInputElement>(null);
  const keyFileInputRef = useRef<HTMLInputElement>(null);

  const { isLoading, registerCardAccount, getCards } = useCardConnection();
  const cardSync = useCardSync();
  const { refetch: refetchProfile, profile } = useConnection();
  const { connections: existingCardConnections } = useCardConnectionInfo();

  // 법인사업자면 clientType "B", 아니면 "P"
  const clientType: "P" | "B" = profile?.business_type === "법인" ? "B" : "P";

  const stepProgress: Record<FlowStep, number> = {
    "select-card": 20,
    "auth": 40,
    "loading": 60,
    "select-cards": 80,
    "complete": 100,
  };

  const selectedCompanyName = CARD_COMPANIES.find(c => c.id === selectedCompany)?.name || "";

  const handleCertFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "pfx" || ext === "p12") {
        setCertFile(file);
        setKeyFile(null); // PFX 선택 시 key 파일 초기화
      } else if (ext === "der") {
        setCertFile(file);
      } else if (ext === "key") {
        setKeyFile(file);
      } else {
        toast.error("공동인증서 파일(.pfx, .p12, .der, .key)만 업로드 가능합니다.");
      }
    }
  };

  const handleKeyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "key") {
        setKeyFile(file);
      } else {
        toast.error("signPri.key 파일만 업로드 가능합니다.");
      }
    }
  };

  const isDerMode = certFile?.name.toLowerCase().endsWith(".der");

  // File → Base64 변환
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
    });
  };

  const handleAuth = async () => {
    if (!agreedTerms || !selectedCompany) return;

    if (useCertLogin) {
      if (!certFile || !certPassword) return;
      if (isDerMode && !keyFile) return; // DER 모드에서는 key 파일도 필요
    } else {
      if (!credentials.id || !credentials.password) return;
    }

    setError(null);
    setStep("loading");

    try {
      let newConnectedId: string | null = null;

      if (useCertLogin && certFile) {
        // 인증서 파일을 Base64로 변환
        const certBase64 = await fileToBase64(certFile);
        let keyBase64: string | undefined;
        if (keyFile) {
          keyBase64 = await fileToBase64(keyFile);
        }

        newConnectedId = await registerCardAccount(
          selectedCompany,
          "",
          "",
          {
            loginType: "0",
            certFile: certBase64,
            certPassword: certPassword,
            keyFile: keyBase64,
            clientType,
          },
          clientType,
        );
      } else {
        newConnectedId = await registerCardAccount(
          selectedCompany,
          credentials.id,
          credentials.password,
          undefined,
          clientType,
        );
      }

      if (newConnectedId) {
        localStorage.setItem("codef_connected_id", newConnectedId);
        localStorage.setItem("codef_card_company", selectedCompany);
        localStorage.setItem("codef_card_company_name", selectedCompanyName);

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
    "select-card": "카드사 선택",
    auth: "카드사 로그인",
    loading: "연결 중",
    "select-cards": "카드 선택",
    complete: "연결 완료",
  };

  useEffect(() => {
    onStepChange?.(stepTitle[step]);
  }, [step, onStepChange]);

  const handleBack = () => {
    if (step === "auth") {
      setStep("select-card");
      setError(null);
      setCredentials({ id: "", password: "" });
      setCertFile(null);
      setCertPassword("");
      setUseCertLogin(false);
      setAgreedTerms(false);
    } else {
      onBack();
    }
  };

  useImperativeHandle(ref, () => ({ handleBack }), [step]);

  return (
    <>
    <div className="space-y-4">
      {/* 진행 상태 */}
      {step !== "select-card" && step !== "auth" && (
        <div className="space-y-2">
          <Progress value={stepProgress[step]} className="h-1.5" />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>카드사 선택</span>
            <span>로그인</span>
            <span>카드 선택</span>
            <span>완료</span>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: 카드사 선택 */}
          {step === "select-card" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl mx-auto flex items-center justify-center bg-primary/10 mb-2">
                  <CreditCard className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold">연결할 카드사를 선택하세요</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  공동인증서 또는 아이디/비밀번호로 연결합니다
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {CARD_COMPANIES.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      const alreadyConnected = existingCardConnections.some(
                        (c) => c.cardCompanyId === company.id
                      );
                      if (alreadyConnected) {
                        setPendingCompanyId(company.id);
                        setShowReconnectDialog(true);
                      } else {
                        setSelectedCompany(company.id);
                        setStep("auth");
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all",
                      "border-border hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white", company.color)}>
                      <CreditCard className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium">{company.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: 로그인 */}
          {step === "auth" && selectedCompany && (
            <div className="space-y-4">
              <div className="text-center">
                <div className={cn(
                  "w-14 h-14 rounded-xl mx-auto flex items-center justify-center text-white mb-2",
                  CARD_COMPANIES.find(c => c.id === selectedCompany)?.color || "bg-primary"
                )}>
                  <CreditCard className="h-7 w-7" />
                </div>
                <h3 className="text-lg font-bold">{selectedCompanyName} 로그인</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {useCertLogin ? "공동인증서로 로그인합니다" : "아이디와 비밀번호를 입력하세요"}
                </p>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 rounded-lg p-3 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  <p className="text-destructive">{error}</p>
                </div>
              )}

              {/* 로그인 방식 토글 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setUseCertLogin(false)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors border",
                    !useCertLogin
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  아이디/비밀번호
                </button>
                <button
                  onClick={() => setUseCertLogin(true)}
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors border",
                    useCertLogin
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50"
                  )}
                >
                  공동인증서
                </button>
              </div>

              {/* 입력 필드 */}
              {useCertLogin ? (
                <div className="space-y-3">
                  <div>
                    <input
                      ref={certFileInputRef}
                      type="file"
                      accept=".pfx,.p12,.der"
                      onChange={handleCertFileChange}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => certFileInputRef.current?.click()}
                      className={`w-full justify-center gap-2 h-11 hover:bg-muted hover:text-foreground ${certFile ? '' : 'border-dashed border-2'}`}
                    >
                      {certFile ? (
                        <>
                          <FileKey className="h-4 w-4 text-primary" />
                          <span className="truncate text-sm flex-1">{certFile.name}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setCertFile(null); setKeyFile(null); setCertPassword(""); }} className="p-0.5 rounded-full hover:bg-muted"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">인증서 파일 (.pfx, .p12 또는 signCert.der)</span>
                        </>
                      )}
                    </Button>
                  </div>
                  {/* DER 모드일 때 key 파일 업로드 */}
                  {isDerMode && (
                    <div>
                      <input
                        ref={keyFileInputRef}
                        type="file"
                        accept=".key"
                        onChange={handleKeyFileChange}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => keyFileInputRef.current?.click()}
                        className={`w-full justify-center gap-2 h-11 hover:bg-muted hover:text-foreground ${keyFile ? '' : 'border-dashed border-2'}`}
                      >
                        {keyFile ? (
                          <>
                            <FileKey className="h-4 w-4 text-primary" />
                            <span className="truncate text-sm flex-1">{keyFile.name}</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); setKeyFile(null); }} className="p-0.5 rounded-full hover:bg-muted"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">개인키 파일 (signPri.key)</span>
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <div className="relative">
                    <Input
                      type={showCertPassword ? "text" : "password"}
                      placeholder="인증서 비밀번호"
                      value={certPassword}
                      onChange={(e) => setCertPassword(e.target.value)}
                      disabled={!certFile}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCertPassword(!showCertPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      disabled={!certFile}
                    >
                      {showCertPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    placeholder={`${selectedCompanyName} 아이디`}
                    value={credentials.id}
                    onChange={(e) => setCredentials({ ...credentials, id: e.target.value })}
                  />
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={`${selectedCompanyName} 비밀번호`}
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
              )}

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
                  id="card-terms"
                  checked={agreedTerms}
                  onCheckedChange={(checked) => setAgreedTerms(checked as boolean)}
                />
                <label htmlFor="card-terms" className="text-xs text-muted-foreground">
                  개인정보 수집 및 이용에 동의합니다 <span className="text-primary">(필수)</span>
                </label>
              </div>

              {/* 로그인 버튼 */}
              <Button
                onClick={handleAuth}
                disabled={
                  !agreedTerms || isLoading ||
                  (useCertLogin ? (!certFile || !certPassword) : (!credentials.id || !credentials.password))
                }
                className="w-full h-12 text-base"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    연결 중...
                  </>
                ) : (
                  <>
                    {selectedCompanyName} 연결하기
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step 3: 로딩 화면 */}
          {step === "loading" && (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-bold">{selectedCompanyName} 연결 중</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  카드 정보를 가져오고 있습니다...
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
                <h3 className="text-lg font-bold">{selectedCompanyName} 연결 완료</h3>
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
                    {selectedCompanyName}에 등록된 카드가 있는지 확인해주세요
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
                    : `${selectedCompanyName} 카드매출이 연결되었습니다`}
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

    <AlertDialog open={showReconnectDialog} onOpenChange={setShowReconnectDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>이미 연동한 카드입니다</AlertDialogTitle>
          <AlertDialogDescription>
            {CARD_COMPANIES.find(c => c.id === pendingCompanyId)?.name}은(는) 이미 연동되어 있습니다. 다시 연동할까요?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setPendingCompanyId(null)}>취소</AlertDialogCancel>
          <AlertDialogAction onClick={() => {
            if (pendingCompanyId) {
              setSelectedCompany(pendingCompanyId);
              setStep("auth");
              setPendingCompanyId(null);
              setShowReconnectDialog(false);
            }
          }}>
            다시 연동하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
});
