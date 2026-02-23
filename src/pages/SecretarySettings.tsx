import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Bot, 
  Camera, 
  MessageSquare, 
  Clock, 
  BarChart3, 
  TrendingUp, 
  Users, 
  Wallet,
  Receipt,
  Save,
  HelpCircle,
  Loader2,
  Volume2,
  Phone,
  AlertTriangle,
  DollarSign,
  CalendarClock,
  Megaphone,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProfile } from "@/hooks/useProfile";
import { useProfileQuery } from "@/hooks/useProfileQuery";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resizeAndCompressImage } from "@/lib/imageUtils";

const genderOptions = [
  { id: "female", label: "여성", icon: "👩" },
  { id: "male", label: "남성", icon: "👨" },
];

const maleVoiceOptions = [
  { id: "PDoCXqBQFGsvfO0hNkEs", label: "차분한 남성" },
  { id: "YBRudLRm83BV5Mazcr42", label: "밝은 남성" },
  { id: "nbrxrAz3eYm9NgojrmFK", label: "중후한 남성" },
  { id: "OEaq3WGNtNvFJ5co9mJE", label: "부드러운 남성" },
];

const femaleVoiceOptions = [
  { id: "uyVNoMrnUku1dZyVEXwD", label: "차분한 여성" },
  { id: "zgDzx5jLLCqEp6Fl7Kl7", label: "밝은 여성" },
  { id: "Lb7qkOn5hF8p7qfCDH8q", label: "중후한 여성" },
  { id: "xi3rF0t7dg7uN2M0WUhr", label: "부드러운 여성" },
];

const speakingStyles = [
  { id: "polite", label: "격식체", example: "오늘 매출은 234만원입니다." },
  { id: "friendly", label: "친근체", example: "오늘 매출 234만원이에요!" },
  { id: "cute", label: "귀여운체", example: "오늘 매출 234만원이에용~ 🎉" },
];

// 브리핑 시간대 옵션 (하루 중 원하는 시간대 복수 선택)
const briefingTimeOptions = [
  { id: "9", label: "오전 9시", description: "오전 업무 시작 전 브리핑" },
  { id: "12", label: "점심 12시", description: "점심시간 경영 현황 체크" },
  { id: "18", label: "저녁 6시", description: "하루 마감 전 매출 확인" },
  { id: "22", label: "밤 10시", description: "하루 최종 결산 브리핑" },
];

const interestMetrics = [
  { id: "sales", label: "매출/수익", icon: TrendingUp },
  { id: "expenses", label: "지출/비용", icon: Receipt },
  { id: "employees", label: "직원 현황", icon: Users },
  { id: "funds", label: "자금 현황", icon: Wallet },
  { id: "alerts", label: "긴급 알림", icon: BarChart3 },
];

// 전화 긴급 알림 항목
const phoneAlertItems = [
  { id: "large_transaction", label: "대규모 입출금 감지", icon: DollarSign, description: "설정 금액 이상의 입금/출금 발생 시" },
  { id: "tax_deadline", label: "세금 납부 기한 임박", icon: CalendarClock, description: "부가세, 종소세 마감 3일/1일 전 리마인드" },
  { id: "salary_reminder", label: "급여 지급일 리마인드", icon: Users, description: "급여일 전날 미지급 건 알림" },
  { id: "sales_spike", label: "매출 급변동 감지", icon: AlertTriangle, description: "전일 대비 30% 이상 증감 시" },
];

// 전화 알림 시간대 옵션
const phoneAlertTimeOptions = [
  { id: "9", label: "오전 9시" },
  { id: "10", label: "오전 10시" },
  { id: "12", label: "점심 12시" },
  { id: "14", label: "오후 2시" },
  { id: "17", label: "오후 5시" },
  { id: "19", label: "저녁 7시" },
];

