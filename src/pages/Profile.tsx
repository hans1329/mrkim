import { useState, useEffect, useRef } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { resizeAndCompressImage } from "@/lib/imageUtils";
import { getRandomAvatarUrl } from "@/lib/utils";
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
  ChevronRight,
  Pencil,
  X,
} from "lucide-react";
import { ConnectedAccountsCard } from "@/components/profile/ConnectedAccountsCard";
import { ConnectorStatusCard } from "@/components/profile/ConnectorStatusCard";

export default function Profile() {
  const navigate = useNavigate();
  const { profile, loading, updating, updateProfile, updateSecretaryPhone } = useProfile();
  const queryClient = useQueryClient();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 개인 정보 폼 상태
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  
  // 김비서 연락용 번호 상태
  const [secretaryPhone, setSecretaryPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isChangingNumber, setIsChangingNumber] = useState(false);
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
    setIsEditingPersonal(false);
  };

  // 프로필 이미지 업로드
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다");

      const compressedFile = await resizeAndCompressImage(file, {
        maxSize: 400,
        quality: 0.85,
        format: "image/webp",
      });

      if (profile?.avatar_url) {
        const oldPath = profile.avatar_url.split("/").slice(-2).join("/");
        await supabase.storage.from("user-avatars").remove([oldPath]);
      }

      const fileName = `${user.id}/avatar-${Date.now()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(fileName, compressedFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("user-avatars")
        .getPublicUrl(fileName);

      await updateProfile({ avatar_url: publicUrl });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("프로필 사진이 변경되었습니다");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("프로필 사진 업로드에 실패했습니다");
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 프로필 이미지 삭제
  const handleAvatarRemove = async () => {
    if (!profile?.avatar_url) return;
    setIsUploadingAvatar(true);
    try {
      const oldPath = profile.avatar_url.split("/").slice(-2).join("/");
      await supabase.storage.from("user-avatars").remove([oldPath]);
      await updateProfile({ avatar_url: null });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("프로필 사진이 삭제되었습니다");
    } catch (error) {
      console.error("Avatar remove error:", error);
      toast.error("프로필 사진 삭제에 실패했습니다");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 환영 전화 발신 (인증 완료 직후)
  const triggerWelcomeCall = async (phone: string) => {
    try {
      const secretaryName = profile?.secretary_name || "김비서";
      const ownerName = profile?.name || "사장";
      const script = `안녕하세요, ${ownerName}님. 저는 ${ownerName}님의 AI 비서 ${secretaryName}입니다. 전화번호 인증이 완료되어 인사드립니다. 앞으로 중요한 경영 알림이 있을 때 이 번호로 전화드리겠습니다. 비서 설정에서 알림 항목과 시간대를 설정해주시면 더 정확한 서비스를 받으실 수 있습니다. 감사합니다.`;
      
      await supabase.functions.invoke("twilio-outbound-call", {
        body: {
          recipient_phone: phone,
          recipient_name: ownerName,
          script,
          call_type: "welcome",
        },
      });
      const lastChar = secretaryName.charAt(secretaryName.length - 1);
      const hasBatchim = (lastChar.charCodeAt(0) - 0xAC00) % 28 !== 0;
      toast("📞 환영 전화를 발신합니다", { description: `${secretaryName}${hasBatchim ? "이" : "가"} 잠시 후 전화드립니다` });
    } catch (err) {
      console.error("환영 전화 발신 실패:", err);
      // 환영 전화 실패는 조용히 무시
    }
  };

  // 인증번호 발송 (Twilio Verify)
  const handleSendCode = async () => {
    if (!secretaryPhone || secretaryPhone.length < 10) {
      toast.error("올바른 전화번호를 입력해주세요");
      return;
    }
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("twilio-verify", {
        body: { action: "send", phone: secretaryPhone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setIsCodeSent(true);
      toast.success("인증번호가 발송되었습니다");
    } catch (error: any) {
      console.error("SMS 발송 오류:", error);
      toast.error(error?.message || "인증번호 발송에 실패했습니다");
    } finally {
      setIsSending(false);
    }
  };

  // 인증번호 확인 (Twilio Verify)
  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error("6자리 인증번호를 입력해주세요");
      return;
    }
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("twilio-verify", {
        body: { action: "verify", phone: secretaryPhone, code: verificationCode },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // 프로필 로컬 상태 갱신
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("전화번호가 인증되었습니다");
      setIsCodeSent(false);
      setIsChangingNumber(false);
      setVerificationCode("");

      // 환영 전화 발신 (비동기, 실패해도 무시)
      triggerWelcomeCall(secretaryPhone);
    } catch (error: any) {
      console.error("인증 확인 오류:", error);
      toast.error(error?.message || "인증번호 확인에 실패했습니다");
    } finally {
      setIsVerifying(false);
    }
  };

  // 번호 변경 시작 (DB 초기화 없이 UI만 전환)
  const handleChangeNumber = () => {
    setIsChangingNumber(true);
    setSecretaryPhone("");
    setVerificationCode("");
    setIsCodeSent(false);
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error("로그아웃 오류:", error);
          toast.error("로그아웃 중 오류가 발생했습니다");
          setIsLoggingOut(false);
          return;
        }
      }
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || key.includes('supabase')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      toast.success("로그아웃되었습니다");
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("로그아웃 처리 오류:", error);
      toast.error("로그아웃 중 오류가 발생했습니다");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = () => {
    if (profile?.name) return profile.name.charAt(0);
    if (profile?.nickname) return profile.nickname.charAt(0);
    return "?";
  };

  if (loading) {
    return (
      <MainLayout title="내 프로필" showBackButton>
        <div className="space-y-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout title="내 프로필" showBackButton>
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="w-full max-w-xs text-center space-y-4">
            <img 
              src="/images/icc-2.webp" 
              alt="김비서" 
              className="h-14 w-auto mx-auto opacity-90"
              style={{ filter: "drop-shadow(2px 4px 4px rgba(0, 0, 0, 0.15))" }}
            />
            <p className="text-muted-foreground text-sm">
              로그인 후 프로필을 확인할 수 있어요
            </p>
            <Button className="w-full rounded-full" onClick={() => navigate("/login")}>
              로그인하기
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="내 프로필" showBackButton>
      <div className="space-y-3">
        {/* 프로필 헤더 - 가로 배치로 컴팩트하게 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <Avatar className="h-16 w-16">
                  <AvatarImage 
                    src={profile.avatar_url || getRandomAvatarUrl(profile.user_id)} 
                    alt="프로필" 
                    className="object-cover"
                  />
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                {/* 카메라(변경) 버튼 */}
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3" />
                  )}
                </Button>
                {/* 삭제 버튼 - 실제 사진이 있을 때만 표시 */}
                {profile.avatar_url && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full shadow-md"
                    onClick={handleAvatarRemove}
                    disabled={isUploadingAvatar}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold truncate">{profile.name || profile.nickname || "이름 없음"}</h2>
                <p className="text-sm text-muted-foreground truncate">
                  {profile.business_name || "사업장 미등록"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(profile.created_at).toLocaleDateString("ko-KR")} 가입
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 개인 정보 + 연락처 통합 */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">개인 정보</CardTitle>
              </div>
              {!isEditingPersonal && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-xs gap-1"
                  onClick={() => setIsEditingPersonal(true)}
                >
                  <Pencil className="h-3 w-3" />
                  수정
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isEditingPersonal ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">이름</Label>
                  <Input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름을 입력하세요"
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">커뮤니티용 별명</Label>
                  <Input 
                    value={nickname} 
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="커뮤니티에서 사용할 별명"
                    className="h-9"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsEditingPersonal(false)}
                  >
                    취소
                  </Button>
                  <Button 
                    size="sm"
                    className="flex-1" 
                    onClick={handleSavePersonalInfo}
                    disabled={updating}
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    저장
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">이름</span>
                  <span className="text-sm">{profile.name || "미등록"}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-muted-foreground">커뮤니티용 별명</span>
                  <span className="text-sm">{profile.nickname || "미등록"}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 김비서 연락용 번호 - 더 컴팩트하게 */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">김비서 연락받을 내 번호</CardTitle>
              </div>
              {profile.secretary_phone_verified && (
                <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 text-xs">
                  <ShieldCheck className="h-3 w-3" />
                  인증됨
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              브리핑·긴급 알림을 받을 전화번호
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {!profile.secretary_phone_verified || isChangingNumber ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="01012345678"
                    value={secretaryPhone}
                    onChange={(e) => setSecretaryPhone(e.target.value.replace(/\D/g, ""))}
                    disabled={isCodeSent}
                    className="flex-1 h-9"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSendCode}
                    disabled={isSending || isCodeSent}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCodeSent ? "발송됨" : "인증요청"}
                  </Button>
                </div>
                
                {isCodeSent && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                        className="flex-1 h-9 tracking-widest text-center font-mono"
                      />
                      <Button size="sm" onClick={handleVerifyCode} disabled={isVerifying}>
                        {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "확인"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      인증번호가 오지 않나요?{" "}
                      <button 
                        className="text-primary underline"
                        onClick={() => { setIsCodeSent(false); setVerificationCode(""); }}
                      >
                        다시 보내기
                      </button>
                    </p>
                  </div>
                )}

                {isChangingNumber && !isCodeSent && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-xs text-muted-foreground"
                    onClick={() => {
                      setIsChangingNumber(false);
                      setSecretaryPhone(profile.secretary_phone || "");
                    }}
                  >
                    취소
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                  <Phone className="h-3.5 w-3.5 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {profile.secretary_phone?.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3")}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleChangeNumber}>
                  번호수정
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 사업장 연결 - 한 줄로 컴팩트하게 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{profile.business_name || "사업장 미등록"}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {profile.business_registration_number || "사업자등록번호 미등록"}
                </p>
              </div>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={() => navigate("/settings")}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 데이터 연동 현황 */}
        <ConnectorStatusCard />

        {/* 연결된 계좌 */}
        <ConnectedAccountsCard />

        {/* 하단 액션 버튼 */}
        <div className="flex gap-2 pt-1">
          <Button 
            variant="outline" 
            className="flex-1 gap-1.5 h-10"
            onClick={() => {
              window.scrollTo(0, 0);
              navigate("/");
            }}
          >
            <Home className="h-4 w-4" />
            홈으로
          </Button>
          <Button 
            variant="ghost" 
            className="flex-1 gap-1.5 h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
