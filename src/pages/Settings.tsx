import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Bell,
  Shield,
  Palette,
  Globe,
  Home,
} from "lucide-react";
import { useTheme } from "next-themes";

export default function Settings() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <MainLayout title="설정" subtitle="앱 설정을 관리하세요">
      <div className="space-y-4">
        {/* 사업장 정보 */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">사업장 정보</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">사업장명</Label>
              <Input defaultValue="맛있는 식당" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">사업자등록번호</Label>
              <Input defaultValue="123-45-67890" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">업종</Label>
              <Select defaultValue="restaurant">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurant">요식업</SelectItem>
                  <SelectItem value="retail">소매업</SelectItem>
                  <SelectItem value="service">서비스업</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full">저장</Button>
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

        {/* 화면 설정 */}
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

        {/* 홈으로 가기 */}
        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => navigate("/")}
        >
          <Home className="h-4 w-4" />
          홈으로 가기
        </Button>
      </div>
    </MainLayout>
  );
}
