# Core Intent

PROBLEM: Korean small-business owners (식당·카페·미용실) waste hours on bookkeeping, tax filing, payroll and cash-flow checks they don't understand — this app is an AI "secretary" that runs that back-office for them by voice and chat.

FEATURES:
- Voice/chat AI secretary that reads real financial data (sales, expenses, employees, taxes) and answers / executes tasks
- Multi-source data ingestion + sync (CODEF for bank/card/Hometax, Hyphen for Baemin & Coupang Eats) with manual re-sync and a unified Connection Hub
- Tax-accountant collaboration workspace (filings, consultations, AI-drafted documents) with a separate accountant portal

TARGET_USER: Korean sole-proprietor / small-business owners doing a few million KRW/month who can't afford a full-time bookkeeper or marketer; secondary user is the partnered tax accountant who manages many such clients.

# Stack Fingerprint

RUNTIME: Node 18+ for the Vite toolchain · TypeScript ~5.x · Deno runtime for Supabase edge functions

FRONTEND: React 18.3 + Vite 5 + TypeScript + Tailwind CSS 3 + shadcn/ui (Radix) + framer-motion + recharts + react-router-dom v6 + @tanstack/react-query 5 + vite-plugin-pwa + Capacitor 8 (iOS/Android shell)

BACKEND: Supabase (Postgres + Auth + Storage) with 31 Deno edge functions under `supabase/functions/*` (chat-ai, sync-orchestrator, codef-*, hyphen-*, twilio-*, elevenlabs-*, send-push, generate-insights, etc.)

DATABASE: Postgres on Supabase · ~80+ migration files in `supabase/migrations/` · dozens of public tables (transactions, employees, connector_instances, sync_jobs, delivery_orders/menus/reviews/settlements, tax_accountant_assignments, ai_call_logs, profiles, user_roles, …) · RLS enforced with a separate `user_roles` table + `has_role()` SECURITY DEFINER function

INFRA: Hosted preview/publish via Lovable (mrkim.lovable.app, mrkim.today) · Supabase managed backend · no GitHub Actions / CI configured in repo

AI_LAYER: Google Gemini 2.5-flash called directly from edge functions (chat-ai, service-chat, draft-consultation, generate-insights, classify-transactions, onboarding-agent) for chat, tool-calling on tax/financial tools, expense classification, and AI-drafted tax consultations. Lovable AI Gateway is explicitly forbidden by project memory.

EXTERNAL_API: CODEF (bank/card/Hometax/tax-invoice via certificate auth) · Hyphen (Baemin, Coupang Eats) · ElevenLabs (Scribe STT + Conversational AI WebRTC/WebSocket + TTS) · Twilio (Verify + outbound calls) · Resend (transactional email) · Firebase Cloud Messaging v1 (push)

AUTH: Supabase Auth (email/password + PKCE password reset) · phone verification via Twilio Verify · roles in `user_roles` table checked by `has_role()` · separate accountant portal with deferred user_id linking

SPECIAL: Korean Joint Certificate (NPKI) handling — `signPri.key` uses KISA SEED-CBC (OID 1.2.410.200004.1.4) which node-forge can't decrypt, so PFX is synthesized **client-side** in the browser via `@kr-yeon/kisa-seed` + PBKDF1-SHA1 (`src/lib/koreanCertToPfx.ts`) before the base64 PFX is sent to the edge function.

# Failure Log

## Failure 1

SYMPTOM: Hometax 공동인증서 등록이 "Edge Function returned a non-2xx status code"로 반복 실패. 서버에서 DER+KEY → PFX 합성을 시도했지만 비밀번호 검증 단계에서 매번 깨졌고, certType 값을 바꿔봐도 CF-04000/CF-00007이 계속 떨어짐.

CAUSE: 한국 공동인증서의 `signPri.key`는 KISA **SEED-CBC** (OID 1.2.410.200004.1.4 / .1.15)로 암호화된 PKCS#8인데, 엣지 함수가 사용하던 `node-forge`는 SEED 알고리즘을 모름. 즉 라이브러리 한계라 서버 어디를 고쳐도 풀리지 않는 문제였음.

FIX: 사용자에게 3가지 옵션(PFX-only / 클라이언트 SEED 복호화 / 서버에 SEED 직접 구현)을 명시적으로 제시 → "클라이언트에서 SEED 복호화 후 PFX 합성" 채택. `@kr-yeon/kisa-seed` + 직접 구현한 PBKDF1-SHA1로 브라우저에서 키를 풀고, node-forge로 PFX(.p12)를 만든 base64만 엣지로 전송하도록 변경(`src/lib/koreanCertToPfx.ts`, `HometaxConnectionFlow.tsx`, `ChatOnboarding.tsx`).

