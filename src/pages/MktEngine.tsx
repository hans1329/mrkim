import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Target, 
  Search, 
  FileText, 
  Palette, 
  Rocket, 
  BarChart3,
  Brain,
  AlertTriangle,
  Star,
  TrendingDown,
  TrendingUp,
  Megaphone,
  MessageSquare,
  Image,
  Copy,
  ExternalLink,
  Bell,
  Smartphone,
  CheckCircle2,
  Clock,
  ArrowRight,
  Zap,
  Database,
  Shield,
  Users,
  DollarSign,
  Store,
  Layers,
  CircleDot
} from "lucide-react";

export default function MktEngine() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Target className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">마케팅 AI 비서 엔진</h1>
              <p className="text-muted-foreground text-sm">v1.0 · 2026-03-31 · 소상공인 매출 방어·성장 AI 운영 비서</p>
            </div>
          </div>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-88px)]">
        <div className="container max-w-5xl mx-auto px-4 py-8 space-y-8">
          
          {/* ========== 비전 & 핵심 원칙 ========== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                비전 및 핵심 원칙
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <blockquote className="border-l-4 border-orange-500 pl-4 italic text-muted-foreground">
                "예산을 말하면 기획하고, 자료를 올리면 제작하고, 승인하면 집행하고, 끝나면 보고한다"
              </blockquote>
              <p>사장님이 데이터 전문가가 될 필요 없게 만든다. 기존 김비서의 <strong>"말로 명령"</strong> 철학을 마케팅 영역으로 확장합니다.</p>
              
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <h4 className="font-semibold text-destructive mb-2">소상공인의 구조적 문제</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-lg font-bold">8%</p>
                    <p className="text-muted-foreground text-xs">AI 도입률</p>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-lg font-bold">120%</p>
                    <p className="text-muted-foreground text-xs">평균 ROAS</p>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-lg font-bold">0.9명</p>
                    <p className="text-muted-foreground text-xs">마케팅 인력</p>
                  </div>
                  <div className="text-center p-2 rounded bg-background">
                    <p className="text-lg font-bold">9,300만</p>
                    <p className="text-muted-foreground text-xs">연간 구조적 손실</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <h4 className="font-semibold mb-2">타겟 사용자</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>오프라인</strong>: 식당·카페·미용실 등 (네이버 플레이스 의존)</li>
                    <li>• <strong>온라인</strong>: 네이버·인스타 의존 자사몰 운영자</li>
                    <li>• <strong>공통</strong>: 마케팅 전담 인력 0명, 예산 10~50만원/월</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <h4 className="font-semibold mb-2">차별점 vs 장사닥터</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 재무/세무/마케팅 <strong>통합</strong> AI 비서</li>
                    <li>• 배민/쿠팡/카드/은행 <strong>크로스 분석</strong></li>
                    <li>• AI 채팅 기반 <strong>대화형 마케팅 관리</strong></li>
                    <li>• 자동 집행까지 완결하는 <strong>에이전트</strong></li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ========== 5단계 플로우 개요 ========== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-500" />
                5단계 실행 플로우
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {[
                  { step: 1, icon: Search, label: "자동 진단", desc: "매출 이상·리뷰 악화·경쟁·광고 효율 감지", color: "text-red-500", bg: "bg-red-500/10" },
                  { step: 2, icon: FileText, label: "자동 기획", desc: "예산 입력 → AI 채널별 집행 패키지 자동 구성", color: "text-orange-500", bg: "bg-orange-500/10" },
                  { step: 3, icon: Palette, label: "자동 제작", desc: "리뷰 답글·블로그·광고 카피·이미지 AI 생성", color: "text-yellow-500", bg: "bg-yellow-500/10" },
                  { step: 4, icon: Rocket, label: "자동 집행", desc: "1클릭 승인 → 콘텐츠 업로드 및 광고 집행", color: "text-green-500", bg: "bg-green-500/10" },
                  { step: 5, icon: BarChart3, label: "초간단 보고", desc: "채팅 한 줄 요약 + 다음 액션 제안", color: "text-blue-500", bg: "bg-blue-500/10" },
                ].map(({ step, icon: Icon, label, desc, color, bg }) => (
                  <div key={step} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className={`p-2 rounded-lg ${bg} shrink-0`}>
                      <Icon className={`h-5 w-5 ${color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">STEP {step}</Badge>
                        <span className="font-semibold">{label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* ========== STEP 1: 자동 진단 ========== */}
          <Card className="border-red-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-red-500" />
                  STEP 1 — 자동 진단
                </CardTitle>
                <Badge className="bg-red-500/10 text-red-600 border-red-500/30">Phase 1</Badge>
              </div>
              <p className="text-sm text-muted-foreground">"지금 뭐가 문제인지 먼저 파악" — 사장님이 묻기 전에 AI가 발견</p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* 1-1 매출 이상 감지 */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  1-1. 매출 이상 감지 엔진
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                    <p className="font-medium mb-1">데이터 소스</p>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary">delivery_orders</Badge>
                      <Badge variant="secondary">delivery_statistics</Badge>
                      <Badge variant="secondary">transactions</Badge>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                    <p className="font-medium mb-1">감지 조건</p>
                    <ul className="text-muted-foreground space-y-0.5 text-xs">
                      <li>• 전주 동일 요일 대비 매출 ±15% 변동</li>
                      <li>• 3일 연속 하락 트렌드</li>
                      <li>• 특정 시간대(점심/저녁) 급감</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 1-2 리뷰 감시 */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  1-2. 리뷰 감시 시스템
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                    <p className="font-medium mb-1">데이터 소스</p>
                    <Badge variant="secondary">delivery_reviews</Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                    <p className="font-medium mb-1">감지 로직</p>
                    <ul className="text-muted-foreground space-y-0.5 text-xs">
                      <li>• 별점 3.0 이하 리뷰 즉시 알림</li>
                      <li>• 주간 평균 별점 하락 추이</li>
                      <li>• 부정 키워드 감지 (느리다, 불친절, 차갑다 등)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 1-3 경쟁 상권 */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Store className="h-4 w-4 text-purple-500" />
                  1-3. 경쟁 상권 분석
                </h4>
                <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge variant="secondary">delivery_nearby_sales</Badge>
                  </div>
                  <ul className="text-muted-foreground space-y-0.5 text-xs">
                    <li>• 상권 내 나의 순위 변동 추적</li>
                    <li>• 평균 매출 대비 내 실적 비교</li>
                    <li>• 경쟁사 쿠폰/할인 감지 (배민 데이터)</li>
                  </ul>
                </div>
              </div>

              {/* 1-4 광고 효율 */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-blue-500" />
                  1-4. 광고 효율 모니터링
                </h4>
                <div className="p-3 rounded-lg bg-muted/50 border text-sm">
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge variant="secondary">delivery_ads</Badge>
                  </div>
                  <ul className="text-muted-foreground space-y-0.5 text-xs">
                    <li>• ROAS(광고 대비 매출) 하락 감지</li>
                    <li>• 클릭률(CTR) 기준치 미달</li>
                    <li>• 예산 소진율 이상</li>
                  </ul>
                </div>
              </div>

              {/* DB 스키마 */}
              <div className="p-4 rounded-lg bg-card border">
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4" />
                  신규 테이블: marketing_diagnoses
                </h4>
                <div className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto">
                  <pre>{`CREATE TABLE marketing_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  diagnosis_type TEXT NOT NULL,
    -- 'sales_anomaly' | 'review_alert' | 'competition' | 'ad_efficiency'
  severity TEXT NOT NULL DEFAULT 'info',
    -- 'critical' | 'warning' | 'info'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data_snapshot JSONB,
  suggested_actions JSONB,
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);`}</pre>
                </div>
              </div>

              {/* Edge Function */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-semibold mb-2">Edge Function: marketing-diagnosis</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <code className="text-xs bg-muted px-1 rounded">pg_cron</code>으로 매일 오전 8시 실행</li>
                  <li>• 모든 활성 사용자의 데이터 스캔</li>
                  <li>• 이상 감지 시 <code className="text-xs bg-muted px-1 rounded">marketing_diagnoses</code> 저장 + 푸시 알림</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* ========== STEP 2: 자동 기획 ========== */}
          <Card className="border-orange-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-orange-500" />
                  STEP 2 — 자동 기획
                </CardTitle>
                <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/30">Phase 2</Badge>
              </div>
              <p className="text-sm text-muted-foreground">"예산 안에서 최적 조합 제안" — 20만원이면 뭘 해야 하는지 알려준다</p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="p-4 rounded-lg bg-muted/50 border">
                <h4 className="font-semibold mb-3">기획서 자동 생성 플로우</h4>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <Badge>예산 입력</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Badge variant="secondary">업종·위치·성과 분석</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Badge variant="secondary">채널 믹스 최적화</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Badge className="bg-green-500/10 text-green-600">패키지 제안</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">채널별 예산 배분 예시 (20만원)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { channel: "플레이스 SEO", amount: "무료", badge: "bg-green-500/10 text-green-600" },
                    { channel: "블로그 2건", amount: "무료", badge: "bg-green-500/10 text-green-600" },
                    { channel: "점심 배민 광고", amount: "10만원", badge: "bg-blue-500/10 text-blue-600" },
                    { channel: "인스타 광고", amount: "10만원", badge: "bg-purple-500/10 text-purple-600" },
                  ].map(item => (
                    <div key={item.channel} className="p-3 rounded-lg border text-center">
                      <p className="text-xs text-muted-foreground">{item.channel}</p>
                      <Badge className={`mt-1 ${item.badge}`}>{item.amount}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-card border">
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4" />
                  신규 테이블: marketing_plans
                </h4>
                <div className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto">
                  <pre>{`CREATE TABLE marketing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'draft',
    -- 'draft' | 'approved' | 'executing' | 'completed' | 'cancelled'
  budget BIGINT NOT NULL,
  period_start DATE,
  period_end DATE,
  plan_data JSONB NOT NULL,    -- ChannelPlan[]
  expected_outcome JSONB,
  actual_outcome JSONB,
  ai_reasoning TEXT,           -- AI의 기획 근거
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);`}</pre>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-semibold mb-2">Edge Function: marketing-plan</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• <strong>입력</strong>: 예산, 업종, 위치, 과거 성과 데이터</p>
                  <p>• <strong>처리</strong>: Gemini에 업종별 마케팅 전문가 페르소나 부여</p>
                  <p>• <strong>출력</strong>: 채널별 배분 + 구체적 실행 항목 + 예상 ROI</p>
                  <p>• 무료 액션(플레이스·블로그) 우선 배치</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ========== STEP 3: 자동 제작 ========== */}
          <Card className="border-yellow-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-yellow-500" />
                  STEP 3 — 자동 제작
                </CardTitle>
                <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">Phase 2~3</Badge>
              </div>
              <p className="text-sm text-muted-foreground">"콘텐츠 전부 AI가 만든다" — 사장님은 사진 몇 장만 올리면 된다</p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* 리뷰 답글 */}
                <div className="p-4 rounded-lg border space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-yellow-500" />
                    <h4 className="font-semibold text-sm">AI 리뷰 답글 생성</h4>
                    <Badge variant="destructive" className="text-[10px]">MVP 핵심</Badge>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• 새 리뷰 감지 시 자동 초안 생성</li>
                    <li>• 사장님 말투(secretary_tone) 반영</li>
                    <li>• 초안 → 확인 → 수정/승인 → 게시</li>
                  </ul>
                </div>

                {/* 홍보 문구 */}
                <div className="p-4 rounded-lg border space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-500" />
                    <h4 className="font-semibold text-sm">홍보 문구 생성</h4>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• 네이버 플레이스 소개글 (SEO 최적화)</li>
                    <li>• 블로그 포스팅 초안</li>
                    <li>• SNS 카드뉴스 텍스트</li>
                    <li>• 광고 카피 (배민/쿠팡)</li>
                  </ul>
                </div>

                {/* 이미지 생성 */}
                <div className="p-4 rounded-lg border space-y-2 opacity-60">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-purple-500" />
                    <h4 className="font-semibold text-sm">이미지 생성</h4>
                    <Badge variant="outline" className="text-[10px]">V2</Badge>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• 메뉴 사진 + AI 보정</li>
                    <li>• 홍보 카드뉴스 이미지</li>
                    <li>• Gemini Image 모델 활용</li>
                  </ul>
                </div>

                {/* 영상 생성 */}
                <div className="p-4 rounded-lg border space-y-2 opacity-60">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-pink-500" />
                    <h4 className="font-semibold text-sm">숏폼 영상 제작</h4>
                    <Badge variant="outline" className="text-[10px]">V3</Badge>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    <li>• 메뉴 사진 → 15초 홍보 영상</li>
                    <li>• AI 나레이션 (ElevenLabs)</li>
                    <li>• 인스타 릴스 / 틱톡 최적화</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-card border">
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4" />
                  신규 테이블: marketing_contents
                </h4>
                <div className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto">
                  <pre>{`CREATE TABLE marketing_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES marketing_plans(id),
  content_type TEXT NOT NULL,
    -- 'review_reply' | 'blog_post' | 'sns_copy' | 'ad_copy' | 'place_intro' | 'image'
  platform TEXT,
    -- 'baemin' | 'coupangeats' | 'naver' | 'instagram'
  title TEXT,
  content TEXT NOT NULL,
  image_urls TEXT[],
  status TEXT DEFAULT 'draft',
    -- 'draft' | 'approved' | 'published' | 'rejected'
  target_review_id UUID,      -- 리뷰 답글인 경우
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ========== STEP 4: 자동 집행 ========== */}
          <Card className="border-green-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-green-500" />
                  STEP 4 — 자동 집행
                </CardTitle>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/30">Phase 3~5</Badge>
              </div>
              <p className="text-sm text-muted-foreground">"실행까지 대행" — 분석만 해주는 툴은 많다. 핵심 차별점은 집행이다.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* V1 반자동 */}
                <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500 text-white">V1 · MVP</Badge>
                    <span className="font-semibold text-sm">반자동 집행</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      AI가 콘텐츠 + 집행 계획 제안
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      사장님이 [YES] 클릭
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Copy className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                      1클릭 복사 + 딥링크 제공
                    </li>
                    <li className="flex items-start gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                      "배민 사장님사이트에서 붙여넣으세요"
                    </li>
                  </ul>
                </div>

                {/* V2 완전 자동 */}
                <div className="p-4 rounded-lg border space-y-3 opacity-70">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">V2 · 중기</Badge>
                    <span className="font-semibold text-sm">완전 자동 집행</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• 배민 광고 API 직접 집행 (Hyphen 확장)</li>
                    <li>• 네이버 광고 API 연동</li>
                    <li>• Meta/Instagram API 연동</li>
                    <li>• 성과 좋은 소재 자동 반복</li>
                    <li>• 성과 나쁜 캠페인 즉시 중단</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-card border">
                <h4 className="font-semibold flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4" />
                  신규 테이블: marketing_executions
                </h4>
                <div className="text-xs font-mono bg-muted p-3 rounded overflow-x-auto">
                  <pre>{`CREATE TABLE marketing_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES marketing_plans(id),
  content_id UUID REFERENCES marketing_contents(id),
  execution_type TEXT NOT NULL,
    -- 'manual_guide' | 'auto_publish' | 'auto_ad'
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
    -- 'pending' | 'in_progress' | 'completed' | 'failed'
  result JSONB,               -- 집행 결과 (노출수, 클릭수 등)
  cost BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);`}</pre>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ========== STEP 5: 초간단 보고 ========== */}
          <Card className="border-blue-500/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  STEP 5 — 초간단 보고
                </CardTitle>
                <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30">Phase 4</Badge>
              </div>
              <p className="text-sm text-muted-foreground">"카카오톡 한 줄로 끝" — 복잡한 대시보드 NO. 결과와 다음 행동만.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border text-center space-y-2">
                  <MessageSquare className="h-5 w-5 mx-auto text-blue-500" />
                  <p className="text-sm font-medium">AI 채팅</p>
                  <p className="text-xs text-muted-foreground">기존 chat-ai에 마케팅 의도 추가</p>
                </div>
                <div className="p-3 rounded-lg border text-center space-y-2">
                  <Bell className="h-5 w-5 mx-auto text-orange-500" />
                  <p className="text-sm font-medium">푸시 알림</p>
                  <p className="text-xs text-muted-foreground">주간 성과 요약 자동 발송</p>
                </div>
                <div className="p-3 rounded-lg border text-center space-y-2">
                  <Smartphone className="h-5 w-5 mx-auto text-green-500" />
                  <p className="text-sm font-medium">대시보드 카드</p>
                  <p className="text-xs text-muted-foreground">마케팅 건강도 위젯</p>
                </div>
              </div>

              {/* 보고 예시 */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">보고 메시지 예시</h4>
                <div className="space-y-2">
                  {[
                    "이번 주 10만원 써서 신규 손님 23명 늘었어요. 저번 주보다 15% 증가 📈",
                    "블로그보다 인스타 효율이 2배 좋아요. 다음 달엔 비중 늘려드릴게요 💡",
                    "리뷰 답글 12개 처리했어요. 평점 4.2 → 4.5 상승 ⭐",
                  ].map((msg, i) => (
                    <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                      {msg}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI 채팅 의도 확장 */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-semibold mb-2">AI 채팅 의도 확장 (response-engine.ts)</h4>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { intent: "marketing_diagnosis", label: "마케팅 진단", ex: "요즘 왜 손님이 줄었어?" },
                    { intent: "marketing_plan", label: "마케팅 기획", ex: "이번 달 마케팅 기획해줘" },
                    { intent: "marketing_review", label: "리뷰 관리", ex: "리뷰 답글 써줘" },
                    { intent: "marketing_report", label: "성과 보고", ex: "마케팅 성과 알려줘" },
                    { intent: "marketing_content", label: "콘텐츠 생성", ex: "블로그 글 써줘" },
                  ].map(item => (
                    <Badge key={item.intent} variant="secondary" className="text-xs">
                      {item.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* ========== 시나리오 플로우 ========== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                실제 시나리오 플로우
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* 사장님 */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-bold">👤</div>
                  <div className="p-3 rounded-lg bg-muted max-w-[85%]">
                    <p className="text-sm font-medium">요즘 손님이 줄었어. 뭐가 문제야?</p>
                  </div>
                </div>

                {/* 김비서 */}
                <div className="flex gap-3 justify-end">
                  <div className="p-3 rounded-lg bg-primary/10 max-w-[85%] space-y-3">
                    <p className="text-sm">확인해봤어요, 대표님! 📊</p>
                    
                    <div className="space-y-2 text-xs">
                      <div className="p-2 rounded bg-background border">
                        <p className="font-medium">📉 매출 진단</p>
                        <p className="text-muted-foreground">이번 주 매출 약 320만원 — 지난주 대비 18% 감소</p>
                        <p className="text-muted-foreground">점심 시간대(11~14시) 주문 25% 급감</p>
                      </div>
                      <div className="p-2 rounded bg-background border">
                        <p className="font-medium">⭐ 리뷰 현황</p>
                        <p className="text-muted-foreground">최근 7일 평균 별점 3.8 (이전 4.3 대비 하락)</p>
                        <p className="text-muted-foreground">"배달 느림" 키워드 리뷰 3건 감지</p>
                      </div>
                      <div className="p-2 rounded bg-background border">
                        <p className="font-medium">📢 광고 현황</p>
                        <p className="text-muted-foreground">배민 울트라콜 CTR 2.1% → 1.4% 하락</p>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-green-500/10 border border-green-500/20 text-xs space-y-1">
                      <p className="font-medium">💡 이렇게 하면 어때요? (예산 20만원)</p>
                      <p>① 부정 리뷰 3건 답글 작성 (무료)</p>
                      <p>② 점심 타임세일 광고 10만원</p>
                      <p>③ 배민 소개글 SEO 개선 (무료)</p>
                      <p>④ 인스타 신메뉴 홍보 10만원</p>
                      <p className="text-green-600 font-medium mt-1">예상 효과: 신규 방문 약 25~35명 증가</p>
                    </div>

                    <div className="flex gap-2">
                      <Badge className="bg-green-500 text-white cursor-pointer">YES</Badge>
                      <Badge variant="outline" className="cursor-pointer">수정할게요</Badge>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold">🤖</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ========== 기존 인프라 활용 매핑 ========== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-500" />
                기존 인프라 활용 매핑
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium">기존 인프라</th>
                      <th className="text-left py-2 font-medium">마케팅 활용</th>
                    </tr>
                  </thead>
                  <tbody className="text-muted-foreground">
                    {[
                      ["delivery_orders", "매출 이상 감지, 시간대별 분석"],
                      ["delivery_reviews", "리뷰 감시, AI 답글 생성"],
                      ["delivery_ads", "광고 ROI 분석, 예산 최적화"],
                      ["delivery_statistics", "트렌드 분석, 경쟁력 비교"],
                      ["delivery_nearby_sales", "상권 경쟁 분석"],
                      ["delivery_menus", "인기메뉴 기반 홍보 전략"],
                      ["delivery_stores", "업종/위치 정보 → 타겟팅"],
                      ["chat-ai (Edge Function)", "마케팅 의도 분류 추가"],
                      ["response-engine.ts", "마케팅 전용 프롬프트"],
                      ["notifications / send-push", "진단 알림 발송"],
                      ["Gemini API", "콘텐츠 생성, 진단 분석"],
                    ].map(([infra, usage]) => (
                      <tr key={infra} className="border-b last:border-0">
                        <td className="py-2 pr-4">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{infra}</code>
                        </td>
                        <td className="py-2 text-xs">{usage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* ========== 구현 로드맵 ========== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                구현 로드맵
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  phase: "Phase 1",
                  title: "매출 방어 알림",
                  duration: "2주",
                  status: "🔴 최우선",
                  color: "border-red-500/30 bg-red-500/5",
                  items: [
                    "marketing_diagnoses 테이블 생성",
                    "marketing-diagnosis Edge Function",
                    "매출 이상 감지 로직 (전주 대비)",
                    "리뷰 악화 감지 로직 (별점 추이)",
                    "광고 효율 하락 감지",
                    "대시보드 마케팅 알림 카드",
                    "AI 채팅에 마케팅 진단 의도 추가",
                  ],
                },
                {
                  phase: "Phase 2",
                  title: "AI 리뷰 답글 + 기획서",
                  duration: "2주",
                  status: "🟡 높음",
                  color: "border-orange-500/30 bg-orange-500/5",
                  items: [
                    "marketing_contents 테이블 생성",
                    "generate-marketing-content Edge Function",
                    "리뷰 답글 자동 초안 생성 UI",
                    "marketing_plans 테이블 생성",
                    "marketing-plan Edge Function",
                    "예산 기반 기획서 생성 UI",
                  ],
                },
                {
                  phase: "Phase 3",
                  title: "콘텐츠 제작 + 반자동 집행",
                  duration: "3주",
                  status: "🟡 중간",
                  color: "border-yellow-500/30 bg-yellow-500/5",
                  items: [
                    "marketing_executions 테이블 생성",
                    "블로그/SNS 카피 생성",
                    "광고 카피 생성",
                    "1클릭 복사 + 딥링크 안내 (수동 집행)",
                    "마케팅 센터 페이지 (/marketing)",
                  ],
                },
                {
                  phase: "Phase 4",
                  title: "성과 보고 + 고도화",
                  duration: "2주",
                  status: "🟢 보통",
                  color: "border-green-500/30 bg-green-500/5",
                  items: [
                    "주간/월간 마케팅 성과 리포트",
                    "AI 채팅 마케팅 보고 통합",
                    "마케팅 건강도 스코어",
                    "푸시 알림 주간 요약",
                  ],
                },
                {
                  phase: "Phase 5",
                  title: "완전 자동 집행",
                  duration: "미정",
                  status: "🔵 미래",
                  color: "border-blue-500/30 bg-blue-500/5",
                  items: [
                    "네이버 광고 API 연동",
                    "배민 광고 API 확장 (Hyphen)",
                    "Meta/Instagram API 연동",
                    "AI 이미지 생성 (Gemini Image)",
                    "자동 A/B 테스트",
                  ],
                },
              ].map((phase) => (
                <div key={phase.phase} className={`p-4 rounded-lg border ${phase.color}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{phase.phase}</Badge>
                      <span className="font-semibold text-sm">{phase.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{phase.status}</span>
                      <Badge variant="secondary" className="text-[10px]">{phase.duration}</Badge>
                    </div>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {phase.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <CircleDot className="h-2.5 w-2.5 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ========== 기술 제약 ========== */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                기술 제약 및 고려사항
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <span><strong>Lovable AI Gateway 사용 금지</strong> — 모든 AI는 GEMINI_API_KEY 직접 호출</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <span>네이버/Meta 광고 API는 <strong>공식 파트너 인증</strong> 필요 (Phase 5)</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                  <span>리뷰 자동 게시는 각 플랫폼 <strong>이용약관</strong> 확인 필요</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  <span>이미지 생성은 Gemini Image 모델 활용 (GEMINI_API_KEY 공유)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="h-8" />
        </div>
      </ScrollArea>
    </div>
  );
}
