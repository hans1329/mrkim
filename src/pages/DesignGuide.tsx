import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  Settings, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Bot,
  ChevronRight
} from "lucide-react";
import chaltteokImage from "@/assets/icc-4.webp";

const colorTokens = [
  { name: "background", desc: "앱 배경색", class: "bg-background" },
  { name: "foreground", desc: "기본 텍스트", class: "bg-foreground" },
  { name: "card", desc: "카드 배경", class: "bg-card" },
  { name: "primary", desc: "주요 액션, 강조", class: "bg-primary" },
  { name: "secondary", desc: "보조 요소", class: "bg-secondary" },
  { name: "muted", desc: "비활성/배경", class: "bg-muted" },
  { name: "accent", desc: "강조 포인트", class: "bg-accent" },
  { name: "destructive", desc: "삭제/위험", class: "bg-destructive" },
  { name: "success", desc: "성공/완료", class: "bg-success" },
  { name: "warning", desc: "경고/주의", class: "bg-warning" },
];

const chartColors = [
  { name: "chart-1", desc: "차트 색상 1", class: "bg-chart-1" },
  { name: "chart-2", desc: "차트 색상 2", class: "bg-chart-2" },
  { name: "chart-3", desc: "차트 색상 3", class: "bg-chart-3" },
  { name: "chart-4", desc: "차트 색상 4", class: "bg-chart-4" },
  { name: "chart-5", desc: "차트 색상 5", class: "bg-chart-5" },
];