PREVENTION: 메모리에 규약 고정 — `tech/codef/cert-type-pfx-standard`(DER+KEY 모드에서 certType 생략, PFX 모드만 `certType: "pfx"`), `tech/codef/joint-certificate-technical-spec`(loginType/clientType/RSA 키 동적 조회). CODEF 등록 페이로드는 PFX 단일 파일만 받도록 엣지에서 강제.

## Failure 2

SYMPTOM: 배달의민족 최초 동기화가 60초 엣지 타임아웃에 걸려 매번 실패하고, 잘못된 계정을 입력해도 Hyphen이 200을 돌려줘서 "연동 성공"으로 표시되는 이중 결함.

CAUSE: (1) sync-orchestrator가 14개 Baemin API + 리뷰/통계/광고/메뉴까지 한 번에 3개월치를 끌어오려 해서 Deno 엣지 한도를 초과. (2) Hyphen의 인증 응답 자체가 오인증에도 관대해서 응답 코드만 보면 검증이 안 됨. (3) 재연동 시 이전 매장 데이터가 남아 정합성도 깨졌음.

FIX: 최초 수집 범위를 1개월 + 핵심 3개 API(상점/매출/정산) 우선으로 축소, 나머지는 후속 델타 동기화로 분할. 계정 검증은 응답코드 대신 "3개 이상 엔드포인트에서 실데이터가 잡히는지" 확인하는 **데이터-기반 검증**으로 교체. 재연동 시에는 해당 user의 배달 테이블을 purge 후 재수집.

PREVENTION: 메모리에 `tech/data-sync/baemin-sync-optimization`, `tech/hyphen/baemin-connection-validation`, `tech/hyphen/reconnection-data-purge`로 패턴 고정. sync-orchestrator에 `FUNCTION_VERSION` 상수를 박아 회귀 시 어떤 배포본인지 추적 가능하게 함. `forceFullSync` 플래그로 수동 재수집 경로도 분리.

# Decision Archaeology

## Decision 1

ORIGINAL_PLAN: 음성 대화 엔진으로 OpenAI Realtime API를 쓴다.

REASON_TO_CHANGE: 한국어 음성 품질, 기존 ElevenLabs Scribe(STT) + TTS 인프라와의 통합 편의성, 8종의 네이티브 한국어 보이스 지원이 결정적. 비용/지연 이점보다 한국어 품질·운영 단일화가 우선.

FINAL_CHOICE: ElevenLabs Conversational AI(WebRTC/WebSocket) + Scribe(`kor`) STT + ElevenLabs TTS로 통일. 트랜스포트는 처음부터 `transport: 'websocket'`을 강제해 WebRTC 404 재시도 지연 제거.

OUTCOME: 좋음. V2VoiceContext에서 전역 음성 상태/RMS 시각화를 공유할 수 있게 됨. 트레이드오프는 ElevenLabs 의존 심화 + 토큰 발급용 엣지 함수 2개(`elevenlabs-conversation-token`, `elevenlabs-scribe-token`) 운영 부담.

## Decision 2

ORIGINAL_PLAN: Hometax 연동을 "간편인증"(카카오/PASS 등) 방식으로 처리.

REASON_TO_CHANGE: 간편인증에서 CF-00007이 반복적으로 발생, organization `0002`(전자세금계산서) 흐름과의 호환성 문제, 사용자 입장에서 매번 외부 앱을 열어야 하는 UX 비용까지 겹침.

FINAL_CHOICE: 공동인증서(PFX/P12) 업로드를 기본 방식으로 전환. SEED-CBC 문제를 풀기 위해 위 Failure 1의 클라이언트 변환 파이프라인을 추가.

OUTCOME: 인증 성공률은 올라갔지만 "인증서 파일을 가진 사용자"라는 진입 장벽이 생김. PFX-only 정책으로 단일 경로가 되어 디버깅 표면은 크게 줄어듦.

# AI Delegation Map

| Domain | AI % | Human % | Notes |
|--------|------|---------|-------|
| React/UI Components (shadcn, V2 dashboard, drawers) | 80 | 20 | AI generated most components; human picked layout/UX patterns and the "다크 리퀴드 글래스" design system |
| DB Schema & Migrations | 60 | 40 | AI authored migration SQL; human chose table shape (e.g. separate `user_roles`, delivery_* split) and approved every migration |
| RLS / Security Policies | 50 | 50 | AI proposed `has_role()` SECURITY DEFINER pattern; human enforced "roles in separate table, never on profiles" rule |
| Edge Functions (CODEF / Hyphen / chat-ai / sync-orchestrator) | 70 | 30 | AI wrote handlers; human owned auth params (loginType/certType), versioning constant, sync scope decisions |
| Korean Cert / SEED-CBC Crypto (`koreanCertToPfx.ts`) | 65 | 35 | AI implemented PBKDF1+SEED+PFX assembly; human diagnosed it was a library-capability problem and chose the client-side path |
| Voice / ElevenLabs Integration | 75 | 25 | AI wired hooks/contexts; human picked engine (ElevenLabs over OpenAI Realtime) and forced WebSocket transport |
| Product / UX Decisions ("대표님" persona, zero-tab V2, connection hub flows) | 20 | 80 | Human-driven, captured as memory rules the AI must follow |
| Debugging hard failures (Hometax cert, Baemin timeout, false-positive auth) | 40 | 60 | AI iterated fixes; human supplied the decisive reframings (library limit, timeout budget, data-based validation) |

