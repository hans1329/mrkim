---
name: V2 온보딩 의도 분류 하이브리드
description: ChatOnboarding의 자연어 의도 판별을 정규식 1차 + Gemini AI 폴백 하이브리드로 처리. AI는 ASK_STEPS에서 정규식 실패 시에만 1회 호출.
type: feature
---

V2 음성 온보딩(`ChatOnboarding.tsx`)에서 사용자 발화 의도를 다음 순서로 판별한다:

## 처리 순서 (advance 함수)
1. **동시 실행 가드**: `isAdvancingRef`로 중복 호출 차단 (음성 transcript + 버튼 클릭 충돌 방지)
2. **정규식 SKIP 감지**: 연결 단계(`cert_upload`, `password`, `*_id`, `*_select`, `*_method`)에서 `SKIP_PATTERN` 매칭 시 다음 섹션으로 라우팅
3. **정규식 + 동의어 검증**: `validateStepInput` → `normalizeChoiceValue`가 `CHOICE_SYNONYMS` 및 fuzzy intent 매칭
4. **AI 폴백 (단 1회)**: 위 검증 실패 + `ASK_STEPS`(hometax_ask/card_ask/bank_ask/delivery_ask)에서만
   - `classify-onboarding-intent` 엣지 함수 (Gemini 2.5 flash-lite, 1.5초 타임아웃)
   - 신뢰도 0.6 미만은 `unclear` → 재질문 유도

## AI 호출 안 하는 경우 (중요)
- `card_select`, `card_method`, `bank_select` 등 choice 단계 → `normalizeChoiceValue`가 이미 처리
- 연결 단계 SKIP 감지 → 정규식만 사용 (AI가 잡으면 음성 노이즈로 통째로 스킵 위험)
- 발화 길이 1글자 이하 → 잡음으로 간주

## 오작동 방지
- `inline_loading` 상태에서는 음성 입력 무시
- `isAdvancingRef` 가드로 중복 advance 진입 차단 (300ms 후 해제)
- AI 응답 실패/타임아웃 시 `unclear` 반환으로 무한 로딩 방지
- 한국어 필러 토큰(`음+`, `어+`, `네.` 등)은 `onCommit`에서 사전 필터링
