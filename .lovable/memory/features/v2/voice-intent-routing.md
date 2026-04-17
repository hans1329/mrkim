---
name: V2 음성 인텐트 라우팅
description: V2 메인 음성 캐치 시 UI 전환 인텐트는 클라이언트가 분기하고, 일반 질의는 chat-ai 툴콜링으로 위임. 짧은 데이터 답변은 카드 형태로 강조 표시.
type: feature
---

# V2 Voice Intent Routing

V2 대시보드 헤더 마이크로 음성 입력 시 2단계 라우터로 처리한다.

## 1) 클라이언트 인텐트 (`src/lib/voiceIntent.ts`)
UI 전환이 필요한 의도만 키워드 매칭으로 즉시 분기 — chat-ai 호출 안 함.
- `employee_register`: 직원/알바 등록 → `VoiceEmployeeRegistration`
- `onboarding_connect`: 카드/은행/홈택스/배달 연동 → `ChatOnboarding`
- `settings`: 비서/알림/프로필 설정 → 설정 페이지 navigate
- `tax_consultation`: 세무사 상담 → `/tax-accountant`
- `chat`: 그 외 (기본값) → `VoiceChatOverlay`가 chat-ai로 처리

## 2) AI 툴콜링 (`VoiceChatOverlay`)
`chat` 인텐트만 처리. `chat-ai` 엣지 함수 호출 → 내장 툴콜링이 매출/매입/배달/세무 등 분기.

## 카드 답변 강조
응답이 80자 이하이면서 숫자/금액/% 포함 시, 일반 말풍선 대신 그라데이션 카드(질문 라벨 + 큰 값)로 표시하여 음성 답변의 가시성을 높임.
