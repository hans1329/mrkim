# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Identity

**Mr. Kim (김비서)** — Voice-first AI back-office assistant for small business owners (restaurants, cafes, salons).

- **Live URL:** https://mrkim.today (Cloudflare Pages 호스팅)
- **Slogan:** "사장님은 말로 명령만 하세요!" (Just give orders by voice!)
- **Target:** Offline SMBs with monthly revenue in millions KRW, no dedicated accounting/marketing staff

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18.3 + Vite 7 + TypeScript 5 + Tailwind 3 + shadcn/ui + framer-motion + @tanstack/react-query 5 + react-router-dom v6 |
| Mobile | Capacitor 8 (iOS/Android), vite-plugin-pwa |
| Backend | Supabase (Postgres + Auth + Storage) + 31 Deno Edge Functions |
| AI | Google Gemini 2.5-flash (direct calls only) |
| Voice | ElevenLabs Conversational AI (WebSocket) + Scribe (`kor`) STT + ElevenLabs TTS |
| External APIs | CODEF (bank/card/hometax), Hyphen (Baemin/CoupangEats), Twilio (Verify+calls), Resend (email), FCM v1 (push) |
| Auth | Supabase Auth (email/PW + PKCE), Twilio Verify (phone), `user_roles` table with `has_role()` SECURITY DEFINER |

---

## Core Design Principles (Non-negotiable)

1. **Honorific "대표님" only** — Never use 사장님/고객님/회원님 in any UI or response
2. **Execution-focused AI** — Not just answers, but actual transaction entry, tax filing, auto-transfer execution
3. **Zero-Tab UX (V2)** — No bottom tabs. 9-dot bento menu + always-on voice interface
4. **Headline-first 정보 위계 (V2)** — 첫 화면은 **핵심 지표 1~3개만 크게** 노출. 상세는 탭해서 drill-down. 모든 headline 은 수집 데이터에서 **정교하게 계산된 임팩트 있는 인사이트**여야 함 (단순 합계·나열·기초 차트는 drill-down 안으로). 소상공인 인지 여유를 고려해 "오늘 이거 하나만 알면 된다" 를 지향.
5. **AI 게이트웨이/프록시 금지** — 모든 AI 호출은 공급자(Gemini 등) 직접 호출. 중개 서비스 사용 금지.
6. **Roles in `user_roles` only** — Never store role in `profiles` table (privilege escalation risk)
7. **Connection status single source** — Only trust `connector_instances.status === 'connected'`
8. **Loading states must use skeletons** — No spinners, always skeleton UI
9. **HSL semantic tokens only** — Never use direct colors like `text-white` or `bg-black`

---

## V2 Design System

```
Theme:      Dark Liquid Glass (#0A0A0F)
Surface:    backdrop-blur-xl, bg-card/60, inset shadow, rounded-2xl
Touch:      50px+ touch targets
Animation:  framer-motion consistently applied
Icons:      NO icons in titles/buttons (except weather card)
Secretary:  Cubic ball/knit ball graphic, no box/border, blur+saturation blend
```

---

## Mobile-First & UX 원칙 (V2)

**최종 타겟은 Capacitor iOS/Android 앱.** 모든 V2 기능은 모바일 앱 환경을 먼저 가정하고 설계.

