# Memory: tech/ai/tool-calling-hybrid
Updated: 2026-03-04

## 하이브리드 Tool Calling 아키텍처

chat-ai Edge Function에 Gemini function calling 기반 복합 질문 처리 파이프라인을 도입함.

### 구조
- **단순 질문**: 기존 키워드 기반 의도 분류 → 단일 데이터 소스 조회 → 응답 (1회 API 호출)
- **복합 질문**: `isComplexQuery()` 감지 → Gemini에 6개 도구 제공 → AI가 자율적으로 필요한 도구 선택/호출 → 결과 피드백 → 최종 응답 (2회 API 호출)

### 복합 질문 감지 조건 (`isComplexQuery`)
1. 비교/대비 패턴: "대비", "비교", "비율", "변화", "추이" 등
2. 2개 이상 데이터 소스 키워드 동시 존재 (예: 매출 + 인건비)
3. 여러 기간 동시 언급 (예: 이번달 + 지난달)

### 제공 도구 (6개)
- `get_transactions(period_type, start_date?, end_date?)`
- `get_employees()`
- `get_tax_invoices(period_type, start_date?, end_date?)`
- `get_deposits()`
- `get_savings()`
- `get_auto_transfers()`

### 제약
- 음성 모드에서는 비활성화 (20초 타임아웃 제한)
- Tool calling 실패 시 기존 파이프라인으로 자동 폴백
