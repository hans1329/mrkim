# Memory: domain-config
Updated: 2026-02-13

서비스 커스텀 도메인은 `mrkim.today`이다. Google OAuth 등 외부 서비스 연동 시 이 도메인을 기준으로 설정한다. Lovable 기본 도메인은 `mrkim.lovable.app`이며, 커스텀 도메인 활성화 후 Site URL을 `https://mrkim.today`로 변경해야 한다.

Supabase 커스텀 도메인: `app.mrkim.today` (활성 상태)
- 기존 `kuxpsfxkumbfuqsvcucx.supabase.co` 대신 `app.mrkim.today`를 사용
- OAuth 콜백 URL: `https://app.mrkim.today/auth/v1/callback`
- Supabase API 엔드포인트: `https://app.mrkim.today`
