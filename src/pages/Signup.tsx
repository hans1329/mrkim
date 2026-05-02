import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WelcomeModal } from "@/components/auth/WelcomeModal";
const iccLogo = "/images/icc-2.webp";

const passwordRules = [
  { key: "length", label: "8자 이상", test: (p: string) => p.length >= 8 },
  { key: "lower", label: "영문 소문자 포함", test: (p: string) => /[a-z]/.test(p) },
  { key: "upper", label: "영문 대문자 포함", test: (p: string) => /[A-Z]/.test(p) },
  { key: "digit", label: "숫자 포함", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "특수문자 포함 (!@#$% 등)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|<>?,./`~]/.test(p) },
];

function PasswordChecklist({ password }: { password: string }) {
  if (!password) return null;
  return (
    <ul className="space-y-1 mt-2">
      {passwordRules.map((rule) => {
        const passed = rule.test(password);
        return (
          <li key={rule.key} className="flex items-center gap-1.5 text-xs">
            {passed ? (
              <Check className="h-3 w-3 text-green-400 shrink-0" />
            ) : (
              <X className="h-3 w-3 text-red-400 shrink-0" />
            )}
            <span className={passed ? "text-green-300" : "text-red-300"}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const allRulesPassed = useMemo(() => passwordRules.every((r) => r.test(password)), [password]);
  const passwordsMatch = password === confirmPassword;

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error("Google 가입에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  const handleKakaoSignup = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error("카카오 가입에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allRulesPassed) {
      toast.error("비밀번호 조건을 모두 충족해주세요.");
      return;
    }

    if (!passwordsMatch) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }
    
    setIsLoading(true);
    
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          name: name.trim(),
        },
      },
    });
    
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("password")) {
        toast.error("비밀번호가 보안 조건을 충족하지 않습니다. 아래 체크리스트를 확인해주세요.");
      } else if (msg.includes("already registered") || msg.includes("already been registered")) {
        toast.error("이미 가입된 이메일입니다. 로그인을 시도해주세요.");
      } else if (msg.includes("valid email") || msg.includes("invalid email")) {
        toast.error("올바른 이메일 형식을 입력해주세요.");
      } else if (msg.includes("rate limit") || msg.includes("too many requests")) {
        toast.error("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
      } else if (msg.includes("signup is disabled")) {
        toast.error("현재 회원가입이 일시적으로 중단되었습니다.");
      } else {
        toast.error("회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
      setIsLoading(false);
      return;
    }
    
    // 세션이 있으면 축하 모달 표시 (이메일 인증 비활성화 시)
    if (data.session) {
      setIsLoading(false);
      setShowWelcome(true);
    } else {
      // 이메일 인증이 필요한 경우
      toast.success("회원가입 성공! 이메일을 확인해주세요.");
      navigate("/login");
    }
  };

  const handleStartApp = () => {
    setShowWelcome(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col">
      {/* 상단 뒤로가기 버튼 */}
      <div className="p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
          onClick={() => navigate("/login")}
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* 로고 & 타이틀 */}
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center justify-center">
              <img
                src={iccLogo}
                alt="김비서"
                className="h-20 w-auto"
                style={{
                  filter: "drop-shadow(4px 8px 6px rgba(0, 0, 0, 0.3))",
                }}
              />
            </div>
            <div className="space-y-1">
              <h1 className="font-bold text-primary-foreground text-3xl">
                김 · 비 · 서
              </h1>
              <p className="text-primary-foreground/80 tracking-wide font-semibold text-base">
                Mr. Kim
              </p>
            </div>
            <p className="text-primary-foreground/70 text-sm font-bold">
              회원가입
            </p>
          </div>

          {!isEmailMode ? (
            <div className="space-y-3">
              {/* 소셜 로그인 버튼들 */}
              <Button
                variant="outline"
                className="w-full h-12 gap-3 text-base bg-white hover:bg-white/90 text-foreground border-0"
                onClick={handleGoogleSignup}
                disabled={isLoading}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 계속하기
              </Button>

              <Button
                className="w-full h-12 gap-3 text-base border-0"
                style={{
                  backgroundColor: "#FEE500",
                  color: "#000000",
                }}
                onClick={handleKakaoSignup}
                disabled={isLoading}
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 0 0-.656-.678l-1.928 1.866V9.282a.472.472 0 0 0-.944 0v2.557a.471.471 0 0 0 0 .222v2.276a.472.472 0 1 0 .944 0v-1.691l.466-.45 1.572 2.341a.472.472 0 0 0 .782-.526l-1.706-2.95zm-9.6-1.59a.472.472 0 0 0-.472.472v4.531a.472.472 0 1 0 .944 0V9.942a.472.472 0 0 0-.472-.472zm3.5 0a.472.472 0 0 0-.472.472v4.531a.472.472 0 1 0 .944 0v-1.414l1.099 1.645a.472.472 0 1 0 .786-.526l-1.328-1.988 1.328-1.285a.472.472 0 0 0-.656-.678l-1.229 1.189V9.942a.472.472 0 0 0-.472-.472zm-5.446 1.322a.472.472 0 1 0 0 .944h1.035v3.115a.472.472 0 1 0 .944 0v-3.115h1.035a.472.472 0 1 0 0-.944H6.361z" />
                </svg>
                카카오로 계속하기
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full bg-primary-foreground/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-primary px-2 text-primary-foreground/70">
                    또는
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                className="w-full h-12 gap-3 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setIsEmailMode(true)}
              >
                <Mail className="h-5 w-5" />
                이메일로 가입하기
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 -ml-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                onClick={() => setIsEmailMode(false)}
              >
                <ArrowLeft className="h-4 w-4" />
                뒤로
              </Button>

              <form onSubmit={handleEmailSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-primary-foreground">
                    이름
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="홍길동"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-white/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-primary-foreground">
                    이메일
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-primary-foreground">
                    비밀번호
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                  />
                  <PasswordChecklist password={password} />
                </div>
                <div className="space-y-1">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-primary-foreground"
                  >
                    비밀번호 확인
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="flex items-center gap-1.5 text-xs text-red-300 mt-1">
                      <X className="h-3 w-3" />
                      비밀번호가 일치하지 않습니다
                    </p>
                  )}
                  {confirmPassword && passwordsMatch && (
                    <p className="flex items-center gap-1.5 text-xs text-green-300 mt-1">
                      <Check className="h-3 w-3" />
                      비밀번호가 일치합니다
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-white text-primary hover:bg-white/90"
                  disabled={isLoading || !allRulesPassed || !passwordsMatch || !confirmPassword}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "가입하기"}
                </Button>
              </form>
            </div>
          )}

          {/* 하단 링크들 */}
          <div className="text-center text-sm pt-4">
            <span className="text-primary-foreground/70">
              이미 계정이 있으신가요?{" "}
            </span>
            <Button
              variant="link"
              className="p-0 h-auto font-semibold text-primary-foreground hover:text-primary-foreground/80"
              onClick={() => navigate("/login")}
            >
              로그인
            </Button>
          </div>
        </div>
      </div>

      {/* 풋터 */}
      <footer className="py-6 text-center">
        <p className="text-primary-foreground/50 text-xs">
          © 2024 김비서. All rights reserved.
        </p>
      </footer>

      {/* 가입 축하 모달 */}
      <WelcomeModal 
        open={showWelcome} 
        userName={name} 
        onStart={handleStartApp} 
      />
    </div>
  );
}