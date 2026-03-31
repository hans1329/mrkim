import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { 
  Building2, 
  ArrowRight, 
  ArrowLeft,
  Shield, 
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
  Smartphone,
  Lock,
  AlertCircle,
  Wallet,
  Upload,
  FileKey
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccountConnection } from "@/hooks/useAccountConnection";
import { useBankSync } from "@/hooks/useBankSync";
import { useConnection } from "@/contexts/ConnectionContext";

// 모든 은행에서 아이디/비밀번호 로그인을 기본 지원하며, 인증서 로그인은 선택 옵션

// 은행 목록
const BANKS = [
  { id: "shinhan", name: "신한은행", color: "bg-blue-500" },
  { id: "kb", name: "KB국민은행", color: "bg-yellow-500" },
  { id: "woori", name: "우리은행", color: "bg-blue-600" },
  { id: "hana", name: "하나은행", color: "bg-green-500" },
  { id: "nh", name: "NH농협은행", color: "bg-green-600" },
  { id: "ibk", name: "IBK기업은행", color: "bg-blue-700" },
  { id: "kakao", name: "카카오뱅크", color: "bg-yellow-400" },
  { id: "toss", name: "토스뱅크", color: "bg-blue-400" },
  { id: "kbank", name: "케이뱅크", color: "bg-pink-500" },
];

type FlowStep = "select-bank" | "auth" | "loading" | "select-accounts" | "syncing" | "complete";

interface AccountConnectionFlowProps {
  onComplete: () => void;
  onBack: () => void;
}

interface AccountInfo {
  accountNo: string;
  accountName: string;
  accountType: string;
  balance: string;
  currency: string;
  holder: string;
}


