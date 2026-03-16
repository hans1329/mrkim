import { useNavigate } from "react-router-dom";
import { useConnectionDrawer } from "@/contexts/ConnectionDrawerContext";
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2,
  Bell,
  Shield,
  Palette,
  Globe,
  Home,
  Link,
  CreditCard,
  Landmark,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Save,
  Pencil,
  Trash2,
  Bike,
  UtensilsCrossed,
  MessageSquare,
  Send,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useProfile } from "@/hooks/useProfile";
import { useConnectorInstances } from "@/hooks/useConnectors";
import { toast } from "sonner";

export default function Settings() {
  const navigate = useNavigate();
  const { openDrawer } = useConnectionDrawer();
  const { theme, setTheme } = useTheme();
  const { resetOnboarding } = useOnboarding();
  const { profile, loading, updating, updateProfile, resetConnections } = useProfile();
  const { data: connectorInstances = [] } = useConnectorInstances();
  
  // 사업장 정보 편집 상태
  const [isEditing, setIsEditing] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessRegNumber, setBusinessRegNumber] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeletingSyncData, setIsDeletingSyncData] = useState(false);

  // 피드백/문의 상태
  const [feedbackCategory, setFeedbackCategory] = useState("general");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackDrawerOpen, setFeedbackDrawerOpen] = useState(false);

  // 프로필 로드 시 초기값 설정
  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || "");
      setBusinessRegNumber(profile.business_registration_number || "");
      setBusinessType(profile.business_type || "");
    }
  }, [profile]);

  // 업종 라벨 매핑
  const businessTypes = [
    { value: "restaurant", label: "요식업" },
    { value: "retail", label: "소매업" },
    { value: "service", label: "서비스업" },
    { value: "manufacturing", label: "제조업" },
    { value: "wholesale", label: "도매업" },
    { value: "other", label: "기타" },
  ];

  const getBusinessTypeLabel = (type: string | null) => {
    const found = businessTypes.find(t => t.value === type);
    return found ? found.label : type || "미등록";
  };

  // 사업자등록번호 포맷팅 (입력 시)
  const formatBusinessRegNumberInput = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 10);
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 5) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  };

  // 사업자등록번호 표시용 포맷팅
  const formatBusinessRegNumber = (num: string | null) => {
    if (!num) return "미등록";
    const cleaned = num.replace(/\D/g, "");
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
    }
    return num;
  };

  // 사업자등록번호 유효성 검사
  const isValidBusinessRegNumber = (num: string) => {
    const cleaned = num.replace(/\D/g, "");
    return cleaned.length === 10;
  };

  // 저장 핸들러
  const handleSave = async () => {
    // 사업자등록번호 검증
    if (businessRegNumber && !isValidBusinessRegNumber(businessRegNumber)) {
      toast.error("사업자등록번호는 10자리 숫자여야 합니다.");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile({
        business_name: businessName.trim() || null,
        business_registration_number: businessRegNumber.replace(/\D/g, "") || null,
        business_type: businessType || null,
      });
      toast.success("사업장 정보가 저장되었습니다.");
      setIsEditing(false);
    } catch (error) {
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 편집 취소
  const handleCancel = () => {
    setBusinessName(profile?.business_name || "");
    setBusinessRegNumber(profile?.business_registration_number || "");
    setBusinessType(profile?.business_type || "");
    setIsEditing(false);
  };

  // 피드백 제출
  const handleFeedbackSubmit = async () => {
    if (!feedbackSubject.trim() || !feedbackContent.trim()) {
      toast.error("제목과 내용을 모두 입력해주세요");
      return;
    }
    setFeedbackSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("로그인이 필요합니다");

      const { error } = await supabase.from("user_feedback").insert({
        user_id: userData.user.id,
        user_email: userData.user.email || null,
        category: feedbackCategory,
        subject: feedbackSubject.trim(),
        content: feedbackContent.trim(),
      });
      if (error) throw error;

      toast.success("문의가 접수되었습니다. 빠르게 확인하겠습니다!");
      setFeedbackSubject("");
      setFeedbackContent("");
      setFeedbackCategory("general");
      setFeedbackDrawerOpen(false);
      setFeedbackContent("");
      setFeedbackCategory("general");
    } catch (err: any) {
      toast.error(err.message || "문의 접수에 실패했습니다");
    } finally {
      setFeedbackSending(false);
    }
  };

  return (
    <MainLayout title="설정" subtitle="앱 설정을 관리하세요" showBackButton>
      <div className="space-y-4">
        {/* 사업장 정보 (편집 가능) */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">사업장 정보</CardTitle>
              </div>
              {!isEditing && !loading && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="gap-1 text-xs"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                  수정
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : isEditing ? (
              // 편집 모드
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-xs">사업장명</Label>
                  <Input
                    id="businessName"
                    placeholder="예: 김비서 카페"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    maxLength={50}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessRegNumber" className="text-xs">사업자등록번호</Label>
                  <Input
                    id="businessRegNumber"
                    placeholder="000-00-00000"
                    value={formatBusinessRegNumberInput(businessRegNumber)}
                    onChange={(e) => setBusinessRegNumber(e.target.value.replace(/\D/g, ""))}
                    maxLength={12}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    숫자 10자리를 입력하세요
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">업종</Label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger>
                      <SelectValue placeholder="업종을 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    취소
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1 gap-1"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Save className="h-3 w-3" />
                    )}
                    저장
                  </Button>
                </div>
              </div>
            ) : profile?.business_name || profile?.business_registration_number ? (
              // 정보가 있을 때 표시
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-xs text-muted-foreground">사업장명</span>
                  <span className="text-sm font-medium">{profile.business_name || "미등록"}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-xs text-muted-foreground">사업자등록번호</span>
                  <span className="text-sm font-medium font-mono">
                    {formatBusinessRegNumber(profile.business_registration_number)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-muted-foreground">업종</span>
                  <span className="text-sm font-medium">
                    {getBusinessTypeLabel(profile.business_type)}
                  </span>
                </div>
              </div>
            ) : (
              // 정보가 없을 때
              <div className="text-center py-4">
                <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground">사업장 정보가 없습니다</p>
                <p className="text-xs text-muted-foreground mt-1">
                  수정 버튼을 눌러 정보를 입력하세요
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 gap-1"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                  정보 입력하기
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 데이터 연결 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">데이터 연결</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">국세청 (홈택스)</p>
                  <p className="text-xs text-muted-foreground">세금계산서, 매출 데이터</p>
                </div>
              </div>
              {profile?.hometax_connected ? (
                <span className="flex items-center gap-1 text-green-500 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  연결됨
                </span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => openDrawer("hometax")}>
                  연결
                </Button>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">카드</p>
                  <p className="text-xs text-muted-foreground">지출 내역 자동 분류</p>
                </div>
              </div>
              {profile?.card_connected ? (
                <span className="flex items-center gap-1 text-green-500 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  연결됨
                </span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => openDrawer("card")}>
                  연결
                </Button>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Landmark className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">계좌</p>
                  <p className="text-xs text-muted-foreground">입출금 내역 실시간 확인</p>
                </div>
              </div>
              {profile?.account_connected ? (
                <span className="flex items-center gap-1 text-green-500 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  연결됨
                </span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => openDrawer("account")}>
                  연결
                </Button>
              )}
            </div>
            <Separator />
            {/* 쿠팡이츠 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UtensilsCrossed className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">쿠팡이츠</p>
                  <p className="text-xs text-muted-foreground">배달 매출·정산 데이터</p>
                </div>
              </div>
              {connectorInstances.some(i => i.connector_id === "hyphen_coupangeats" && i.status === "connected") ? (
                <span className="flex items-center gap-1 text-green-500 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  연결됨
                </span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => openDrawer("coupangeats")}>
                  연결
                </Button>
              )}
            </div>
            <Separator />
            {/* 배달의민족 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bike className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">배달의민족</p>
                  <p className="text-xs text-muted-foreground">배달 매출·정산 데이터</p>
                </div>
              </div>
              {connectorInstances.some(i => i.connector_id === "hyphen_baemin" && i.status === "connected") ? (
                <span className="flex items-center gap-1 text-green-500 text-xs">
                  <CheckCircle2 className="h-3 w-3" />
                  연결됨
                </span>
              ) : (
                <Button variant="outline" size="sm" onClick={() => openDrawer("baemin")}>
                  연결
                </Button>
              )}
            </div>
            <Separator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full gap-2 text-muted-foreground"
                >
                  <RefreshCw className="h-3 w-3" />
                  온보딩 다시 시작
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>온보딩을 다시 시작하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    모든 연동 상태(국세청, 카드, 계좌)가 초기화됩니다. 
                    이 작업은 되돌릴 수 없으며, 연동을 다시 진행해야 합니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      resetOnboarding();
                      await resetConnections();
                      toast.success("연동 상태가 초기화되었습니다");
                      navigate("/onboarding");
                    }}
                  >
                    초기화 및 다시 시작
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  disabled={isDeletingSyncData}
                >
                  {isDeletingSyncData ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  연동 데이터 삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>연동 데이터를 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    카드·계좌에서 동기화된 <strong>모든 거래 내역</strong>이 영구 삭제됩니다. 
                    수동으로 입력한 거래는 유지되며, 연동 상태는 변경되지 않습니다.
                    <br /><br />
                    이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={async () => {
                      setIsDeletingSyncData(true);
                      try {
                        const { data: userData } = await supabase.auth.getUser();
                        if (!userData.user) throw new Error("로그인 필요");

                        const { error } = await supabase
                          .from("transactions")
                          .delete()
                          .eq("user_id", userData.user.id)
                          .not("synced_at", "is", null);

                        if (error) throw error;
                        toast.success("연동 데이터가 삭제되었습니다");
                      } catch (error: any) {
                        toast.error(error.message || "삭제에 실패했습니다");
                      } finally {
                        setIsDeletingSyncData(false);
                      }
                    }}
                  >
                    삭제
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* 알림 설정 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">알림 설정</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">이상 결제 알림</p>
                <p className="text-xs text-muted-foreground">비정상 결제 감지</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">급여일 알림</p>
                <p className="text-xs text-muted-foreground">3일 전 미리 알림</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">세금 납부일 알림</p>
                <p className="text-xs text-muted-foreground">부가세 납부일</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* 보안 설정 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">보안</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">2단계 인증</p>
                <p className="text-xs text-muted-foreground">추가 인증 요구</p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">자동 로그아웃</p>
                <p className="text-xs text-muted-foreground">30분 미사용 시</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <Button variant="outline" className="w-full">비밀번호 변경</Button>
          </CardContent>
        </Card>

        {/* (feedback drawer moved below) */}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">화면</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">다크 모드</p>
                <p className="text-xs text-muted-foreground">어두운 테마</p>
              </div>
              <Switch 
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs">언어</Label>
              <Select defaultValue="ko">
                <SelectTrigger>
                  <Globe className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* 앱 정보 */}
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-sm font-medium">김비서 v1.0.0</p>
              <p className="text-xs text-muted-foreground">© 2026 김비서</p>
            </div>
          </CardContent>
        </Card>

        {/* 문의/피드백 드로어 */}
        <Drawer open={feedbackDrawerOpen} onOpenChange={setFeedbackDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              <MessageSquare className="h-4 w-4" />
              문의 / 피드백
            </Button>
          </DrawerTrigger>
          <DrawerContent className="mx-auto max-w-md">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                문의 / 피드백
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">카테고리</Label>
                <Select value={feedbackCategory} onValueChange={setFeedbackCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">일반 문의</SelectItem>
                    <SelectItem value="bug">오류 신고</SelectItem>
                    <SelectItem value="feature">기능 제안</SelectItem>
                    <SelectItem value="billing">결제/요금</SelectItem>
                    <SelectItem value="other">기타</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">제목</Label>
                <Input
                  placeholder="문의 제목을 입력하세요"
                  value={feedbackSubject}
                  onChange={(e) => setFeedbackSubject(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">내용</Label>
                <Textarea
                  placeholder="문의 내용을 상세하게 작성해주세요"
                  value={feedbackContent}
                  onChange={(e) => setFeedbackContent(e.target.value)}
                  rows={4}
                  maxLength={2000}
                />
                <p className="text-[10px] text-muted-foreground text-right">
                  {feedbackContent.length}/2000
                </p>
              </div>
              <Button
                onClick={handleFeedbackSubmit}
                disabled={feedbackSending || !feedbackSubject.trim() || !feedbackContent.trim()}
                className="w-full gap-2"
              >
                {feedbackSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                문의 보내기
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

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
