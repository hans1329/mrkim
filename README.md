# 김비서 (Mr. Kim) — AI 경영 비서

소상공인을 위한 AI 기반 백오피스 자동화 앱.
"사장님은 말로 명령만 하세요!" — 매출/지출, 세무, 직원, 자금 관리를 음성·채팅 한 번으로 처리합니다.

## Tech Stack

- **Frontend**: React 18 + Vite 5 + TypeScript + Tailwind CSS + shadcn/ui + framer-motion + recharts
- **Mobile**: Capacitor 8 (iOS/Android) + PWA
- **Backend**: Supabase (Postgres + Auth + Storage + Edge Functions on Deno)
- **AI**: Google Gemini 2.5-flash (chat, classification, drafting, insights)
- **Voice**: ElevenLabs Conversational AI + Scribe(STT) + TTS (Korean native)
- **Integrations**: CODEF (bank/card/Hometax) · Hyphen (Baemin/Coupang Eats) · Twilio (Verify + outbound calls) · Resend (email) · Firebase Cloud Messaging (push)

## Local Development

```sh
# 1) Install
npm install

# 2) Configure env
cp .env.example .env   # then fill in Supabase keys etc.

# 3) Run
npm run dev
```

Node.js 18+ recommended. Supabase project URL and anon key are required for auth and data.

## Scripts

- `npm run dev` — Vite dev server (port 8080)
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run test` — Vitest

## Project Structure

- `src/` — React app (pages, components, hooks, contexts, lib)
- `supabase/functions/` — Deno edge functions (chat-ai, sync-orchestrator, codef-*, hyphen-*, elevenlabs-*, twilio-*, ...)
- `supabase/migrations/` — Postgres schema migrations (RLS enforced via `user_roles` + `has_role()`)
- `public/` — Static assets, PWA manifest, icons

## License

Proprietary. All rights reserved.
