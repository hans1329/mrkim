import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  HelpCircle
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

const genderOptions = [
  { id: "female", label: "여성", icon: "👩" },
  { id: "male", label: "남성", icon: "👨" },
];

const speakingStyles = [
  { id: "formal", label: "격식체", example: "오늘 매출은 234만원입니다." },
  { id: "friendly", label: "친근체", example: "오늘 매출 234만원이에요!" },
  { id: "cute", label: "귀여운체", example: "오늘 매출 234만원이에용~ 🎉" },
];

const briefingTimes = [
  { id: "morning", label: "아침 9시", icon: "🌅" },
  { id: "lunch", label: "점심 12시", icon: "☀️" },
  { id: "evening", label: "저녁 6시", icon: "🌆" },
  { id: "night", label: "밤 10시", icon: "🌙" },
];

const interestMetrics = [
  { id: "revenue", label: "매출/수익", icon: TrendingUp },
  { id: "expense", label: "지출/비용", icon: Receipt },
  { id: "employees", label: "직원 현황", icon: Users },
  { id: "funds", label: "자금 현황", icon: Wallet },
  { id: "tax", label: "세금/부가세", icon: BarChart3 },
];

export default function SecretarySettings() {
  const { toast } = useToast();
  const [speakingStyle, setSpeakingStyle] = useState("friendly");
  const [briefingEnabled, setBriefingEnabled] = useState(true);
  const [briefingTime, setBriefingTime] = useState("morning");
  const [briefingFrequency, setBriefingFrequency] = useState([1]); // 1 = 매일
  const [selectedMetrics, setSelectedMetrics] = useState(["revenue", "expense", "tax"]);
  const [secretaryName, setSecretaryName] = useState("김비서");
  const [secretaryGender, setSecretaryGender] = useState("female");

  const toggleMetric = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  const handleSave = () => {
    toast({
      title: "설정이 저장되었습니다",
      description: "김비서가 새로운 설정으로 응답합니다.",
    });
  };

  const getFrequencyLabel = (value: number) => {
    if (value === 1) return "매일";
    if (value === 2) return "이틀에 한번";
    if (value === 3) return "3일에 한번";
    if (value === 7) return "일주일에 한번";
    return `${value}일에 한번`;
  };

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
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-2xl">
                    <Bot className="h-10 w-10" />
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
          <CardContent className="space-y-6">
            {/* 브리핑 활성화 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>정기 브리핑</Label>
                <p className="text-sm text-muted-foreground">
                  설정된 시간에 경영 현황을 알려드려요
                </p>
              </div>
              <Switch checked={briefingEnabled} onCheckedChange={setBriefingEnabled} />
            </div>

            {briefingEnabled && (
              <>
                {/* 브리핑 시간 */}
                <div className="space-y-3">
                  <Label>브리핑 시간</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {briefingTimes.map((time) => (
                      <Button
                        key={time.id}
                        variant={briefingTime === time.id ? "default" : "outline"}
                        className="justify-start gap-2"
                        onClick={() => setBriefingTime(time.id)}
                      >
                        <span>{time.icon}</span>
                        {time.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* 브리핑 빈도 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>브리핑 빈도</Label>
                    <span className="text-sm font-medium text-primary">
                      {getFrequencyLabel(briefingFrequency[0])}
                    </span>
                  </div>
                  <Slider
                    value={briefingFrequency}
                    onValueChange={setBriefingFrequency}
                    min={1}
                    max={7}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>매일</span>
                    <span>일주일</span>
                  </div>
                </div>
              </>
            )}
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
        <Button onClick={handleSave} className="w-full gap-2" size="lg">
          <Save className="h-5 w-5" />
          설정 저장하기
        </Button>
      </div>
    </MainLayout>
  );
}