export default function SecretarySettings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromChat = searchParams.get("from") === "chat";
  const { updating, updateProfile } = useProfile();
  const { profile, loading, updateProfileCache } = useProfileQuery();
  
  const [speakingStyle, setSpeakingStyle] = useState("friendly");
  const [briefingTimes, setBriefingTimes] = useState<string[]>(["9"]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["sales", "expenses", "alerts"]);
  const [secretaryName, setSecretaryName] = useState("김비서");
  const [secretaryGender, setSecretaryGender] = useState("female");
  const [secretaryAvatarUrl, setSecretaryAvatarUrl] = useState<string | null>(null);
  const [secretaryVoiceId, setSecretaryVoiceId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  
  // 전화 긴급 알림 상태
  const [phoneAlertEnabled, setPhoneAlertEnabled] = useState(false);
  const [selectedPhoneAlertItems, setSelectedPhoneAlertItems] = useState<string[]>(["tax_deadline", "large_transaction", "salary_reminder", "sales_spike"]);
  const [phoneAlertTimes, setPhoneAlertTimes] = useState<string[]>(["10"]);
  const [phoneAlertCustomMessage, setPhoneAlertCustomMessage] = useState("");
  const [largeTransactionThreshold, setLargeTransactionThreshold] = useState<number>(1000000);
  const [phoneAlertCustomTime, setPhoneAlertCustomTime] = useState("");
  const [phoneAlertCustomDays, setPhoneAlertCustomDays] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DB 데이터로 초기화
  useEffect(() => {
    if (profile) {
      setSecretaryName(profile.secretary_name || "김비서");
      setSecretaryGender(profile.secretary_gender || "female");
      setSpeakingStyle(profile.secretary_tone || "friendly");
      const rawTimes = profile.briefing_times;
      if (Array.isArray(rawTimes) && rawTimes.length > 0) {
        setBriefingTimes(rawTimes.map(String));
      } else {
        const freq = profile.briefing_frequency || "daily";
        setBriefingTimes(freq === "realtime" ? ["9","12","18","22"] : ["9"]);
      }
      setSecretaryAvatarUrl(profile.secretary_avatar_url || null);
      setSecretaryVoiceId(profile.secretary_voice_id || null);
      if (profile.priority_metrics && Array.isArray(profile.priority_metrics)) {
        setSelectedMetrics(profile.priority_metrics);
      }
      // 전화 알림 설정 초기화
      const p = profile as any;
      setPhoneAlertEnabled(p.phone_alert_enabled ?? false);
      if (Array.isArray(p.phone_alert_items)) setSelectedPhoneAlertItems(p.phone_alert_items);
      if (Array.isArray(p.phone_alert_times)) setPhoneAlertTimes(p.phone_alert_times.map(String));
      setPhoneAlertCustomMessage(p.phone_alert_custom_message || "");
      setPhoneAlertCustomTime(p.phone_alert_custom_time || "");
      if (Array.isArray(p.phone_alert_custom_days)) setPhoneAlertCustomDays(p.phone_alert_custom_days);
      setLargeTransactionThreshold(p.large_transaction_threshold ?? 1000000);
    }
  }, [profile]);

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  // Storage에 사전 생성된 음성 미리듣기 URL 헬퍼
  const getVoicePreviewUrl = (voiceId: string) =>
    `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/voice-previews/${voiceId}.mp3?v=2`;

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (10MB - 압축 전 허용)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("파일 크기는 10MB 이하여야 합니다");
      return;
    }

    // 이미지 파일 체크
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    setUploadingAvatar(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다");
        return;
      }

      // 이미지 리사이즈 및 압축 (긴 변 최대 400px, WebP, 80% 품질)
      const compressedFile = await resizeAndCompressImage(file, {
        maxSize: 400,
        quality: 0.8,
        format: "image/webp",
      });

      const fileName = `${user.id}/secretary-avatar.webp`;

      // 기존 파일 삭제 시도 (에러 무시)
      await supabase.storage.from("secretary-avatars").remove([fileName]);

      // 압축된 파일 업로드
      const { error: uploadError } = await supabase.storage
        .from("secretary-avatars")
        .upload(fileName, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from("secretary-avatars")
        .getPublicUrl(fileName);

      // 캐시 방지를 위해 타임스탬프 추가
      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      setSecretaryAvatarUrl(urlWithTimestamp);
      toast.success("프로필 이미지가 업로드되었습니다");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("이미지 업로드에 실패했습니다");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    const voiceId = secretaryGender === "male"
      ? (secretaryVoiceId || maleVoiceOptions[0].id)
      : (secretaryVoiceId || femaleVoiceOptions[0].id);

    const updates = {
      secretary_name: secretaryName,
      secretary_gender: secretaryGender,
      secretary_tone: speakingStyle,
      priority_metrics: selectedMetrics,
      secretary_avatar_url: secretaryAvatarUrl,
      secretary_voice_id: voiceId,
    };
    
    const success = await updateProfile(updates, false);
    
    // briefing_times + phone_alert 설정은 직접 supabase 업데이트
    if (success) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          briefing_times: briefingTimes,
          phone_alert_enabled: phoneAlertEnabled,
          phone_alert_items: selectedPhoneAlertItems,
          phone_alert_times: phoneAlertTimes,
          phone_alert_custom_message: phoneAlertCustomMessage || null,
          phone_alert_custom_time: phoneAlertCustomTime || null,
          phone_alert_custom_days: phoneAlertCustomDays.length > 0 ? phoneAlertCustomDays : null,
          large_transaction_threshold: largeTransactionThreshold,
        } as any).eq("user_id", user.id);
      }
      updateProfileCache({
        ...updates,
        briefing_times: briefingTimes,
        phone_alert_enabled: phoneAlertEnabled,
        phone_alert_items: selectedPhoneAlertItems,
        phone_alert_times: phoneAlertTimes,
        phone_alert_custom_message: phoneAlertCustomMessage || null,
        phone_alert_custom_time: phoneAlertCustomTime || null,
        phone_alert_custom_days: phoneAlertCustomDays.length > 0 ? phoneAlertCustomDays : null,
        large_transaction_threshold: largeTransactionThreshold,
      } as any);
      toast.success(`${secretaryName} 설정이 저장되었습니다`);
      if (fromChat) {
        navigate("/?openChat=true");
      } else {
        navigate("/");
      }
    } else {
      toast.error("설정 저장에 실패했습니다");
    }
  };

  const handleBack = () => {
    if (fromChat) {
      navigate("/?openChat=true");
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  if (loading) {
    return (
      <MainLayout title="김비서 설정" subtitle="나만의 AI 비서를 커스터마이징하세요" showBackButton onBack={handleBack}>
        <div className="space-y-6 pb-8">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout title="김비서 설정" subtitle="나만의 AI 비서를 커스터마이징하세요" showBackButton onBack={handleBack}>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">로그인이 필요합니다</p>
            <Button className="mt-4" onClick={() => window.location.href = "/login"}>
              로그인하기
            </Button>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="김비서 설정" subtitle="나만의 AI 비서를 커스터마이징하세요" showBackButton onBack={handleBack}>
      <div className="space-y-6 pb-8">
        {/* 프로필 섹션 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              비서 프로필
            </CardTitle>
            <CardDescription>비서의 이름과 프로필 이미지를 설정하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={secretaryAvatarUrl || ""} className="object-contain" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-2xl">
                    <Bot className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="secretary-name">비서 이름</Label>
                <Input 
                  id="secretary-name"
                  value={secretaryName}
                  onChange={(e) => setSecretaryName(e.target.value)}
                  placeholder="비서 이름을 입력하세요"
                />
              </div>
            </div>
            
            {/* 성별 선택 */}
            <div className="space-y-2">
              <Label>비서 성별</Label>
              <div className="grid grid-cols-2 gap-2">
                {genderOptions.map((option) => (
                  <Button
                    key={option.id}
                    variant={secretaryGender === option.id ? "default" : "outline"}
                    className="justify-center gap-2 rounded-full"
                    onClick={() => setSecretaryGender(option.id)}
                  >
                    <span>{option.icon}</span>
                    {option.label}
                  </Button>
                ))}
              </div>
               <p className="text-xs text-muted-foreground">
                💡 음성 브리핑과 전화 알림 시 해당 성별의 목소리가 사용됩니다
              </p>

              {/* 남성 음성 선택 */}
              {secretaryGender === "male" && (
                <div className="space-y-2 mt-3">
                  <Label>남성 음성 선택</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {maleVoiceOptions.map((voice) => {
                      const isSelected = (secretaryVoiceId || maleVoiceOptions[0].id) === voice.id;
                      const isPreviewing = previewingVoiceId === voice.id;
                      return (
                        <Button
                          key={voice.id}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="justify-center gap-1.5"
                          disabled={isPreviewing}
                          onClick={async () => {
                            setSecretaryVoiceId(voice.id);
                            try {
                              if (previewAudioRef.current) {
                                previewAudioRef.current.pause();
                                previewAudioRef.current = null;
                              }
                              setPreviewingVoiceId(voice.id);
                              const audio = new Audio(getVoicePreviewUrl(voice.id));
                              previewAudioRef.current = audio;
                              audio.onended = () => setPreviewingVoiceId(null);
                              await audio.play();
                            } catch (e) {
                              console.error("Voice preview error:", e);
                              setPreviewingVoiceId(null);
                            }
                          }}
                        >
                          {isPreviewing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                          {voice.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 여성 음성 선택 */}
              {secretaryGender === "female" && (
                <div className="space-y-2 mt-3">
                  <Label>여성 음성 선택</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {femaleVoiceOptions.map((voice) => {
                      const isSelected = (secretaryVoiceId || femaleVoiceOptions[0].id) === voice.id;
                      const isPreviewing = previewingVoiceId === voice.id;
                      return (
                        <Button
                          key={voice.id}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          className="justify-center gap-1.5"
                          disabled={isPreviewing}
                          onClick={async () => {
                            setSecretaryVoiceId(voice.id);
                            try {
                              if (previewAudioRef.current) {
                                previewAudioRef.current.pause();
                                previewAudioRef.current = null;
                              }
                              setPreviewingVoiceId(voice.id);
                              const audio = new Audio(getVoicePreviewUrl(voice.id));
                              previewAudioRef.current = audio;
                              audio.onended = () => setPreviewingVoiceId(null);
                              await audio.play();
                            } catch (e) {
                              console.error("Voice preview error:", e);
                              setPreviewingVoiceId(null);
                            }
                          }}
                        >
                          {isPreviewing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                          {voice.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* 레벨 표시 */}
            <div className="relative p-3 rounded-lg bg-muted/50 space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors">
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="left" align="start" className="w-[220px] p-3">
                  <p className="text-xs font-medium mb-2">경험치 획득 방법</p>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• 매일 브리핑 확인 +10 XP</li>
                    <li>• 비서와 대화 +5 XP</li>
                    <li>• 제안 승인 +50 XP</li>
                    <li>• 계좌/카드 연동 +100 XP</li>
                    <li>• 정확도 피드백 +30 XP</li>
                  </ul>
                </PopoverContent>
              </Popover>
              <span className="text-sm font-medium">Level</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lv. 3 경영 분석가</span>
                <span className="text-xs text-muted-foreground">1,240 / 2,000 XP</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[62%] bg-gradient-to-r from-amber-400 to-amber-500 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 말투 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              말투 설정
            </CardTitle>
            <CardDescription>비서의 대화 스타일을 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={speakingStyle} onValueChange={setSpeakingStyle} className="space-y-3">
              {speakingStyles.map((style) => (
                <div 
                  key={style.id}
                  className={`flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-all ${
                    speakingStyle === style.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSpeakingStyle(style.id)}
                >
                  <RadioGroupItem value={style.id} id={style.id} />
                  <div className="flex-1">
                    <Label htmlFor={style.id} className="font-medium cursor-pointer">
                      {style.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      예: "{style.example}"
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 매일 브리핑 시간 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              매일 브리핑 시간 설정
            </CardTitle>
            <CardDescription>하루 중 채팅 브리핑을 받을 시간대를 선택하세요 (복수 선택 가능)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {briefingTimeOptions.map((option) => {
              const isSelected = briefingTimes.includes(option.id);
              return (
                <div
                  key={option.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => {
                    setBriefingTimes(prev =>
                      prev.includes(option.id)
                        ? prev.filter(t => t !== option.id)
                        : [...prev, option.id]
                    );
                  }}
                >
                  <div>
                    <span className={isSelected ? "font-medium" : "text-muted-foreground"}>
                      {option.label}
                    </span>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {isSelected && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      선택됨
                    </Badge>
                  )}
                </div>
              );
            })}
            {briefingTimes.length === 0 && (
              <p className="text-xs text-destructive mt-1">최소 하나의 시간대를 선택해주세요</p>
            )}
          </CardContent>
        </Card>

        {/* 전화로 긴급 알림 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                전화로 긴급 알림
              </CardTitle>
              <Switch
                checked={phoneAlertEnabled}
                onCheckedChange={setPhoneAlertEnabled}
              />
            </div>
            <CardDescription>
              중요한 경영 이벤트 발생 시 {secretaryName}{secretaryName.endsWith('서') ? '가' : '이'} 직접 전화로 알려드립니다
            </CardDescription>
          </CardHeader>
          {phoneAlertEnabled && (
            <CardContent className="space-y-5">
              {/* 알림 항목 선택 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">알림 받을 항목</Label>
                {phoneAlertItems.map((item) => {
                  const isSelected = selectedPhoneAlertItems.includes(item.id);
                  return (
                    <div key={item.id} className="space-y-0">
                      <div
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => {
                          setSelectedPhoneAlertItems(prev =>
                            prev.includes(item.id)
                              ? prev.filter(i => i !== item.id)
                              : [...prev, item.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <div>
                            <span className={`text-sm ${isSelected ? "font-medium" : "text-muted-foreground"}`}>
                              {item.label}
                            </span>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                            ON
                          </Badge>
                        )}
                      </div>
                      {/* 대규모 입출금 기준 금액 설정 */}
                      {item.id === "large_transaction" && isSelected && (
                        <div className="mt-1 ml-7 flex items-center gap-2 pb-1">
                          <Input
                            type="text"
                            inputMode="numeric"
                            className="w-32 h-8 text-sm"
                            placeholder="1,000,000"
                            value={largeTransactionThreshold ? largeTransactionThreshold.toLocaleString() : ""}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^\d]/g, "");
                              setLargeTransactionThreshold(value ? parseInt(value) : 1000000);
                            }}
                          />
                          <span className="text-xs text-muted-foreground">원 이상</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 전화 시간대 선택 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">전화 받을 시간대</Label>
                <p className="text-xs text-muted-foreground">긴급 알림 전화를 받을 수 있는 시간대를 선택하세요</p>
                <div className="grid grid-cols-3 gap-2">
                  {phoneAlertTimeOptions.map((option) => {
                    const isSelected = phoneAlertTimes.includes(option.id);
                    return (
                      <Button
                        key={option.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setPhoneAlertTimes(prev =>
                            prev.includes(option.id)
                              ? prev.filter(t => t !== option.id)
                              : [...prev, option.id]
                          );
                        }}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
                {phoneAlertTimes.length === 0 && (
                  <p className="text-xs text-destructive">최소 하나의 시간대를 선택해주세요</p>
                )}
              </div>

              {/* 자유 메시지 전화 알림 */}
              <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-dashed border-border">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-medium">자유 메시지 전화 알림</Label>
                  <Badge variant="outline" className="text-[10px]">선택</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  특정 요일과 시간에 원하는 메시지를 전화로 안내받을 수 있습니다
                </p>
                <Textarea
                  placeholder="예: 거래처 미팅 있습니다. 자료 준비해주세요."
                  value={phoneAlertCustomMessage}
                  onChange={(e) => setPhoneAlertCustomMessage(e.target.value)}
                  className="min-h-[80px] text-sm"
                />
                {/* 요일 선택 */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">반복 요일</Label>
                  <div className="flex gap-1.5">
                    {[
                      { id: "mon", label: "월" },
                      { id: "tue", label: "화" },
                      { id: "wed", label: "수" },
                      { id: "thu", label: "목" },
                      { id: "fri", label: "금" },
                      { id: "sat", label: "토" },
                      { id: "sun", label: "일" },
                    ].map((day) => {
                      const isSelected = phoneAlertCustomDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          className={`h-9 w-9 rounded-full text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          }`}
                          onClick={() => {
                            setPhoneAlertCustomDays(prev =>
                              prev.includes(day.id)
                                ? prev.filter(d => d !== day.id)
                                : [...prev, day.id]
                            );
                          }}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* 시간 선택 */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">전화 시각</Label>
                  <select
                    value={phoneAlertCustomTime}
                    onChange={(e) => setPhoneAlertCustomTime(e.target.value)}
                    className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">시간 선택</option>
                    {Array.from({ length: 14 }, (_, i) => i + 8).map((h) => (
                      <option key={h} value={String(h)}>
                        {h < 12 ? `오전 ${h}시` : h === 12 ? "낮 12시" : `오후 ${h - 12}시`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 관심 지표 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              관심 지표 우선순위
            </CardTitle>
            <CardDescription>브리핑에서 우선적으로 보고받을 지표를 선택하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {interestMetrics.map((metric) => {
                const isSelected = selectedMetrics.includes(metric.id);
                const priority = selectedMetrics.indexOf(metric.id) + 1;
                
                return (
                  <div
                    key={metric.id}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleMetric(metric.id)}
                  >
                    <div className="flex items-center gap-3">
                      <metric.icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={isSelected ? "font-medium" : "text-muted-foreground"}>
                        {metric.label}
                      </span>
                    </div>
                    {isSelected && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                        {priority}순위
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              💡 선택한 순서대로 우선순위가 적용됩니다
            </p>
          </CardContent>
        </Card>

        {/* 저장 버튼 */}
        <Button onClick={handleSave} className="w-full gap-2" size="lg" disabled={updating}>
          {updating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {updating ? "저장 중..." : "설정 저장하기"}
        </Button>
      </div>
    </MainLayout>
  );
}
