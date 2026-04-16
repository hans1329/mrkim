---
name: V2 온보딩 의도 분류 하이브리드
description: ChatOnboarding의 자연어 의도 판별을 정규식 1차 + Gemini AI 폴백 하이브리드로 처리
type: feature
---

V2 음성 온보딩(`ChatOnboarding.tsx`)에서 사용자 발화의 의도(yes/skip/choice)를 다음 순서로 판별한다:

1. **1차 정규식**: `YES_PATTERN`, `SKIP_PATTERN`, `CHOICE_SYNONYMS`로 즉시 매칭 (레이턴시 0)
2. **2차 AI 폴백**: 정규식이 실패한 경우에만 `classify-onboarding-intent` 엣지 함수 호출
   - 모델: `gemini-2.5-flash-lite` (저비용·저지연)
   - 타임아웃: 1.5초 (AbortController)
   - 신뢰도 0.6 미만은 `unclear`로 처리해 재질문 유도
   - 실패/타임아웃 시 무조건 `unclear` 반환 (무한 로딩 방지)

## 적용 단계
- `ASK_STEPS`(hometax_ask/card_ask/bank_ask) + `delivery_ask`: yes/skip 분류
- 연결 단계(cert_upload, password, *_id, *_select, *_method): skip 인텐트만 추가 감지

## 오작동 방지 규칙
- `inline_loading` 상태에서는 음성 입력 무시
- AI 호출은 `trimmedRaw.length > 1`일 때만 (노이즈 발화 차단)
- AI 응답 신뢰도 0.6 미만이면 정규식 결과 우선