1. **터치 타겟 50px+** — iOS HIG 44px 초과. 엄지 한 손 사용 고려.
2. **Safe Area** — 헤더 `pt-[env(safe-area-inset-top)]`, 하단 고정 UI `pb-[env(safe-area-inset-bottom)]`. 노치·홈 인디케이터 피해서 레이아웃.
3. **연동(Integrations) 전역 접근** — 어느 페이지에서든 **연동 상태 조회 + 재동기화 + 신규 연동** 이 **2탭 이내** 가능해야 함. 헤더의 "연동 관리" 아이콘(+ 상태 점: 초록/노랑/빨강) → 탭 시 bottom sheet(`vaul`) 올라옴.
4. **Pull-to-refresh** — 메인 대시보드·거래·연동 페이지 모두 지원. 새로고침 시 **backend sync 호출** + **React Query invalidate**. 완료 후 haptic feedback.
5. **Optimistic UI** — 토글/저장/연동 시 즉시 UI 반영 후 서버 검증. 실패 시 롤백.
6. **스켈레톤 only** — 첫 로드는 스켈레톤. 스피너 사용 금지 (최상위 원칙 #8 와 동일).
7. **네이티브 제스처** — 좌측 엣지 swipe (뒤로가기), swipe-to-dismiss (bottom sheet), long-press (퀵 액션 peek).
8. **Haptics** — 중요 인터랙션은 `@capacitor/haptics` (impact light/medium/heavy, notification success/warning/error). 데스크톱에선 graceful no-op.
9. **Tabular numbers** — 숫자 표시에는 `font-variant-numeric: tabular-nums` (Tailwind `tabular-nums`). 숫자 흔들림 방지.
10. **대형 숫자** — Headline 금액/지표는 **48~64px** (`text-5xl`~`text-7xl`). 라벨은 12~14px 미만 금지.
11. **시각적 위계** — 한 화면에 동일 크기의 카드 3개 이상 금지 (Headline-first 원칙). 같은 가중치 = 무의미.

---

## 🎨 Icon 정책 (강제)

1. **라이브러리**: **`lucide-react` 만 사용**. 다른 아이콘 라이브러리 import 금지 (heroicons, phosphor, material-icons 등 ❌).
2. **이모지 UI 금지**: 🎯 🔥 ✅ ❌ 💰 📈 등 **이모지를 UI/컴포넌트에 사용하지 말 것**. 본문 텍스트·토스트·버튼·라벨 전부 해당.
   - 예외: 사용자가 직접 입력한 메시지 내부의 이모지는 그대로 표시 (예: 채팅 메시지 렌더)
   - 내부 문서(prd.md, CLAUDE.md, commit message)의 강조 목적 이모지는 가능.
3. **스타일**: **단색 아웃라인** (lucide 기본). `strokeWidth={1.5}` 일괄 적용. fill 채우기 금지.
4. **사이즈 일관성**: `16` (inline), `20` (버튼/입력 내), `24` (헤더·탭바), `28~40` (강조용). Tailwind 클래스로: `h-4 w-4`, `h-5 w-5`, `h-6 w-6`, `h-7 w-7`.
5. **색상**: 아이콘 색은 항상 `currentColor` 상속. 부모 텍스트 색을 따름. 별도 색 지정 시에도 HSL 시멘틱 토큰(`text-foreground`, `text-muted-foreground`, `text-primary` 등)만.
6. **불필요한 아이콘 금지** — 제목·헤드라인·카드 타이틀에 아이콘 붙이지 말 것 (기존 V2 Design System 룰 재강조). 아이콘은 **정말 의미 전달에 필요할 때만**.
7. **선택 기준**: 동일 의미 여러 후보 중 **가장 추상적·중립적인 것** 선택. 예: "새로고침" = `RotateCw` ✅ vs `RefreshCw` (화살표 두 개라 시각적 노이즈 ↑).

---

## User Roles

| Role | Description | Portal |
|------|-------------|--------|
| `owner` | Default for new signups | `/v2` |
| `accountant` | Partner tax accountant | `/accountant/*` |
| `admin` | Operations admin | `/admin/*` |

---

## Key Components (V2)

- `V2Layout` — Global layout with dark liquid glass theme
- `V2Header` — 9-dot bento menu (left) + mic button (right)
- `V2NavigationDrawer` — Bento menu drawer with dots-to-X animation
- `IntroSequence` — Time-based greeting (morning/lunch/afternoon/evening/night)
- `SecretaryFeed` — "Today's Briefing" + "History" two-section feed
- `WeatherAnchor` — Weather + tax saving gauge (linear progress)
- `TaxSavingCarousel` — 5 tax strategies + Baemin settlement prediction
- `VoiceBubble` / `VoiceListeningHint` — Sine wave oscilloscope (RMS reactive)
- `ChatOnboarding` — Conversational connection flow for 4 integrations
- `SecureCredentialSheet` — Secure password-only input sheet

---

## Data Connections (4 Categories)

| Category | Channel | Auth Method |
|----------|---------|-------------|
| HomeTax (NT) | CODEF `codef-hometax` | Certificate (PFX/P12), loginType `2` |
| Card | CODEF `codef-card` | Certificate or ID/PW |
| Bank | CODEF `codef-bank` | Certificate or ID/PW |
| Delivery | Hyphen `hyphen-baemin`, `hyphen-coupangeats` | ID/PW, data-based validation |

**Corporate auto-detection:** Business registration number digits 4-5 in range 81-99 → `clientType: 'B'`

---

## Edge Functions (31 total)

| Domain | Functions |
|--------|-----------|
| Auth/Email | `auth-email-hook`, `send-custom-email`, `email-unsubscribe`, `delete-account` |
| AI/Chat | `chat-ai`, `service-chat`, `onboarding-agent`, `draft-consultation`, `generate-insights`, `classify-transactions`, `classify-onboarding-intent` |
| Voice | `elevenlabs-conversation-token`, `elevenlabs-scribe-token`, `elevenlabs-tts`, `generate-voice-previews` |
| CODEF | `codef-auth`, `codef-bank`, `codef-card`, `codef-hometax`, `codef-tax-invoice` |
| Hyphen | `hyphen-baemin`, `hyphen-coupangeats` |
| Sync | `sync-orchestrator` |
| Tax Accountant | `attach-consultation-data`, `send-tax-consultation`, `generate-filing-tasks`, `notify-accountant-assignment` |
| Notifications | `send-push`, `phone-alert-scheduler` |
| Phone | `twilio-outbound-call`, `twilio-verify` |

**Rules:** CORS required, JWT self-verification, Zod input validation, no direct SQL, only `supabase.functions.invoke()` calls.

---

## Database Security

- All tables have RLS enabled with `auth.uid() = user_id` pattern
- Role checks must use `has_role(_user_id, _role)` SECURITY DEFINER function
- Never modify Supabase reserved schemas (`auth`, `storage`, `realtime`)
- Time-based validation via triggers, not CHECK constraints
- Storage buckets: `secretary-avatars` (public), `user-avatars` (public), `voice-previews` (public), `tax-filing-packages` (private)

---

## Business Rules

1. **Same-period MoM comparison only** — Never compare partial month vs full month
2. **Initial sync: 3 months** (delivery apps: 1 month due to 60s timeout)
3. **Card USD fallback:** 1,450 KRW/USD fixed rate
4. **Delivery app reconnection:** Purge 6 related tables before re-sync
5. **Hyphen billing:** Minimize probe calls (charged per call)
6. **Fund direct withdrawal forbidden** — No license/capital (show AlertDialog)
7. **Every new page header:** "연동 관리" button on right side

---

## Caching Policy

- React Query: `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus: false`, `retry: 1`
- After saving business registration number: **force profile refetch** before continuing flow
- Voice interface: WebSocket forced, mic permission prewarm

---

## Development Workflow

### 로컬 개발
```bash
npm install          # 의존성 설치 (supabase CLI 포함 devDep)
npm run dev          # Vite 개발 서버 (포트 8080)
npm run build        # 프로덕션 빌드 → dist/
npm run lint         # ESLint
npm run test         # Vitest
```

### Supabase Edge Functions (로컬 → 클라우드 배포)
```bash
# 최초 1회만
npx supabase link --project-ref kuxpsfxkumbfuqsvcucx

# 함수 배포 (CI 없이 수동 — Vercel/CF 와 달리 자동 배포 아님)
npx supabase functions deploy <함수명>

# 로그 확인
npx supabase functions logs <함수명>

# Secrets (프로덕션 환경변수)
npx supabase secrets list
npx supabase secrets set KEY=value
npx supabase secrets unset KEY
```

### 배포 아키텍처
| 계층 | 호스팅 | 배포 방식 |
|---|---|---|
| Frontend (React/Vite) | Cloudflare Pages | `main` branch push → 자동 빌드·배포 |
| Edge Functions | Supabase Cloud | `npx supabase functions deploy` 수동 |
| DB + Auth + Storage | Supabase Cloud | 마이그레이션 시 `supabase db push` |
| Domain | Cloudflare DNS | `mrkim.today` → Pages 커스텀 도메인 |

### 테스트 페이지
- `/test/codef` — CODEF 홈택스 계정등록 진단용 (`TestCodefHometax.tsx`). CODEF 이슈 해결 전까지 유지. 최종 사용자에게는 링크 없음 (직접 URL 접근만).

---

## Environment Variables

```
GEMINI_API_KEY
ELEVENLABS_API_KEY / ELEVENLABS_AGENT_ID
CODEF_CLIENT_ID / CODEF_CLIENT_SECRET / CODEF_PUBLIC_KEY
HYPHEN_USER_ID / HYPHEN_HKEY
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER / TWILIO_VERIFY_SERVICE_SID / TWILIO_MESSAGING_SERVICE_SID
RESEND_API_KEY
FCM_SERVICE_ACCOUNT_KEY
SUPABASE_*
```

---

## Known Constraints

1. **HomeTax certificate UX friction** — NPKI folder navigation + PFX conversion barrier
2. **Fund direct withdrawal not supported** — License/capital requirements
3. **Voice first response delay** — Mitigated with WebSocket + mic prewarm
4. **Delivery app initial sync 60s limit** — Cut to 1 month/3 APIs, delta sync for rest

---

## Route Map

### User Routes
- `/v2` — Main dashboard
- `/v2/transactions`, `/v2/sales-pattern`
- `/dashboard` (legacy v1), `/transactions`, `/reports`, `/employees`, `/funds`
- `/tax-accountant`, `/community`, `/notifications`, `/help`
- `/profile`, `/settings`, `/secretary-settings`

### Tax Accountant Portal
- `/accountant/login`, `/accountant/signup`
- `/accountant/dashboard`, `/accountant/clients`, `/accountant/filings`

### Admin Portal
- `/admin/dashboard`, `/admin/users`, `/admin/tax-accountants`
- `/admin/faq`, `/admin/announcements`, `/admin/email`, `/admin/push`

---

*Reference: prd.md (v2.0, 2026-04-20) · Last updated: 2026-04-22 (Lovable → Cloudflare Pages migration 완료)*