export function AccountConnectionFlow({ onComplete, onBack }: AccountConnectionFlowProps) {
  const [step, setStep] = useState<FlowStep>("select-bank");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({ id: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certPassword, setCertPassword] = useState("");
  const [showCertPassword, setShowCertPassword] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [fetchedAccounts, setFetchedAccounts] = useState<AccountInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<{ synced: number; total: number }>({ synced: 0, total: 0 });
  const [currentConnectedId, setCurrentConnectedId] = useState<string | null>(null);
  const certFileInputRef = useRef<HTMLInputElement>(null);

  // 로그인 방식: 기본 아이디/비번, 인증서는 사용자 선택
  const [useCertLogin, setUseCertLogin] = useState(false);
  const isCertBank = useCertLogin;

  const { isLoading, registerBankAccount, getAccounts } = useAccountConnection();
  const bankSync = useBankSync();
  const { refetch: refetchProfile } = useConnection();

  const stepProgress: Record<FlowStep, number> = {
    "select-bank": 20,
    "auth": 40,
    "loading": 55,
    "select-accounts": 70,
    "syncing": 85,
    "complete": 100,
  };

  const handleSelectBank = (bankId: string) => {
    setSelectedBank(bankId);
    setError(null);
  };

  const handleAuth = async () => {
    if (!agreedTerms || !selectedBank) return;

    // 인증서 은행: certFile + certPassword 필요
    if (isCertBank && (!certFile || !certPassword)) return;
    // 아이디 은행: id + password 필요
    if (!isCertBank && (!credentials.id || !credentials.password)) return;
    
    setError(null);
    setStep("loading");
    
    try {
      let newConnectedId: string | null = null;

      if (isCertBank && certFile) {
        // 인증서 파일을 Base64로 변환
        const certBase64 = await fileToBase64(certFile);
        newConnectedId = await registerBankAccount(
          selectedBank,
          "", // id는 인증서 방식에선 불필요
          certPassword,
          { loginType: "2", certFile: certBase64, certPassword }
        );
      } else {
        newConnectedId = await registerBankAccount(
          selectedBank,
          credentials.id,
          credentials.password
        );
      }
      
      if (newConnectedId) {
        setCurrentConnectedId(newConnectedId);
        const accounts = await getAccounts(selectedBank, newConnectedId);
        setFetchedAccounts(accounts);
        setStep("select-accounts");
      } else {
        setError("은행 연결에 실패했습니다. 입력 정보를 확인해주세요.");
        setStep("auth");
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(err instanceof Error ? err.message : "연결 중 오류가 발생했습니다.");
      setStep("auth");
    }
  };

  // File → Base64 변환
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // "data:...;base64," 접두사 제거
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
    });
  };

  // 계좌 선택 후 거래 내역 자동 동기화
  const handleSelectAccounts = async () => {
    if (selectedAccounts.length === 0 || !currentConnectedId || !selectedBank) {
      setStep("complete");
      return;
    }
    
    setStep("syncing");
    setSyncProgress({ synced: 0, total: selectedAccounts.length });
    
    const bankName = selectedBankData?.name || "은행";
    
    // 선택된 각 계좌에 대해 거래 내역 동기화
    for (let i = 0; i < selectedAccounts.length; i++) {
      const accountNo = selectedAccounts[i];
      try {
        await bankSync.mutateAsync({
          connectedId: currentConnectedId,
          bankId: selectedBank,
          bankName,
          accountNo,
          isInitialSync: true,
        });
        setSyncProgress({ synced: i + 1, total: selectedAccounts.length });
      } catch (err) {
        console.error(`Failed to sync account ${accountNo}:`, err);
        // 일부 계좌 동기화 실패해도 계속 진행
      }
    }
    
    setStep("complete");
  };

  const handleComplete = () => {
    refetchProfile();
    onComplete();
  };

  const selectedBankData = BANKS.find((b) => b.id === selectedBank);

  const formatBalance = (balance: string) => {
    const num = parseInt(balance, 10);
    if (isNaN(num)) return "0원";
    return num.toLocaleString() + "원";
  };

  return (
    <div className="space-y-4">

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 1: 은행 선택 */}
          {step === "select-bank" && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-bold">은행 선택</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  연결할 은행을 선택해주세요
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {BANKS.map((bank) => (
                  <button
                    key={bank.id}
                    onClick={() => handleSelectBank(bank.id)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all",
                      selectedBank === bank.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center text-white",
                      bank.color
                    )}>
                      <Building2 className="h-5 w-5" />
                    </div>
                    <span className="text-[11px] font-medium text-center leading-tight">
                      {bank.name}
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
                  disabled={!selectedBank}
                  className="flex-1"
                >
                  다음
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: 인증 정보 입력 */}
          {step === "auth" && selectedBankData && (
            <div className="space-y-4">
              <div className="text-center">
                <div className={cn(
                  "w-12 h-12 rounded-xl mx-auto flex items-center justify-center text-white mb-2",
                  selectedBankData.color
                )}>
                  <Building2 className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold">{selectedBankData.name} 로그인</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  인터넷뱅킹 로그인 정보를 입력해주세요
                </p>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 rounded-lg p-3 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                  <p className="text-destructive">{error}</p>
                </div>
              )}

              {/* 로그인 방식 선택 */}
              <div className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  {useCertLogin ? (
                    <Lock className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <Smartphone className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {useCertLogin ? "공동인증서" : "아이디/비밀번호"}
                    </span> 로그인
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setUseCertLogin(!useCertLogin)}
                  className="text-xs text-primary font-medium hover:underline"
                >
                  {useCertLogin ? "아이디/비번으로 전환" : "인증서로 전환"}
                </button>
              </div>

              {/* 인증서 로그인 */}
              {isCertBank ? (
                <div className="space-y-3">
                  {/* 인증서 파일 업로드 */}
                  <div className="space-y-2">
                    <Label className="text-xs">공동인증서 (구 공인인증서)</Label>
                    <input
                      ref={certFileInputRef}
                      type="file"
                      accept=".pfx,.p12,.der,.key"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setCertFile(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => certFileInputRef.current?.click()}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-lg border-2 border-dashed transition-all text-left",
                        certFile ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}
                    >
                      {certFile ? (
                        <>
                          <FileKey className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{certFile.name}</p>
                            <p className="text-xs text-muted-foreground">
                              인증서 등록 완료 · {(certFile.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm text-muted-foreground">내 PC에서 인증서 불러오기</p>
                            <p className="text-xs text-muted-foreground">USB 또는 하드디스크에 저장된 인증서</p>
                          </div>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 인증서 비밀번호 */}
                  <div className="space-y-2">
                    <Label className="text-xs">인증서 비밀번호</Label>
                    <div className="relative">
                      <Input
                        type={showCertPassword ? "text" : "password"}
                        placeholder="공동인증서 비밀번호"
                        value={certPassword}
                        onChange={(e) => setCertPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCertPassword(!showCertPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showCertPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* 아이디/비밀번호 로그인 */
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs">아이디</Label>
                    <Input
                      placeholder="인터넷뱅킹 아이디"
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
                <Button variant="outline" onClick={() => setStep("select-bank")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>
                <Button
                  onClick={handleAuth}
                  disabled={
                    !agreedTerms || isLoading ||
                    (isCertBank ? (!certFile || !certPassword) : (!credentials.id || !credentials.password))
                  }
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
                <h3 className="text-lg font-bold">은행 연결 중</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedBankData?.name}에 접속하고 있습니다...
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                최대 30초까지 소요될 수 있습니다
              </p>
            </div>
          )}

          {/* Step 4: 계좌 선택 */}
          {step === "select-accounts" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/10 mx-auto flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-lg font-bold">은행 연결 완료</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {fetchedAccounts.length > 0 
                    ? "연결할 계좌를 선택해주세요"
                    : "은행 연결이 완료되었습니다"}
                </p>
              </div>

              {fetchedAccounts.length > 0 ? (
                <div className="space-y-2">
                  {fetchedAccounts.map((account, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedAccounts((prev) =>
                          prev.includes(account.accountNo)
                            ? prev.filter((no) => no !== account.accountNo)
                            : [...prev, account.accountNo]
                        );
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        selectedAccounts.includes(account.accountNo)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        selectedBankData?.color || "bg-gray-500",
                        "text-white"
                      )}>
                        <Wallet className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{account.accountName || account.accountType}</p>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          {account.accountNo}
                        </p>
                        <p className="text-xs font-medium text-primary mt-1">
                          {formatBalance(account.balance)}
                        </p>
                      </div>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                        selectedAccounts.includes(account.accountNo)
                          ? "border-primary bg-primary"
                          : "border-muted-foreground"
                      )}>
                        {selectedAccounts.includes(account.accountNo) && (
                          <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <Wallet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    조회된 계좌가 없습니다
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    은행에 등록된 계좌가 있는지 확인해주세요
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("auth")} className="flex-1">
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  이전
                </Button>
                <Button
                  onClick={handleSelectAccounts}
                  disabled={fetchedAccounts.length > 0 && selectedAccounts.length === 0}
                  className="flex-1"
                >
                  {fetchedAccounts.length > 0 ? (
                    <>
                      {selectedAccounts.length}개 계좌 연결
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

          {/* Step 5: 동기화 중 */}
          {step === "syncing" && (
            <div className="space-y-4 text-center py-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-bold">거래 내역 동기화 중</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedBankData?.name} 거래 내역을 가져오고 있습니다...
                </p>
              </div>
              {syncProgress.total > 1 && (
                <div className="space-y-2">
                  <Progress 
                    value={(syncProgress.synced / syncProgress.total) * 100} 
                    className="h-2" 
                  />
                  <p className="text-xs text-muted-foreground">
                    {syncProgress.synced} / {syncProgress.total} 계좌 완료
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                최대 1분까지 소요될 수 있습니다
              </p>
            </div>
          )}

          {/* Step 6: 완료 */}
          {step === "complete" && (
            <div className="space-y-4 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-green-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold">계좌 연결 완료!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedBankData?.name}가 연결되었습니다
                </p>
              </div>

              {fetchedAccounts.length > 0 && selectedAccounts.length > 0 && (
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  {fetchedAccounts
                    .filter((a) => selectedAccounts.includes(a.accountNo))
                    .map((account, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <div className="text-left">
                          <p className="font-medium">{account.accountName || account.accountType}</p>
                          <p className="text-muted-foreground font-mono text-xs mt-0.5">{account.accountNo}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                입출금 내역이 자동으로 분류되어 관리됩니다
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
