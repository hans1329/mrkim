import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  CreditCard,
  HelpCircle,
} from "lucide-react";

export default function Settings() {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold">설정</h1>
          <p className="text-muted-foreground">앱 설정을 관리하세요</p>
        </div>

        {/* 사업장 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">사업장 정보</CardTitle>
            </div>
            <CardDescription>사업장 기본 정보를 설정합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>사업장명</Label>
                <Input defaultValue="맛있는 식당" />
              </div>
              <div className="space-y-2">
                <Label>사업자등록번호</Label>
                <Input defaultValue="123-45-67890" />
              </div>
              <div className="space-y-2">
                <Label>대표자명</Label>
                <Input defaultValue="홍길동" />
              </div>
              <div className="space-y-2">
                <Label>업종</Label>
                <Select defaultValue="restaurant">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">요식업</SelectItem>
                    <SelectItem value="retail">소매업</SelectItem>
                    <SelectItem value="service">서비스업</SelectItem>
                    <SelectItem value="manufacturing">제조업</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button>저장</Button>
          </CardContent>
        </Card>

        {/* 알림 설정 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">알림 설정</CardTitle>
            </div>
            <CardDescription>알림 수신 방법을 설정합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">이상 결제 알림</p>
                <p className="text-sm text-muted-foreground">
                  평소와 다른 결제 패턴 감지 시 알림
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">급여일 알림</p>
                <p className="text-sm text-muted-foreground">
                  급여 지급 3일 전 미리 알림
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">세금 납부일 알림</p>
                <p className="text-sm text-muted-foreground">
                  부가세, 종합소득세 등 납부일 알림
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">일일 매출 요약</p>
                <p className="text-sm text-muted-foreground">
                  매일 저녁 매출 요약 리포트 발송
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* 보안 설정 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">보안 설정</CardTitle>
            </div>
            <CardDescription>계정 보안을 관리합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">2단계 인증</p>
                <p className="text-sm text-muted-foreground">
                  로그인 시 추가 인증 요구
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">자동 로그아웃</p>
                <p className="text-sm text-muted-foreground">
                  30분 미사용 시 자동 로그아웃
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <Button variant="outline">비밀번호 변경</Button>
          </CardContent>
        </Card>

        {/* 화면 설정 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">화면 설정</CardTitle>
            </div>
            <CardDescription>앱 외관을 커스터마이징합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="font-medium">다크 모드</p>
                <p className="text-sm text-muted-foreground">
                  어두운 테마 사용
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>언어</Label>
              <Select defaultValue="ko">
                <SelectTrigger className="w-[200px]">
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

        {/* 결제 정보 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">결제 정보</CardTitle>
            </div>
            <CardDescription>서비스 이용 결제 정보를 관리합니다</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">현재 플랜: 프로</p>
                  <p className="text-sm text-muted-foreground">
                    다음 결제일: 2026년 2월 28일
                  </p>
                </div>
                <Button variant="outline">플랜 변경</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 고객 지원 */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">고객 지원</CardTitle>
            </div>
            <CardDescription>도움이 필요하시면 문의하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline">사용 가이드</Button>
              <Button variant="outline">FAQ</Button>
              <Button variant="outline">1:1 문의</Button>
            </div>
            <p className="text-sm text-muted-foreground">
              고객센터: 1588-0000 (평일 09:00~18:00)
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
