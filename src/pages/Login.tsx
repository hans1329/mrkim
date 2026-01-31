import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail } from "lucide-react";
import iccLogo from "@/assets/icc-2.webp";
import { ServiceChatProvider } from "@/contexts/ServiceChatContext";
import { ServiceChatPanel } from "@/components/chat/ServiceChatPanel";
import { ServiceVoiceOverlay } from "@/components/chat/ServiceVoiceOverlay";
import { FloatingServiceChatButton } from "@/components/chat/FloatingServiceChatButton";
function LoginContent() {
  const navigate = useNavigate();
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleGoogleLogin = () => {
    // TODO: Supabase Google OAuth 연결
    console.log("Google login clicked");
    navigate("/");
  };
  const handleKakaoLogin = () => {
    // TODO: Kakao OAuth 연결
    console.log("Kakao login clicked");
    navigate("/");
  };
  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Supabase Email/Password 연결
    console.log("Email login:", email, password);
    navigate("/");
  };
  return <div className="min-h-screen bg-primary flex flex-col">
      {/* 상단 뒤로가기 버튼 */}
      <div className="p-4">
        <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10" onClick={() => navigate("/intro")}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          {/* 로고 & 타이틀 */}
          <div className="text-center space-y-4">
            <div className="flex flex-col items-center justify-center">
              <img src={iccLogo} alt="김비서" className="h-20 w-auto opacity-80" style={{
              filter: "drop-shadow(4px 8px 6px rgba(0, 0, 0, 0.3))"
            }} />
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
              <Button variant="outline" className="w-full h-12 gap-3 text-base bg-white hover:bg-white/90 text-foreground border-0" onClick={handleGoogleLogin}>
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
          }} onClick={handleKakaoLogin}>
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
            </div> : <div className="space-y-4">
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
                <Button type="submit" className="w-full h-12 bg-white text-primary hover:bg-white/90">
                  로그인
                </Button>
              </form>

              <div className="text-center">
                <Button variant="link" className="text-sm text-primary-foreground/70 p-0 h-auto hover:text-primary-foreground">
                  비밀번호를 잊으셨나요?
                </Button>
              </div>
            </div>}

          {/* 하단 링크들 */}
          <div className="text-center text-sm pt-4">
            <span className="text-primary-foreground/70">
              계정이 없으신가요?{" "}
            </span>
            <Button variant="link" className="p-0 h-auto font-semibold text-primary-foreground hover:text-primary-foreground/80" onClick={() => navigate("/signup")}>
              회원가입
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

      {/* 서비스 안내 챗봇 */}
      <FloatingServiceChatButton />
      <ServiceVoiceOverlay />
      <ServiceChatPanel />
    </div>;
}
export default function Login() {
  return <ServiceChatProvider>
      <LoginContent />
    </ServiceChatProvider>;
}