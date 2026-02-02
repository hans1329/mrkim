import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useProfile } from "@/hooks/useProfile";
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
  LogOut,
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { profile, loading, updating, updateProfile, updateSecretaryPhone } = useProfile();
  
  // 개인 정보 폼 상태
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  
  // 김비서 연락용 번호 상태
  const [secretaryPhone, setSecretaryPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // 프로필 데이터 로드 시 폼 초기화
  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setNickname(profile.nickname || "");
      setSecretaryPhone(profile.secretary_phone || "");
    }
  }, [profile]);

  // 개인 정보 저장
  const handleSavePersonalInfo = async () => {
    await updateProfile({ name, nickname });
  };

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
    await updateSecretaryPhone(secretaryPhone, true);
    setIsVerifying(false);
    setIsCodeSent(false);
    setVerificationCode("");
  };

  // 번호 변경 시작
  const handleChangeNumber = () => {
    updateSecretaryPhone("", false);
    setSecretaryPhone("");
    setVerificationCode("");
  };

  const getInitials = () => {
    if (profile?.name) return profile.name.charAt(0);
    if (profile?.nickname) return profile.nickname.charAt(0);
    return "?";
  };

  if (loading) {
    return (
      <MainLayout title="내 프로필" subtitle="프로필 정보를 관리하세요" showBackButton>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                <Skeleton className="h-24 w-24 rounded-full" />
                <Skeleton className="mt-4 h-6 w-24" />
                <Skeleton className="mt-2 h-4 w-32" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout title="내 프로필" subtitle="프로필 정보를 관리하세요" showBackButton>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">로그인이 필요합니다</p>
            <Button className="mt-4" onClick={() => navigate("/login")}>
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="내 프로필" subtitle="프로필 정보를 관리하세요" showBackButton>
      <div className="space-y-4">
        {/* 프로필 사진 & 기본 정보 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url || undefined} alt="프로필" />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials()}
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
              <h2 className="mt-4 text-xl font-bold">{profile.name || profile.nickname || "이름 없음"}</h2>
              <p className="text-sm text-muted-foreground">
                {profile.business_name || "사업장 미등록"}
              </p>
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
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">닉네임</Label>
              <Input 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)}
                placeholder="앱에서 표시될 이름" 
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleSavePersonalInfo}
              disabled={updating}
            >
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              저장
            </Button>
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
              {profile.secretary_phone_verified && (
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
            {!profile.secretary_phone_verified ? (
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
                    {profile.secretary_phone?.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")}
                  </p>
                  <p className="text-xs text-muted-foreground">김비서 브리핑/알림 수신 번호</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleChangeNumber}
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
                <p className="text-sm font-medium">
                  {profile.phone?.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3") || "미등록"}
                </p>
                <p className="text-xs text-muted-foreground">휴대폰</p>
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
                <p className="text-sm font-medium">{profile.business_name || "사업장 미등록"}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.business_registration_number || "사업자등록번호 미등록"}
                </p>
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
                <p className="text-sm font-medium">
                  {new Date(profile.created_at).toLocaleDateString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
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

        {/* 로그아웃 */}
        <Button 
          variant="ghost" 
          className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </MainLayout>
  );
}