export default function DesignGuide() {
  return (
    <MainLayout title="디자인 가이드" showBackButton>
      <div className="space-y-8 pb-8">
        {/* 브랜드 아이덴티티 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">브랜드 아이덴티티</h2>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
                  <Bot className="h-8 w-8 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">김비서</h3>
                  <p className="text-muted-foreground">AI 비서 서비스</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                서비스의 시각적 상징으로 <code className="bg-muted px-1 rounded">lucide-react</code>의 
                Bot 아이콘을 사용합니다. 마케팅 슬로건, PWA 아이콘, 챗봇 인터페이스 등 
                브랜드의 핵심 정체성을 나타내는 요소로 일관되게 적용합니다.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 메인 캐릭터 - 찰떡이 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">메인 캐릭터 로고</h2>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6 mb-6">
              <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-white border-2 border-border shadow-md p-3">
                  <img src={chaltteokImage} alt="찰떡이" className="h-full w-full object-contain" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-bold">찰떡이</h3>
                    <Badge variant="secondary">메인 캐릭터</Badge>
                  </div>
                  <p className="text-primary font-medium">"무슨 얘기든 찰떡같이 알아듣는 AI"</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold mb-2">캐릭터 컨셉</h4>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>사장님의 말을 <strong className="text-foreground">찰떡같이 이해</strong>하는 똑똑한 AI 비서</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>헤드셋을 착용한 귀여운 로봇 형태로 <strong className="text-foreground">친근하고 신뢰감</strong> 있는 이미지</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>언제나 경청하고 응답할 준비가 된 <strong className="text-foreground">24시간 AI 비서</strong></span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold mb-2">활용 영역</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">챗봇 버튼</Badge>
                    <Badge variant="outline">음성 인터페이스</Badge>
                    <Badge variant="outline">로딩 애니메이션</Badge>
                    <Badge variant="outline">온보딩 가이드</Badge>
                    <Badge variant="outline">마케팅 자료</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 색상 시스템 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">색상 토큰</h2>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                {colorTokens.map((token) => (
                  <div key={token.name} className="flex items-center gap-3">
                    <div 
                      className={`h-10 w-10 rounded-lg border ${token.class}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{token.name}</p>
                      <p className="text-xs text-muted-foreground">{token.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 차트 색상 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">차트 색상</h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-2 mb-4">
                {chartColors.map((color) => (
                  <div 
                    key={color.name}
                    className={`h-12 flex-1 rounded-lg ${color.class}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {chartColors.map((color) => (
                  <p key={color.name} className="text-xs text-muted-foreground">
                    {color.name.replace("chart-", "")}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 타이포그래피 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">타이포그래피</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">text-2xl font-bold</p>
                <p className="text-2xl font-bold">대시보드 제목</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">text-lg font-semibold</p>
                <p className="text-lg font-semibold">섹션 제목</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">text-base font-medium</p>
                <p className="text-base font-medium">카드 제목</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">text-sm</p>
                <p className="text-sm">본문 텍스트입니다. 일반적인 설명에 사용됩니다.</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">text-xs text-muted-foreground</p>
                <p className="text-xs text-muted-foreground">보조 텍스트, 캡션</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 버튼 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">버튼</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><Bell className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 배지 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">배지</h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                <Badge>기본</Badge>
                <Badge variant="secondary">보조</Badge>
                <Badge variant="outline">아웃라인</Badge>
                <Badge variant="destructive">위험</Badge>
                <Badge className="bg-success text-success-foreground">성공</Badge>
                <Badge className="bg-warning text-warning-foreground">경고</Badge>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 카드 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">카드</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  기본 카드
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  카드는 정보를 그룹화하는 기본 컨테이너입니다.
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-warning">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <div>
                  <p className="font-medium">경고 카드</p>
                  <p className="text-sm text-muted-foreground">
                    왼쪽 테두리로 상태를 표시합니다.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-success">
              <CardContent className="p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                <div>
                  <p className="font-medium">성공 카드</p>
                  <p className="text-sm text-muted-foreground">
                    완료된 상태를 표시합니다.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 입력 요소 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">입력 요소</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">텍스트 입력</label>
                <Input placeholder="입력해주세요..." />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">스위치</label>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 탭 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">탭</h2>
          <Card>
            <CardContent className="p-4">
              <Tabs defaultValue="tab1">
                <TabsList className="w-full">
                  <TabsTrigger value="tab1" className="flex-1">탭 1</TabsTrigger>
                  <TabsTrigger value="tab2" className="flex-1">탭 2</TabsTrigger>
                  <TabsTrigger value="tab3" className="flex-1">탭 3</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1" className="mt-4">
                  <p className="text-sm text-muted-foreground">첫 번째 탭 내용</p>
                </TabsContent>
                <TabsContent value="tab2" className="mt-4">
                  <p className="text-sm text-muted-foreground">두 번째 탭 내용</p>
                </TabsContent>
                <TabsContent value="tab3" className="mt-4">
                  <p className="text-sm text-muted-foreground">세 번째 탭 내용</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* 아이콘 크기 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">아이콘 크기</h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-end gap-6">
                <div className="text-center">
                  <Bell className="h-4 w-4 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">h-4 w-4</p>
                </div>
                <div className="text-center">
                  <Bell className="h-5 w-5 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">h-5 w-5</p>
                  <p className="text-xs text-primary">헤더 기본</p>
                </div>
                <div className="text-center">
                  <Bell className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">h-6 w-6</p>
                </div>
                <div className="text-center">
                  <Bell className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">h-8 w-8</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                헤더 아이콘은 <code className="bg-muted px-1 rounded">size-5</code> 또는 
                <code className="bg-muted px-1 rounded ml-1">[&_svg]:!size-5</code>를 사용합니다.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* 간격 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">간격 (Spacing)</h2>
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 bg-primary rounded" />
                  <span className="text-sm">gap-1 (4px)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-8 bg-primary rounded" />
                  <span className="text-sm">gap-2 (8px)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-12 bg-primary rounded" />
                  <span className="text-sm">gap-3 (12px)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-16 bg-primary rounded" />
                  <span className="text-sm">gap-4 (16px)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-24 bg-primary rounded" />
                  <span className="text-sm">gap-6 (24px)</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                카드 내부 패딩: <code className="bg-muted px-1 rounded">p-4</code> 또는 
                <code className="bg-muted px-1 rounded ml-1">p-6</code>
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Border Radius */}
        <section>
          <h2 className="text-lg font-semibold mb-4">모서리 둥글기</h2>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-end gap-4">
                <div className="text-center">
                  <div className="h-12 w-12 bg-primary rounded-sm mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">rounded-sm</p>
                </div>
                <div className="text-center">
                  <div className="h-12 w-12 bg-primary rounded-md mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">rounded-md</p>
                </div>
                <div className="text-center">
                  <div className="h-12 w-12 bg-primary rounded-lg mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">rounded-lg</p>
                </div>
                <div className="text-center">
                  <div className="h-12 w-12 bg-primary rounded-xl mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">rounded-xl</p>
                </div>
                <div className="text-center">
                  <div className="h-12 w-12 bg-primary rounded-full mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">rounded-full</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 리스트 아이템 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">리스트 아이템</h2>
          <Card>
            <CardContent className="divide-y p-0">
              {[
                { icon: TrendingUp, title: "리포트", desc: "경영 현황 분석" },
                { icon: Bell, title: "알림", desc: "알림 관리" },
                { icon: Settings, title: "설정", desc: "앱 설정" },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* 다크모드 */}
        <section>
          <h2 className="text-lg font-semibold mb-4">다크모드</h2>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                모든 색상은 CSS 변수로 정의되어 라이트/다크 모드를 자동으로 지원합니다.
                <code className="bg-muted px-1 rounded ml-1">.dark</code> 클래스가 적용되면 
                대응하는 다크모드 색상이 활성화됩니다.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
}
