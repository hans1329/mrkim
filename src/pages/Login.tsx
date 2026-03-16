import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
const iccLogo = "/images/icc-2.webp";

// 로고 이미지 프리로딩
const preloadLogo = new Image();
preloadLogo.src = iccLogo;
import { ServiceChatProvider, useServiceChat } from "@/contexts/ServiceChatContext";
import { ServiceChatPanel } from "@/components/chat/ServiceChatPanel";
import { ServiceVoiceOverlay } from "@/components/chat/ServiceVoiceOverlay";

// 말풍선 형태의 챗봇 버튼
function SpeechBubbleButton() {
  const { openVoice } = useServiceChat();
  
  return (
    <button onClick={() => openVoice()} className="animate-bounce-subtle">
      <div className="relative bg-white rounded-2xl px-4 py-2 shadow-lg">
        <span className="text-xs font-medium text-primary whitespace-nowrap">
          궁금한게 있으시면 눌러주세요!
        </span>
        {/* 말풍선 꼬리 */}
        <div 
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "10px solid white",
          }}
        />
      </div>
    </button>
  );
}

function LoginContent() {
  const navigate = useNavigate();
  const { openVoice } = useServiceChat();
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error("Google 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error("카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
        toast.error("이메일 또는 비밀번호가 올바르지 않습니다.");
      } else if (msg.includes("email not confirmed")) {
        toast.error("이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.");
      } else if (msg.includes("too many requests") || msg.includes("rate limit")) {
        toast.error("로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.");
      } else if (msg.includes("user not found")) {
        toast.error("가입되지 않은 이메일입니다. 회원가입을 먼저 진행해주세요.");
      } else {
        toast.error("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
      }
      setIsLoading(false);
      return;
    }
    
    toast.success("로그인 성공!");
    navigate("/");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsLoading(false);
    if (error) {
      toast.error("비밀번호 재설정 메일 발송에 실패했습니다.");
      return;
    }
    setResetSent(true);
    toast.success("비밀번호 재설정 링크가 이메일로 전송되었습니다.");
  };
  return <div className="bg-primary flex flex-col fixed inset-0 overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* 상단 여백 */}
      <div className="p-4" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }} />

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* 로고 & 타이틀 */}
          <div className="text-center space-y-4">
            {/* 말풍선 버튼 - 화면 가로 중앙, 이미지 바로 위 */}
            <div className="flex justify-center mb-2">
              <SpeechBubbleButton />
            </div>
            <div className="flex flex-col items-center justify-center">
              <button 
                onClick={() => openVoice()}
                className="cursor-pointer hover:scale-105 transition-transform"
              >
                <img src={iccLogo} alt="김비서" loading="eager" fetchPriority="high" className="h-16 w-auto opacity-95" style={{
                  filter: "drop-shadow(4px 8px 6px rgba(0, 0, 0, 0.3))"
                }} />
              </button>
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
              명령만 하면 관리되는 사업장
            </p>
          </div>

          {!isEmailMode ? <div className="space-y-3">
              {/* 소셜 로그인 버튼들 */}
              <Button variant="outline" className="w-full h-12 gap-3 text-base bg-white hover:bg-white/90 text-foreground hover:text-foreground border-0" onClick={handleGoogleLogin} disabled={isLoading}>
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Google로 계속하기
              </Button>

              <Button className="w-full h-12 gap-3 text-base border-0" style={{
            backgroundColor: "#FEE500",
            color: "#000000"
          }} onClick={handleKakaoLogin} disabled={isLoading}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
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

              <Button variant="ghost" className="w-full h-12 gap-3 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setIsEmailMode(true)}>
                <Mail className="h-5 w-5" />
                이메일로 계속하기
              </Button>
            </div> : isForgotMode ? (
              <div className="space-y-4">
                <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => { setIsForgotMode(false); setResetSent(false); }}>
                  <ArrowLeft className="h-4 w-4" />
                  로그인으로 돌아가기
                </Button>

                {resetSent ? (
                  <div className="text-center space-y-3 py-4">
                    <Mail className="h-10 w-10 mx-auto text-primary-foreground/80" />
                    <p className="text-primary-foreground font-medium">메일을 확인해주세요</p>
                    <p className="text-primary-foreground/70 text-sm">
                      <span className="font-medium text-primary-foreground">{email}</span>으로<br />
                      비밀번호 재설정 링크를 보냈습니다.
                    </p>
                    <Button variant="ghost" className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 text-sm" onClick={() => { setResetSent(false); }}>
                      다시 보내기
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-primary-foreground">비밀번호 재설정</h2>
                      <p className="text-sm text-primary-foreground/70">가입한 이메일을 입력하시면 비밀번호 재설정 링크를 보내드립니다.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-primary-foreground">이메일</Label>
                      <Input id="reset-email" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50" />
                    </div>
                    <Button type="submit" className="w-full h-12 bg-white text-primary hover:bg-white/90" disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "재설정 링크 보내기"}
                    </Button>
                  </form>
                )}
              </div>
            ) : <div className="space-y-4">
              <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => setIsEmailMode(false)}>
                <ArrowLeft className="h-4 w-4" />
                뒤로
              </Button>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-primary-foreground">
                    이메일
                  </Label>
                  <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-primary-foreground">
                    비밀번호
                  </Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="bg-white/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50" />
                </div>
                <Button type="submit" className="w-full h-12 bg-white text-primary hover:bg-white/90" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "로그인"}
                </Button>
              </form>

              <div className="text-center">
                <Button variant="link" className="text-sm text-primary-foreground/70 p-0 h-auto hover:text-primary-foreground" onClick={() => setIsForgotMode(true)}>
                  비밀번호를 잊으셨나요?
                </Button>
              </div>
            </div>}

          {/* 하단 링크들 - 이메일 모드일 때만 표시 */}
          {isEmailMode && (
            <div className="text-center text-sm pt-4">
              <span className="text-primary-foreground/70">
                계정이 없으신가요?{" "}
              </span>
              <Button variant="link" className="p-0 h-auto font-semibold text-primary-foreground hover:text-primary-foreground/80" onClick={() => navigate("/signup")}>
                회원가입
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 풋터 */}
      <footer className="py-6 text-center space-y-2">
        <div className="text-primary-foreground/40 text-[10px] leading-relaxed space-y-0.5">
          <p><span className="font-medium text-primary-foreground/50">상호: 주식회사 더김비서</span> | 개인정보책임자: 송하진</p>
          <p>소재지: 서울특별시 서초구 강남대로 311, 702호 (서초동, 한화생명보험빌딩)</p>
          <p>사업자등록번호: 166-88-03509</p>
          <p>고객센터: cs@tkbs.io</p>
        </div>
        <div className="flex justify-center gap-4">
          <a href="https://mrkim.today/terms" className="text-primary-foreground/50 text-xs hover:text-primary-foreground/70 transition-colors">이용약관</a>
          <a href="https://mrkim.today/privacy" className="text-primary-foreground/50 text-xs hover:text-primary-foreground/70 transition-colors">개인정보처리방침</a>
        </div>
        <p className="text-primary-foreground/50 text-xs">
          © 2026 Mr.Kim. All rights reserved.
        </p>
      </footer>

      {/* 서비스 안내 챗봇 */}
      <ServiceVoiceOverlay />
      <ServiceChatPanel />
    </div>;
}
export default function Login() {
  return <ServiceChatProvider>
      <LoginContent />
    </ServiceChatProvider>;
}