import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Camera,
  Building2,
  Home,
  Bot,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  
  // 김비서 연락용 번호 상태
  const [secretaryPhone, setSecretaryPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // 인증번호 발송 (UI만 - 실제 연동은 Edge Function)
  const handleSendCode = async () => {
    if (!secretaryPhone || secretaryPhone.length < 10) {
      toast.error("올바른 전화번호를 입력해주세요");
      return;
    }
    
    setIsSending(true);
    // TODO: Twilio Verify API 연동
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSending(false);
    setIsCodeSent(true);
    toast.success("인증번호가 발송되었습니다");
  };

  // 인증번호 확인 (UI만)
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error("6자리 인증번호를 입력해주세요");
      return;
    }
    
    setIsVerifying(true);
    // TODO: Twilio Verify API 확인 연동
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsVerifying(false);
    setIsVerified(true);
    setIsCodeSent(false);
    toast.success("전화번호가 인증되었습니다");
  };

  return (
    <MainLayout title="내 프로필" subtitle="프로필 정보를 관리하세요" showBackButton>
      <div className="space-y-4">
        {/* 프로필 사진 & 기본 정보 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src="/placeholder.svg" alt="프로필" />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    사장
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="mt-4 text-xl font-bold">김사장</h2>
              <p className="text-sm text-muted-foreground">맛있는 식당 대표</p>
            </div>
          </CardContent>
        </Card>

        {/* 개인 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">개인 정보</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">이름</Label>
              <Input defaultValue="김사장" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">닉네임</Label>
              <Input defaultValue="맛집사장님" placeholder="앱에서 표시될 이름" />
            </div>
            <Button className="w-full">저장</Button>
          </CardContent>
        </Card>

        {/* 김비서 연락용 번호 */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">김비서가 연락 할 번호</CardTitle>
              </div>
              {isVerified && (
                <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700">
                  <ShieldCheck className="h-3 w-3" />
                  인증됨
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              김비서가 브리핑, 긴급 알림 등을 전화로 알려드릴 번호입니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isVerified ? (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">전화번호</Label>
                  <div className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder="01012345678"
                      value={secretaryPhone}
                      onChange={(e) => setSecretaryPhone(e.target.value.replace(/\D/g, ""))}
                      disabled={isCodeSent}
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      onClick={handleSendCode}
                      disabled={isSending || isCodeSent}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isCodeSent ? (
                        "발송됨"
                      ) : (
                        "인증요청"
                      )}
                    </Button>
                  </div>
                </div>
                
                {isCodeSent && (
                  <div className="space-y-2">
                    <Label className="text-xs">인증번호 (6자리)</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 tracking-widest text-center font-mono"
                      />
                      <Button onClick={handleVerifyCode} disabled={isVerifying}>
                        {isVerifying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "확인"
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      인증번호가 오지 않나요?{" "}
                      <button 
                        className="text-primary underline"
                        onClick={() => {
                          setIsCodeSent(false);
                          setVerificationCode("");
                        }}
                      >
                        다시 보내기
                      </button>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <Phone className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {secretaryPhone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")}
                  </p>
                  <p className="text-xs text-muted-foreground">김비서 브리핑/알림 수신 번호</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setIsVerified(false);
                    setSecretaryPhone("");
                    setVerificationCode("");
                  }}
                >
                  변경
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 연락처 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">연락처</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">010-1234-5678</p>
                <p className="text-xs text-muted-foreground">휴대폰</p>
              </div>
              <Button variant="outline" size="sm">수정</Button>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">owner@restaurant.com</p>
                <p className="text-xs text-muted-foreground">이메일</p>
              </div>
              <Button variant="outline" size="sm">수정</Button>
            </div>
          </CardContent>
        </Card>

        {/* 사업장 연결 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">연결된 사업장</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">맛있는 식당</p>
                <p className="text-xs text-muted-foreground">123-45-67890</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/settings")}>
                설정
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 가입 정보 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">가입일</p>
                <p className="text-sm font-medium">2024년 1월 15일</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 홈으로 가기 */}
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => {
            window.scrollTo(0, 0);
            navigate("/");
          }}
        >
          <Home className="h-4 w-4" />
          홈으로 가기
        </Button>
      </div>
    </MainLayout>
  );
}
