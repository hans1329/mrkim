import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const EXPIRED_LINK_MESSAGE = "재설정 링크가 만료되었거나 이미 사용되었습니다. 새 비밀번호 재설정 메일을 다시 요청해주세요.";

const getRecoveryErrorMessage = (errorCode?: string | null, errorDescription?: string | null) => {
  const normalized = `${errorCode ?? ""} ${errorDescription ?? ""}`.toLowerCase();

  if (normalized.includes("otp_expired") || normalized.includes("access_denied") || normalized.includes("expired")) {
    return EXPIRED_LINK_MESSAGE;
  }

  return "유효하지 않은 비밀번호 재설정 링크입니다. 새 메일을 다시 요청해주세요.";
};

const clearRecoveryUrl = () => {
  const cleanUrl = `${window.location.origin}${window.location.pathname}`;
  window.history.replaceState({}, document.title, cleanUrl);
};

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const finishRecovery = () => {
      if (!isMounted) return;
      setAuthError(null);
      setIsRecovery(true);
      setIsChecking(false);
    };

    const finishError = (message: string) => {
      if (!isMounted) return;
      setAuthError(message);
      setIsRecovery(false);
      setIsChecking(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        clearRecoveryUrl();
        finishRecovery();
      }
    });

    const initializeRecovery = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      const code = searchParams.get("code");
      const hashType = hashParams.get("type");
      const hashErrorCode = hashParams.get("error_code");
      const hashErrorDescription = hashParams.get("error_description");

      if (hashErrorCode) {
        clearRecoveryUrl();
        finishError(getRecoveryErrorMessage(hashErrorCode, hashErrorDescription));
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        clearRecoveryUrl();

        if (error) {
          finishError(getRecoveryErrorMessage(error.name, error.message));
          return;
        }

        finishRecovery();
        return;
      }

      if (hashType === "recovery") {
        clearRecoveryUrl();
        finishRecovery();
        return;
      }

      finishError("유효하지 않은 비밀번호 재설정 경로입니다. 로그인 화면에서 다시 요청해주세요.");
    };

    void initializeRecovery();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      const normalized = `${error.name} ${error.message}`.toLowerCase();

      if (normalized.includes("same_password") || normalized.includes("different from the old password")) {
        toast.error("이전 비밀번호와 다른 새 비밀번호를 입력해주세요.");
        return;
      }

      toast.error("비밀번호 변경에 실패했습니다. 링크를 다시 열어 시도해주세요.");
      return;
    }

    setIsComplete(true);
    toast.success("비밀번호가 변경되었습니다.");
  };

  if (isComplete) {
    return (
      <div className="bg-primary flex items-center justify-center fixed inset-0 p-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <CheckCircle className="h-16 w-16 mx-auto text-primary-foreground/80" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-primary-foreground">비밀번호 변경 완료</h1>
            <p className="text-primary-foreground/70 text-sm">새 비밀번호로 로그인할 수 있습니다.</p>
          </div>
          <Button className="w-full h-12 bg-white text-primary hover:bg-white/90" onClick={() => navigate("/")}>
            시작하기
          </Button>
        </div>
      </div>
    );
  }

  if (isChecking) {
    return (
      <div className="bg-primary flex items-center justify-center fixed inset-0 p-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary-foreground/60" />
          <p className="text-primary-foreground/70 text-sm">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  if (authError || !isRecovery) {
    return (
      <div className="bg-primary flex items-center justify-center fixed inset-0 p-6">
        <div className="w-full max-w-sm text-center space-y-6">
          <AlertCircle className="h-16 w-16 mx-auto text-primary-foreground/80" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-primary-foreground">링크를 다시 확인해주세요</h1>
            <p className="text-primary-foreground/70 text-sm">{authError ?? EXPIRED_LINK_MESSAGE}</p>
          </div>
          <div className="space-y-3">
            <Button className="w-full h-12 bg-white text-primary hover:bg-white/90" onClick={() => navigate("/login")}>
              로그인으로 돌아가기
            </Button>
            <Button variant="ghost" className="w-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => navigate("/")}>
              홈으로 이동
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary flex items-center justify-center fixed inset-0 p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-primary-foreground">새 비밀번호 설정</h1>
          <p className="text-primary-foreground/70 text-sm">새로 사용할 비밀번호를 입력해주세요.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-primary-foreground">새 비밀번호</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="6자 이상"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-white/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-primary-foreground">비밀번호 확인</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="비밀번호 재입력"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="bg-white/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
            />
          </div>
          <Button type="submit" className="w-full h-12 bg-white text-primary hover:bg-white/90" disabled={isLoading}>
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "비밀번호 변경"}
          </Button>
        </form>
      </div>
    </div>
  );
}
