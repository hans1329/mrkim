import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Phone,
  Mail,
  Calendar,
  Camera,
  Building2,
  Home,
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();

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
