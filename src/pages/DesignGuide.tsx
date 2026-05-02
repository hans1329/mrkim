import { ReactNode, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Plus,
  RotateCw,
  Search,
  Settings,
  TriangleAlert,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

/**
 * V2 Design Guide — 단일 소스 오브 트루스.
 *
 * 본 페이지는 김비서 V2 의 시각 언어·상호작용 원칙을 코드/데모로 기록한다.
 * 새 기능 설계 시 이 페이지를 먼저 열고, 여기에 정의된 토큰·패턴·아이콘 정책을 그대로 따른다.
 * 페이지 자체도 이 규칙을 준수하도록 작성됨 (dogfooding).
 */

// ────────────────── 색상 토큰 ──────────────────
const surfaceTokens = [
  { name: "background", desc: "앱 배경. 가장 아래 층.", cls: "bg-background", text: "text-foreground" },
  { name: "card", desc: "카드·시트 표면.", cls: "bg-card", text: "text-card-foreground" },
  { name: "muted", desc: "비활성·보조 배경.", cls: "bg-muted", text: "text-muted-foreground" },
  { name: "accent", desc: "강조 배경 포인트.", cls: "bg-accent", text: "text-accent-foreground" },
] as const;

const semanticTokens = [
  { name: "primary", desc: "주요 액션·강조 (CTA).", cls: "bg-primary", text: "text-primary-foreground" },
  { name: "secondary", desc: "보조 액션.", cls: "bg-secondary", text: "text-secondary-foreground" },
  { name: "destructive", desc: "삭제·위험 행동.", cls: "bg-destructive", text: "text-destructive-foreground" },
  { name: "success", desc: "성공·완료 상태.", cls: "bg-success", text: "text-success-foreground" },
  { name: "warning", desc: "주의·대기 상태.", cls: "bg-warning", text: "text-warning-foreground" },
] as const;

// ────────────────── 아이콘 사이즈 ──────────────────
const iconSizes = [
  { label: "inline", px: 16, cls: "h-4 w-4", use: "본문 중 인라인 (텍스트와 같은 줄)" },
  { label: "control", px: 20, cls: "h-5 w-5", use: "버튼·입력 내부" },
  { label: "default", px: 24, cls: "h-6 w-6", use: "헤더·탭바·카드 액션" },
  { label: "emphasis", px: 28, cls: "h-7 w-7", use: "강조용 (드물게)" },
] as const;

// ────────────────── 서브컴포넌트 ──────────────────

function Section({
  no,
  title,
  rule,
  children,
}: {
  no: string;
  title: string;
  rule?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{no}</span>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        </div>
        {rule && <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{rule}</p>}
      </header>
      <div>{children}</div>
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-lg bg-muted/60 px-4 py-3 text-[11px] leading-relaxed font-mono text-muted-foreground overflow-x-auto">
      {children}
    </pre>
  );
}

function DoPair({
  doContent,
  doLabel,
  dontContent,
  dontLabel,
}: {
  doContent: ReactNode;
  doLabel: string;
  dontContent: ReactNode;
  dontLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Card className="relative p-5 border-success/30 bg-success/5">
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-success">
          <Check className="h-4 w-4" strokeWidth={1.5} />
          <span>권장</span>
        </div>
        <div className="mt-4">{doContent}</div>
        <p className="mt-4 text-xs text-muted-foreground">{doLabel}</p>
      </Card>
      <Card className="relative p-5 border-destructive/30 bg-destructive/5">
        <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-destructive">
          <X className="h-4 w-4" strokeWidth={1.5} />
          <span>지양</span>
        </div>
        <div className="mt-4">{dontContent}</div>
        <p className="mt-4 text-xs text-muted-foreground">{dontLabel}</p>
      </Card>
    </div>
  );
}

// ────────────────── 메인 페이지 ──────────────────

export default function DesignGuide() {
  const navigate = useNavigate();
  const [switchOn, setSwitchOn] = useState(true);

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-background text-foreground">
      {/* 상단 고정 헤더 */}
      <header
        className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="뒤로"
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold leading-tight">디자인 가이드</h1>
            <p className="text-[11px] text-muted-foreground">V2 · Mobile-first · 2026-04-22</p>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px]">
            v2.design
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-14 pb-24">
        {/* 00. 원칙 */}
        <Section
          no="00"
          title="핵심 원칙"
          rule="모든 V2 화면은 이 4가지 원칙을 따른다. 원칙이 흔들리면 먼저 이 페이지로 돌아와 기준을 맞춘다."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                k: "Headline-first",
                v: "첫 화면은 핵심 지표 1~3개만 크게. 상세는 탭해서 drill-down.",
              },
              {
                k: "Calculated Insight",
                v: "숫자는 수집 데이터에서 정교히 계산된 의미 있는 인사이트여야 함. 단순 합계·기초 차트는 drill-down 안으로.",
              },
              {
                k: "Mobile-first",
                v: "Capacitor iOS/Android 최종 타겟. 50px+ 터치 타겟, safe-area, 한 손 사용 고려.",
              },
              {
                k: "Icon-minimal",
                v: "제목·카드·버튼에 불필요한 아이콘 금지. 이모지 UI 금지.",
              },
            ].map((p) => (
              <Card key={p.k} className="p-4 bg-card/70">
                <div className="text-sm font-semibold text-foreground">{p.k}</div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.v}</p>
              </Card>
            ))}
          </div>
        </Section>

        {/* 01. 색상 */}
        <Section
          no="01"
          title="색상"
          rule={`모든 색은 HSL 시멘틱 토큰으로만 참조한다. text-white · bg-black 같은 직접 컬러 클래스 금지. 다크/라이트 전환과 의미 변경에 견고해야 함.`}
        >
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">표면(Surface)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {surfaceTokens.map((t) => (
                <Card key={t.name} className="overflow-hidden">
                  <div className={`${t.cls} ${t.text} border border-border p-4 h-20 flex items-end`}>
                    <span className="text-xs">Aa</span>
                  </div>
                  <div className="p-3">
                    <div className="font-mono text-xs text-foreground">--{t.name}</div>
                    <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{t.desc}</p>
                  </div>
                </Card>
              ))}
            </div>

            <h3 className="text-sm font-medium text-muted-foreground mt-6">시멘틱(Semantic)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {semanticTokens.map((t) => (
                <Card key={t.name} className="overflow-hidden">
                  <div className={`${t.cls} ${t.text} p-4 h-20 flex items-end`}>
                    <span className="text-xs">Aa</span>
                  </div>
                  <div className="p-3">
                    <div className="font-mono text-xs text-foreground">--{t.name}</div>
                    <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{t.desc}</p>
                  </div>
                </Card>
              ))}
            </div>
            <CodeBlock>{`// ✅ 권장
<div className="bg-card text-foreground" />
<button className="bg-primary text-primary-foreground" />

// ❌ 금지
<div className="bg-white text-black" />
<button style={{ background: "#3b82f6" }} />`}</CodeBlock>
          </div>
        </Section>

        {/* 02. 타이포그래피 */}
        <Section
          no="02"
          title="타이포그래피"
          rule="한글 본문은 시스템 기본 sans (향후 Pretendard 지정 가능). 숫자는 항상 tabular-nums 로 흔들림 방지. 헤드라인 금액은 대형(text-5xl~7xl)."
        >
          <div className="space-y-3">
            <Card className="p-6 space-y-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-mono mb-1">text-7xl · tabular-nums</p>
                <p className="text-7xl font-bold tabular-nums tracking-tight">₩3,240,000</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-mono mb-1">text-5xl · tabular-nums</p>
                <p className="text-5xl font-semibold tabular-nums tracking-tight">+18%</p>
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-[10px] text-muted-foreground font-mono">text-2xl / font-semibold</p>
                <p className="text-2xl font-semibold">섹션 제목</p>
                <p className="text-[10px] text-muted-foreground font-mono">text-base / font-medium</p>
                <p className="text-base font-medium">리스트 항목</p>
                <p className="text-[10px] text-muted-foreground font-mono">text-sm</p>
                <p className="text-sm">본문 설명 텍스트</p>
                <p className="text-[10px] text-muted-foreground font-mono">text-xs / text-muted-foreground</p>
                <p className="text-xs text-muted-foreground">캡션·메타 정보</p>
              </div>
            </Card>
            <CodeBlock>{`// 숫자·금액은 항상 tabular-nums
<p className="text-7xl font-bold tabular-nums">₩3,240,000</p>

// 작은 글씨 하한: text-xs (12px). 그 이하 금지.`}</CodeBlock>
          </div>
        </Section>

        {/* 03. 아이콘 */}
        <Section
          no="03"
          title="아이콘"
          rule="lucide-react 단색 아웃라인만. 이모지·다른 아이콘셋 금지. strokeWidth={1.5} 일괄. currentColor 상속."
        >
          <div className="space-y-4">
            {/* 사이즈 */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-medium">사이즈 체계</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {iconSizes.map((s) => (
                  <div key={s.label} className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                      <Settings className={s.cls} strokeWidth={1.5} />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-mono text-xs text-foreground">{s.cls}</div>
                      <div className="text-[10px] text-muted-foreground">{s.px}px · {s.label}</div>
                      <div className="text-[10px] text-muted-foreground">{s.use}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Do/Don't */}
            <DoPair
              doContent={
                <div className="flex items-center gap-2 text-sm">
                  <RotateCw className="h-4 w-4" strokeWidth={1.5} />
                  새로고침
                </div>
              }
              doLabel="lucide 아이콘 + 한글 레이블. strokeWidth 1.5 일관."
              dontContent={
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-base">🔄</span>
                  새로고침
                </div>
              }
              dontLabel="이모지 사용. 플랫폼별 렌더 다름, 톤 일관성 깨짐."
            />

            <DoPair
              doContent={
                <div className="space-y-1">
                  <p className="text-sm font-semibold">오늘 매출</p>
                  <p className="text-3xl font-bold tabular-nums">₩3,240,000</p>
                </div>
              }
              doLabel="제목엔 아이콘 없이. 숫자가 주인공."
              dontContent={
                <div className="space-y-1">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <TriangleAlert className="h-4 w-4" strokeWidth={1.5} />
                    오늘 매출
                  </p>
                  <p className="text-3xl font-bold tabular-nums">₩3,240,000</p>
                </div>
              }
              dontLabel="무의미한 아이콘. 시선 분산, 위계 흐림."
            />

            <CodeBlock>{`import { Check, RotateCw, TriangleAlert } from "lucide-react";

// ✅ 권장 — strokeWidth={1.5}, 사이즈 Tailwind 클래스
<Check className="h-5 w-5" strokeWidth={1.5} />

// ❌ 금지 — 이모지 UI
<button>🔄 새로고침</button>

// ❌ 금지 — 다른 라이브러리
import { CheckIcon } from "@heroicons/react/24/outline";`}</CodeBlock>
          </div>
        </Section>

        {/* 04. 간격 */}
        <Section
          no="04"
          title="간격 (Spacing)"
          rule="4px 기준 Tailwind 스케일 사용. 4, 8, 12, 16, 24, 32. 홀수 값(5, 7, 11) 금지."
        >
          <Card className="p-5">
            <div className="space-y-2">
              {[1, 2, 3, 4, 6, 8, 12].map((n) => (
                <div key={n} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-14">p-{n}</span>
                  <div className="h-6 bg-primary rounded" style={{ width: `${n * 4 * 2}px` }} />
                  <span className="text-xs text-muted-foreground">{n * 4}px</span>
                </div>
              ))}
            </div>
          </Card>
        </Section>

        {/* 05. 버튼 */}
        <Section
          no="05"
          title="버튼"
          rule="높이 40px 이상 (터치 타겟). Primary 는 한 화면에 하나만 (action focus). 아이콘 필요 시 텍스트 왼쪽, gap-2."
        >
          <Card className="p-5 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="설정">
                <Settings className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button>
                <Plus className="h-4 w-4" strokeWidth={1.5} />
                새 연동 추가
              </Button>
              <Button variant="secondary">
                <RotateCw className="h-4 w-4" strokeWidth={1.5} />
                새로고침
              </Button>
              <Button variant="ghost">
                다음
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </Card>
        </Section>

        {/* 06. 입력 */}
        <Section
          no="06"
          title="입력 · 폼"
          rule="입력 필드 높이 최소 44px. 라벨은 입력 위에 고정 배치 (inside-label 금지). placeholder 는 예시, 필수 여부는 별도 표기."
        >
          <Card className="p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">사업자등록번호</label>
              <Input placeholder="10자리 숫자 입력" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">전화 알림</div>
                <p className="text-xs text-muted-foreground">긴급 이벤트 발생 시 전화로 알림</p>
              </div>
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
            </div>
            <div className="flex items-center gap-2 px-3 h-11 rounded-lg bg-muted">
              <Search className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <Input placeholder="검색" className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0" />
            </div>
          </Card>
        </Section>

        {/* 07. 카드 */}
        <Section
          no="07"
          title="카드"
          rule="radius 0.75rem (기본) ~ 1rem (headline). 같은 화면 3개 이상 동일 크기 카드 금지 → 위계를 만들기."
        >
          <div className="space-y-3">
            {/* Headline 카드 */}
            <Card className="p-6">
              <p className="text-sm font-medium text-muted-foreground">오늘 매출</p>
              <p className="mt-2 text-6xl font-bold tabular-nums tracking-tight">₩3,240,000</p>
              <p className="mt-3 text-sm text-success tabular-nums flex items-center gap-1.5">
                지난주 일요일 대비 +18%
                <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
              </p>
            </Card>
            {/* 보조 카드 2개 */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">이번달 순이익 추정</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">₩4,900,000</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">다음 부가세</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums">₩1,800,000</p>
              </Card>
            </div>
          </div>
        </Section>

        {/* 08. 배지·칩 */}
        <Section no="08" title="배지 · 칩" rule="상태 표시·분류 태그. 작은 텍스트(10~11px), 라운드 md~full.">
          <Card className="p-5">
            <div className="flex flex-wrap gap-2">
              <Badge>기본</Badge>
              <Badge variant="secondary">보조</Badge>
              <Badge variant="outline">외곽선</Badge>
              <Badge variant="destructive">위험</Badge>
              <Badge className="bg-success text-success-foreground">성공</Badge>
              <Badge className="bg-warning text-warning-foreground">대기</Badge>
            </div>
          </Card>
        </Section>

        {/* 09. 로딩 */}
        <Section
          no="09"
          title="로딩 상태"
          rule="스피너 금지. 항상 스켈레톤. 레이아웃 밀림 방지를 위해 실제 컨텐츠 모양과 유사한 크기로."
        >
          <DoPair
            doContent={
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            }
            doLabel="Skeleton 컴포넌트. 실제 레이아웃과 일치시켜 shift 최소화."
            dontContent={
              <div className="flex items-center justify-center h-24">
                <div className="h-8 w-8 rounded-full border-2 border-muted border-t-primary animate-spin" />
              </div>
            }
            dontLabel="스피너. 레이아웃이 비어 보이고 대기감이 증폭됨."
          />
        </Section>

        {/* 10. 숫자 */}
        <Section
          no="10"
          title="숫자 표기"
          rule="금액은 ₩ 기호 + 3자리 쉼표. 단위는 숫자 뒤 작게. 증감 ±% 는 컬러 코딩 (success/destructive)."
        >
          <Card className="p-5 space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">₩3,240,000</span>
              <span className="text-sm text-muted-foreground">총 매출</span>
            </div>
            <div className="flex items-baseline gap-3 text-2xl tabular-nums">
              <span className="text-success font-semibold">+18%</span>
              <span className="text-destructive font-semibold">−12%</span>
              <span className="text-muted-foreground font-semibold">±0%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              마이너스는 하이픈(−, U+2212) 사용. 숫자 폭은 항상 <code>tabular-nums</code>.
            </p>
          </Card>
        </Section>

        {/* 11. 모션 */}
        <Section
          no="11"
          title="모션"
          rule="framer-motion 일관 사용. 진입은 ease-out, 퇴장은 ease-in. 150ms 순간 / 300ms 표준 / 500ms 여유."
        >
          <Card className="p-5 space-y-4">
            <div className="flex flex-wrap gap-3">
              {[150, 300, 500].map((ms) => (
                <motion.div
                  key={ms}
                  className="rounded-lg bg-primary px-4 py-3 text-sm text-primary-foreground font-medium cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: ms / 1000, ease: "easeOut" }}
                >
                  {ms}ms
                </motion.div>
              ))}
            </div>
            <CodeBlock>{`import { motion } from "framer-motion";

<motion.div
  initial={{ opacity: 0, y: 8 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, ease: "easeOut" }}
/>`}</CodeBlock>
          </Card>
        </Section>

        {/* 12. 모바일 패턴 */}
        <Section
          no="12"
          title="모바일 패턴"
          rule="Capacitor 앱 최종 타겟. safe-area, 한 손 사용, 풀투리프레시, 햅틱. 엄지 닿기 어려운 상단엔 주요 액션 금지."
        >
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-medium">Safe Area</h3>
            <CodeBlock>{`// 상단 고정 헤더
<header style={{ paddingTop: "env(safe-area-inset-top)" }}>

// 하단 고정 바 (FAB, 탭바, 버튼)
<div style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>`}</CodeBlock>

            <h3 className="text-sm font-medium mt-4">터치 타겟 50px+</h3>
            <div className="flex gap-3">
              <Button className="h-[50px]">표준 액션 (50px)</Button>
              <Button size="icon" className="h-[50px] w-[50px]" aria-label="설정">
                <Settings className="h-5 w-5" strokeWidth={1.5} />
              </Button>
            </div>

            <h3 className="text-sm font-medium mt-4">Pull-to-refresh (스크롤 상단에서 당기기)</h3>
            <p className="text-xs text-muted-foreground">
              메인 대시보드·거래·연동 페이지에 필수. 새로고침 성공 시 햅틱 성공 패턴 호출.
            </p>

            <h3 className="text-sm font-medium mt-4">Haptics 정책</h3>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• impact.light — 탭·토글</p>
              <p>• impact.medium — 카드 진입, 시트 열기</p>
              <p>• impact.heavy — 중요 제출 (연동 완료 등)</p>
              <p>• notification.success/warning/error — 결과 피드백</p>
              <p>• 데스크톱 환경에서는 graceful no-op.</p>
            </div>
          </Card>
        </Section>

        {/* 13. 연동 전역 접근 */}
        <Section
          no="13"
          title="연동 전역 접근"
          rule="어느 페이지에서든 연동 상태 조회 · 재동기화 · 신규 연동이 2탭 이내로 가능해야 함. 헤더 우측 아이콘 + 상태 점 + 탭 시 bottom sheet."
        >
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">연동 4/4 활성</p>
                <p className="text-xs text-muted-foreground">5분 전 마지막 동기화</p>
              </div>
              <button
                className="relative h-11 w-11 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-transform"
                aria-label="연동 관리"
              >
                <Plus className="h-5 w-5" strokeWidth={1.5} />
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-background" />
              </button>
            </div>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground">
            상태 점 색: 초록(전부 정상) · 노랑(일부 지연/재동기화 중) · 빨강(연결 끊김).
          </p>
        </Section>

        {/* 푸터 */}
        <footer className="pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            김비서 · V2 Design Guide · 2026-04-22
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            최신 규칙은 <code className="font-mono">CLAUDE.md</code> / 본 페이지 중 더 최근 수정본이 기준.
          </p>
        </footer>
      </main>
    </div>
  );
}
