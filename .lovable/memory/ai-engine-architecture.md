# Memory: ai-engine-architecture
Updated: 2025-02-01

# 김비서 AI 엔진 아키텍처 설계서

## 1. 설계 철학

"연결만 해두면 평소엔 신경 쓰지 않아도 되는 서비스" 철학에 따라,
사용자가 질문하지 않아도 AI가 **선제적으로 판단하고 조언**하는 구조를 지향한다.

### Head and Hands 아키텍처
- **Head (두뇌)**: 의도 분석, 판단, 조언 생성 → Lovable AI (Gemini 3 Flash)
- **Hands (손)**: 데이터 조회, 분류, 알림 실행 → Edge Functions + APIs

---

## 2. 핵심 모듈 구성

### 2.1 의도 분류기 (Intent Classifier)
**목적**: 사용자 입력이 업무 범위 내인지 판단

```
[업무 범위]
- 매출/지출 현황 조회
- 세금 관련 질문
- 급여/인사 관리
- 거래처/계약 관리
- 경영 브리핑

[범위 외 → 거절]
- 음식점 추천
- 개인적인 상담
- 일반 지식 질문
```

**구현**: Tool Calling으로 의도 추출
```typescript
tools: [{
  name: "classify_intent",
  parameters: {
    intent: "sales_inquiry" | "tax_question" | "payroll" | "out_of_scope",
    confidence: number,
    requires_data: boolean
  }
}]
```

### 2.2 거래 자동 분류기 (Transaction Classifier)
**목적**: 상호명 패턴으로 비용 카테고리 자동 분류

| 상호명 패턴 | 카테고리 |
|------------|----------|
| 스타벅스, 이디야 | 복리후생비 |
| 카카오택시, 타다 | 여비교통비 |
| 11번가, 쿠팡 | 소모품비 |
| 식당, 레스토랑 | 접대비/복리후생비 |

**구현**: 2단계 분류
1. **규칙 기반**: 정규식 패턴 매칭 (빠름, 정확)
2. **AI 보조**: 미분류 항목에 대해 AI 추론

### 2.3 알림 생성기 (Alert Generator)
**목적**: 긴급도별 할 일 자동 생성

```typescript
type AlertLevel = "urgent" | "warning" | "normal";

interface Alert {
  level: AlertLevel;
  title: string;
  description: string;
  dueDate?: Date;
  action: string;  // "확인하기" | "처리하기" | "신고하기"
}
```

**트리거 조건**:
- 세금 신고 마감 D-7일 → urgent
- 미수금 30일 초과 → warning
- 급여일 D-3일 → normal
- 자금 부족 예상 → urgent

### 2.4 대화 에이전트 (Chat Agent)
**목적**: 자연어 질의응답 및 브리핑

**페르소나 설정**:
- 이름: 사용자 설정 (기본: 김비서)
- 말투: 정중 / 친근 / 큐트
- 성별: 음성 브리핑에 반영

**컨텍스트 관리**:
- 최근 20개 대화 기록 유지
- 사업장 정보 시스템 프롬프트에 포함
- 데이터 연동 상태에 따른 응답 분기

---

## 3. Edge Functions 설계

### 3.1 chat-ai
**역할**: 메인 대화 처리
```
입력: { messages: Message[], context: BusinessContext }
출력: { response: string, actions?: Action[] }
```

### 3.2 classify-transaction
**역할**: 거래 자동 분류
```
입력: { transactions: Transaction[] }
출력: { classified: ClassifiedTransaction[] }
```

### 3.3 generate-alerts
**역할**: 일일 알림 생성 (스케줄러 또는 수동 호출)
```
입력: { businessId: string }
출력: { alerts: Alert[] }
```

### 3.4 briefing-daily
**역할**: 일일 경영 브리핑 생성
```
입력: { businessId: string, date: Date }
출력: { briefing: DailyBriefing }
```

---

## 4. 데이터 플로우

```
[사용자 입력]
     ↓
[의도 분류] → 범위 외 → [거절 응답]
     ↓ 범위 내
[데이터 필요 여부 확인]
     ↓ 필요
[연동 상태 확인] → 미연동 → [시뮬레이션 데이터 + 연동 권유]
     ↓ 연동됨
[Codef API 조회]
     ↓
[AI 분석 & 응답 생성]
     ↓
[응답 + 추천 액션]
```

---

## 5. 보안 고려사항

- **API 키 은닉**: 모든 외부 API 호출은 Edge Function 경유
- **JWT 검증**: 인증된 사용자만 AI 기능 접근
- **Rate Limiting**: 분당 요청 제한으로 비용 관리
- **페르소나 안전장치**: 시스템 프롬프트로 업무 범위 강제

---

## 6. 구현 로드맵

| 단계 | 기능 | 우선순위 |
|-----|------|---------|
| 1단계 | 기본 채팅 AI (chat-ai) | 🔴 높음 |
| 2단계 | 거래 분류기 (classify-transaction) | 🔴 높음 |
| 3단계 | 알림 생성기 (generate-alerts) | 🟡 중간 |
| 4단계 | 일일 브리핑 (briefing-daily) | 🟢 낮음 |
| 5단계 | 음성 브리핑 연동 | 🟢 낮음 |

---

## 7. 기술 스택 요약

- **AI 모델**: Lovable AI Gateway (google/gemini-3-flash-preview)
- **백엔드**: Lovable Cloud Edge Functions
- **데이터 연동**: Codef API
- **상태 관리**: Supabase PostgreSQL
- **실시간**: Supabase Realtime (알림 푸시)
