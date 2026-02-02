import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  Loader2
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resizeAndCompressImage } from "@/lib/imageUtils";

const genderOptions = [
  { id: "female", label: "여성", icon: "👩" },
  { id: "male", label: "남성", icon: "👨" },
];

const speakingStyles = [
  { id: "polite", label: "격식체", example: "오늘 매출은 234만원입니다." },
  { id: "friendly", label: "친근체", example: "오늘 매출 234만원이에요!" },
  { id: "cute", label: "귀여운체", example: "오늘 매출 234만원이에용~ 🎉" },
];

// briefing_frequency는 DB에서 'realtime', 'daily', 'weekly'만 허용
const briefingFrequencyOptions = [
  { id: "realtime", label: "실시간", description: "중요 변동 시 즉시 알림" },
  { id: "daily", label: "매일", description: "하루 한 번 정기 브리핑" },
  { id: "weekly", label: "매주", description: "일주일 한 번 요약 브리핑" },
];

const interestMetrics = [
  { id: "sales", label: "매출/수익", icon: TrendingUp },
  { id: "expenses", label: "지출/비용", icon: Receipt },
  { id: "employees", label: "직원 현황", icon: Users },
  { id: "funds", label: "자금 현황", icon: Wallet },
  { id: "alerts", label: "긴급 알림", icon: BarChart3 },
];

export default function SecretarySettings() {
  const { profile, loading, updating, updateProfile } = useProfile();
  
  const [speakingStyle, setSpeakingStyle] = useState("friendly");
  const [briefingFrequency, setBriefingFrequency] = useState("daily");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["sales", "expenses", "alerts"]);
  const [secretaryName, setSecretaryName] = useState("김비서");
  const [secretaryGender, setSecretaryGender] = useState("female");
  const [secretaryAvatarUrl, setSecretaryAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // DB 데이터로 초기화
  useEffect(() => {
    if (profile) {
      setSecretaryName(profile.secretary_name || "김비서");
      setSecretaryGender(profile.secretary_gender || "female");
      setSpeakingStyle(profile.secretary_tone || "friendly");
      setBriefingFrequency(profile.briefing_frequency || "daily");
      setSecretaryAvatarUrl((profile as any).secretary_avatar_url || null);
      
      if (profile.priority_metrics && Array.isArray(profile.priority_metrics)) {
        setSelectedMetrics(profile.priority_metrics);
      }
    }
  }, [profile]);

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const navigate = useNavigate();

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
    console.log("Saving settings:", {
      secretary_name: secretaryName,
      secretary_gender: secretaryGender,
      secretary_tone: speakingStyle,
      briefing_frequency: briefingFrequency,
      priority_metrics: selectedMetrics,
      secretary_avatar_url: secretaryAvatarUrl,
    });
    
    const success = await updateProfile({
      secretary_name: secretaryName,
      secretary_gender: secretaryGender,
      secretary_tone: speakingStyle,
      briefing_frequency: briefingFrequency,
      priority_metrics: selectedMetrics,
      secretary_avatar_url: secretaryAvatarUrl,
    } as any, false);
    
    console.log("Save result:", success);
    
    if (success) {
      toast.success(`${secretaryName} 설정이 저장되었습니다`);
      navigate("/");
    } else {
      toast.error("설정 저장에 실패했습니다");
    }
  };

  if (loading) {
    return (
      <MainLayout title="김비서 설정" subtitle="나만의 AI 비서를 커스터마이징하세요" showBackButton>
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
      <MainLayout title="김비서 설정" subtitle="나만의 AI 비서를 커스터마이징하세요" showBackButton>
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
    <MainLayout title="김비서 설정" subtitle="나만의 AI 비서를 커스터마이징하세요" showBackButton>
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
                  <AvatarImage src={secretaryAvatarUrl || ""} />
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
                    className="justify-center gap-2"
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
                    <li>• 김비서와 대화 +5 XP</li>
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

        {/* 브리핑 설정 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              브리핑 설정
            </CardTitle>
            <CardDescription>정기 브리핑 시간과 빈도를 설정하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              브리핑 빈도를 설정하세요
            </p>
            <div className="space-y-2">
              {briefingFrequencyOptions.map((option) => (
                <div
                  key={option.id}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                    briefingFrequency === option.id 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setBriefingFrequency(option.id)}
                >
                  <div>
                    <span className={briefingFrequency === option.id ? "font-medium" : "text-muted-foreground"}>
                      {option.label}
                    </span>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                  {briefingFrequency === option.id && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                      선택됨
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
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
