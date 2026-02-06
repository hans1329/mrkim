# Memory: tech/no-lovable-ai-gateway
Updated: 2026-02-06

## 핵심 원칙
**Lovable AI Gateway (`LOVABLE_API_KEY`)는 절대 사용하지 않는다.**

- 모든 AI 기능은 Google Gemini API (`GEMINI_API_KEY`)를 직접 호출하는 방식을 유지한다.
- `generate-insights` Edge Function 등 기존에 `LOVABLE_API_KEY`를 사용하는 코드가 있다면 `GEMINI_API_KEY` 직접 호출로 전환해야 한다.
- 새로운 AI 기능을 추가할 때도 반드시 Gemini API 직접 호출 방식을 사용한다.
- Lovable AI Gateway URL (`https://ai.gateway.lovable.dev`)로의 호출을 금지한다.