# Live Proof

DEPLOYED_URL: https://mrkim.lovable.app (also https://mrkim.today, https://www.mrkim.today)
GITHUB_URL: ?
API_ENDPOINTS: Supabase project `kuxpsfxkumbfuqsvcucx` edge functions, e.g. `https://kuxpsfxkumbfuqsvcucx.supabase.co/functions/v1/{chat-ai,sync-orchestrator,codef-hometax,hyphen-baemin,elevenlabs-conversation-token,...}` (auth required for most; several have `verify_jwt = false` per `supabase/config.toml`)
CONTRACT_ADDRESSES: ? (no on-chain component)
OTHER_EVIDENCE: ? — no public user/tx counts visible from the repo; design/feature memory in `.lovable/memory/**` and ~80 migration files act as internal evidence of iteration depth.

# Next Blocker

CURRENT_BLOCKER: knowledge / technical — Hometax 공동인증서 UX. 클라이언트 SEED 복호화로 기술적 막힘은 풀렸지만, 일반 사장님이 NPKI 폴더에서 `signCert.der` / `signPri.key`를 찾아 올리거나 PFX로 변환해 오는 단계 자체가 큰 이탈 지점이고, 실제 성공률·실패 사유 데이터가 부족함.

FIRST_AI_TASK: `src/components/onboarding/HometaxConnectionFlow.tsx`와 `src/components/v2/ChatOnboarding.tsx`에 인증서 업로드 단계별 텔레메트리(파일 형식 감지, SEED 복호화 성공/실패, CODEF 응답 코드)를 `api_usage_logs` 테이블에 기록하고, 최근 7일 성공률·상위 실패 사유를 보여주는 단일 어드민 패널(`/admin/cert-funnel`)을 추가하라. 기존 `useCertConversion`/`buildPfxFromKoreanDerKey` 호출부에 try/catch 로깅만 끼우고 schema는 기존 `api_usage_logs.metadata` JSON 컬럼을 재사용할 것.

# Integrity Self-Check

PROMPT_VERSION: debut-brief/v1.2

VERIFIED_CLAIMS:
- Stack: `package.json` (React 18.3.1, Vite, Tailwind, framer-motion, @tanstack/react-query 5, @elevenlabs/react, @kr-yeon/kisa-seed, node-forge, Capacitor 8, vite-plugin-pwa, zod, recharts).
- 31 edge functions enumerated from `supabase/functions/` listing.
- ~80 migration files counted in `supabase/migrations/` (`ls | wc -l` = 81).
- Routes & feature surface from `src/App.tsx` (V2 dashboard, accountant portal, admin pages, tax-accountant, reports, transactions, employees, funds, etc.).
- Korean cert / SEED-CBC implementation in `src/lib/koreanCertToPfx.ts` (PBKDF1-SHA1, KISA_SEED_CBC, forge.pkcs12).
- CODEF cert/loginType rules in `.lovable/memory/tech/codef/cert-type-pfx-standard.md` and `joint-certificate-technical-spec.md`.
- Edge function JWT exemptions in `supabase/config.toml`.
- Supabase project id `kuxpsfxkumbfuqsvcucx` from `supabase/config.toml`.
- DB schema highlights (user_roles, profiles, connector_instances, sync_jobs, delivery_*, tax_accountant_assignments, ai_call_logs) from `src/integrations/supabase/types.ts`.
- Published URLs from project metadata (`mrkim.lovable.app`, `mrkim.today`).
- Failure 1 narrative cross-checked against the recorded chat history in this session and the current state of `koreanCertToPfx.ts` + `codef-hometax`.

UNVERIFIABLE_CLAIMS:
- GitHub repo URL — not visible to me from the sandbox.
- Real-world user counts, retention, revenue, accountant partnerships — no telemetry table content read.
- Whether ElevenLabs/CODEF/Hyphen/Twilio/FCM keys are actually configured in the live Supabase project (only referenced in code/memory, not inspected).
- Exact migration count of 80 vs 81 — I counted files, not applied migrations; the DB itself was not queried (`psql` had no `PGHOST` in this run).
- AI/Human % split numbers — these are honest estimates from observed commit/iteration patterns, not measured.
- Failure 2 timeout specifics (60s) — taken from project memory `tech/data-sync/baemin-sync-optimization`, not from a reproduced run.

DIVERGENCES: none observed. The user did not modify the template; the brief intentionally marks GitHub URL and user metrics as "?" rather than guessing.

CONFIDENCE_SCORE: 7
