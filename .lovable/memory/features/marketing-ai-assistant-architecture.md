# Memory: features/marketing-ai-assistant-architecture
Updated: 2026-03-31

# 소상공인 매출 방어·성장 AI 마케팅 비서 — 전체 설계서

## 1. 비전 및 핵심 원칙

**"예산을 말하면 기획하고, 자료를 올리면 제작하고, 승인하면 집행하고, 끝나면 보고한다"**

- 사장님이 데이터 전문가가 될 필요 없게 만든다
- 기존 김비서의 "말로 명령" 철학을 마케팅 영역으로 확장
- 장사닥터(경쟁사)와의 차별점: 재무/세무/마케팅 통합 AI 비서

### 타겟 사용자
- 오프라인: 식당·카페·미용실 등 네이버 플레이스 의존 로컬 사업자
- 온라인: 네이버·인스타 의존 자사몰 운영자
- 공통: 마케팅 전담 인력 0명, 월 마케팅 예산 10~50만원

---

## 2. 5단계 실행 플로우 아키텍처

### STEP 1: 자동 진단 (Auto Diagnosis)
> "지금 뭐가 문제인지 먼저 파악"

#### 1-1. 매출 이상 감지 엔진
- **데이터 소스**: `delivery_orders`, `delivery_statistics`, `transactions`
- **감지 로직**:
  - 전주 동일 요일 대비 매출 ±15% 변동
  - 3일 연속 하락 트렌드
  - 특정 시간대(점심/저녁) 급감
- **알림**: 푸시 + AI 채팅 자동 보고

#### 1-2. 리뷰 감시 시스템
- **데이터 소스**: `delivery_reviews`
- **감지 로직**:
  - 별점 3.0 이하 리뷰 즉시 알림
  - 주간 평균 별점 하락 추이
  - 부정 키워드 감지 (느리다, 불친절, 차갑다 등)
- **연동**: 리뷰 감지 → AI 답글 초안 자동 생성

#### 1-3. 경쟁 상권 분석
- **데이터 소스**: `delivery_nearby_sales`
- **분석 항목**:
  - 상권 내 나의 순위 변동
  - 평균 매출 대비 내 실적
  - 경쟁사 쿠폰/할인 감지 (배민 데이터 기반)

#### 1-4. 광고 효율 모니터링
- **데이터 소스**: `delivery_ads`
- **감지 로직**:
  - ROAS(광고 대비 매출) 하락 감지
  - 클릭률(CTR) 기준치 미달
  - 예산 소진율 이상 (너무 빠르거나 느린)

#### DB 테이블 (신규)
```sql
-- 마케팅 진단 결과 저장
CREATE TABLE marketing_diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  diagnosis_type TEXT NOT NULL, -- 'sales_anomaly', 'review_alert', 'competition', 'ad_efficiency'
  severity TEXT NOT NULL DEFAULT 'info', -- 'critical', 'warning', 'info'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data_snapshot JSONB,
  suggested_actions JSONB, -- [{action_type, label, params}]
  is_read BOOLEAN DEFAULT false,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
```

#### Edge Function: `marketing-diagnosis`
- pg_cron으로 매일 오전 8시 실행
- 모든 활성 사용자의 데이터 스캔
- 이상 감지 시 `marketing_diagnoses` 저장 + 푸시 알림

---

### STEP 2: 자동 기획 (Auto Planning)
> "예산 안에서 최적 조합 제안"

#### 기능 정의
- 사용자가 "이번 달 20만원" 입력 → AI가 채널별 집행 패키지 구성
- 업종·위치·과거 성과 기반 최적 배분

#### 기획서 구조
```typescript
interface MarketingPlan {
  budget: number;
  period: { start: string; end: string };
  channels: ChannelPlan[];
  expectedOutcome: {
    estimatedNewCustomers: number;
    estimatedROAS: number;
  };
}

interface ChannelPlan {
  channel: 'naver_place' | 'blog' | 'instagram' | 'baemin_ad' | 'coupang_ad';
  budget: number;
  actions: string[];  // 구체적 실행 항목
  priority: 'high' | 'medium' | 'low';
  isFree: boolean;
}
```

#### 예산 배분 AI 로직 (Edge Function: `marketing-plan`)
```
입력: { budget, business_type, location, past_performance }
출력: { plan: MarketingPlan }
```
- Gemini에 업종별 마케팅 전문가 페르소나 부여
- 과거 광고 데이터(`delivery_ads`)의 ROAS 참조
- 무료 액션(플레이스 소개 수정, 블로그 등) 우선 배치

#### DB 테이블 (신규)
```sql
CREATE TABLE marketing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'approved', 'executing', 'completed', 'cancelled'
  budget BIGINT NOT NULL,
  period_start DATE,
  period_end DATE,
  plan_data JSONB NOT NULL, -- ChannelPlan[]
  expected_outcome JSONB,
  actual_outcome JSONB,
  ai_reasoning TEXT, -- AI의 기획 근거
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

---

### STEP 3: 자동 제작 (Auto Creation)
> "콘텐츠 전부 AI가 만든다"

#### 3-1. AI 리뷰 답글 생성 (MVP 핵심)
- **트리거**: 새 리뷰 감지 시 자동 초안 생성
- **커스터마이징**: 사장님 말투 반영 (secretary_tone 활용)
- **워크플로우**: 초안 생성 → 사장님 확인 → 수정/승인 → 게시 (수동 V1 / 자동 V2)

#### 3-2. 홍보 문구 생성
- 네이버 플레이스 소개글 (SEO 최적화)
- 블로그 포스팅 초안
- SNS 카드뉴스 텍스트
- 광고 카피 (배민/쿠팡)

#### 3-3. 이미지 생성 (V2)
- 메뉴 사진 + AI 보정
- 홍보 카드뉴스 이미지
- Gemini Image 모델 활용

#### DB 테이블 (신규)
```sql
-- AI가 생성한 콘텐츠 관리
CREATE TABLE marketing_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES marketing_plans(id),
  content_type TEXT NOT NULL, -- 'review_reply', 'blog_post', 'sns_copy', 'ad_copy', 'place_intro', 'image'
  platform TEXT, -- 'baemin', 'coupangeats', 'naver', 'instagram'
  title TEXT,
  content TEXT NOT NULL,
  image_urls TEXT[],
  status TEXT DEFAULT 'draft', -- 'draft', 'approved', 'published', 'rejected'
  target_review_id UUID, -- 리뷰 답글인 경우
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ
);
```

#### Edge Function: `generate-marketing-content`
```
입력: { content_type, context, tone, platform }
출력: { content, alternatives[] }
```

---

### STEP 4: 자동 집행 (Auto Execution)
> "실행까지 대행 — 핵심 차별점"

#### V1 (MVP): 반자동 — 추천 + 1클릭 승인
- AI가 콘텐츠 + 집행 계획 제안
- 사장님이 [YES] 클릭
- 김비서가 실행 가이드 제공 (수동 복붙 안내)
  - "배민 사장님 사이트에서 이 답글을 붙여넣으세요"
  - 복사 버튼 + 딥링크 제공

#### V2 (중기): 자동 — API 연동 집행
- 배민 광고 API 직접 집행 (Hyphen 확장)
- 네이버 광고 API 연동
- Instagram/Meta 광고 API 연동
- 자동 재활용: 성과 좋은 소재 자동 반복
- 자동 중단: 성과 나쁜 캠페인 즉시 중단

#### DB 테이블 (신규)
```sql
CREATE TABLE marketing_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES marketing_plans(id),
  content_id UUID REFERENCES marketing_contents(id),
  execution_type TEXT NOT NULL, -- 'manual_guide', 'auto_publish', 'auto_ad'
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'failed'
  result JSONB, -- 집행 결과 (노출수, 클릭수 등)
  cost BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  executed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

---

### STEP 5: 초간단 보고 (Simple Report)
> "카카오톡 한 줄로 끝"

#### 보고 채널
1. **AI 채팅**: 기존 chat-ai 엔진에 마케팅 의도 추가
2. **푸시 알림**: 주간 성과 요약
3. **대시보드 카드**: 마케팅 성과 요약 위젯

#### 보고 내용
- "이번 주 10만원 써서 신규 손님 23명 늘었어요"
- "블로그보다 인스타 효율이 2배 좋아요"
- "리뷰 답글 12개 처리했어요. 평점 4.2 → 4.5 상승"

#### AI 채팅 의도 확장
```typescript
// response-engine.ts에 추가할 의도
'marketing_diagnosis'    // "요즘 왜 손님이 줄었어?"
'marketing_plan'         // "이번 달 마케팅 기획해줘"
'marketing_review'       // "리뷰 답글 써줘"
'marketing_report'       // "마케팅 성과 알려줘"
'marketing_content'      // "블로그 글 써줘"
```

---

## 3. UI/UX 설계

### 3-1. 새 페이지: 마케팅 센터 (`/marketing`)
```
탭 구성:
├── 진단 (Diagnosis)     — 매출 이상, 리뷰 알림, 경쟁 분석
├── 기획 (Planning)      — 예산 입력 → AI 기획서
├── 콘텐츠 (Content)     — 리뷰 답글, 블로그, 광고 카피
├── 집행 (Execution)     — 진행 상태, 결과 추적
└── 성과 (Performance)   — ROI, 신규고객, 리뷰 변화
```

### 3-2. 대시보드 위젯
- 마케팅 건강도 스코어 (0~100)
- 금주 핵심 진단 알림
- 미처리 리뷰 답글 수

### 3-3. AI 채팅 통합
- "마케팅" 관련 키워드 감지 시 마케팅 전용 컨텍스트 전환
- 시각화: 광고 성과 차트, 리뷰 트렌드 등

---

## 4. 기존 인프라 활용 매핑

| 기존 인프라 | 마케팅 기능에서의 활용 |
|------------|---------------------|
| `delivery_orders` | 매출 이상 감지, 시간대별 분석 |
| `delivery_reviews` | 리뷰 감시, AI 답글 생성 |
| `delivery_ads` | 광고 ROI 분석, 예산 최적화 |
| `delivery_statistics` | 트렌드 분석, 경쟁력 비교 |
| `delivery_nearby_sales` | 상권 경쟁 분석 |
| `delivery_menus` | 인기메뉴 기반 홍보 전략 |
| `delivery_pg_sales` | 결제수단별 분석 |
| `delivery_stores` | 업종/위치 정보 → 타겟팅 |
| `chat-ai` (Edge Function) | 마케팅 의도 분류 추가 |
| `response-engine.ts` | 마케팅 전용 프롬프트 |
| `notifications` / `send-push` | 진단 알림 발송 |
| Gemini API (GEMINI_API_KEY) | 콘텐츠 생성, 진단 분석 |

---

## 5. 구현 로드맵

### Phase 1: 매출 방어 알림 (2주) 🔴
- [ ] `marketing_diagnoses` 테이블 생성
- [ ] `marketing-diagnosis` Edge Function 구현
- [ ] 매출 이상 감지 로직 (전주 대비)
- [ ] 리뷰 악화 감지 로직 (별점 추이)
- [ ] 광고 효율 하락 감지
- [ ] 대시보드 마케팅 알림 카드
- [ ] AI 채팅에 마케팅 진단 의도 추가

### Phase 2: AI 리뷰 답글 + 기획서 (2주) 🟡
- [ ] `marketing_contents` 테이블 생성
- [ ] `generate-marketing-content` Edge Function
- [ ] 리뷰 답글 자동 초안 생성 UI
- [ ] `marketing_plans` 테이블 생성
- [ ] `marketing-plan` Edge Function
- [ ] 예산 기반 기획서 생성 UI

### Phase 3: 콘텐츠 제작 + 반자동 집행 (3주) 🟡
- [ ] `marketing_executions` 테이블 생성
- [ ] 블로그/SNS 카피 생성
- [ ] 광고 카피 생성
- [ ] 1클릭 복사 + 딥링크 안내 (수동 집행)
- [ ] 마케팅 센터 페이지 (`/marketing`)

### Phase 4: 성과 보고 + 고도화 (2주) 🟢
- [ ] 주간/월간 마케팅 성과 리포트
- [ ] AI 채팅 마케팅 보고 통합
- [ ] 마케팅 건강도 스코어
- [ ] 푸시 알림 주간 요약

### Phase 5: 완전 자동 집행 (미래) 🔵
- [ ] 네이버 광고 API 연동
- [ ] 배민 광고 API 확장 (Hyphen)
- [ ] Meta/Instagram API 연동
- [ ] AI 이미지 생성 (Gemini Image)
- [ ] 자동 A/B 테스트

---

## 6. 시나리오 플로우 예시

### 시나리오: "요즘 손님이 줄었어"
```
사장님: "요즘 손님이 줄었어. 뭐가 문제야?"

김비서: 확인해봤어요, 대표님! 📊

📉 매출 진단 결과:
• 이번 주 매출 약 320만원 — 지난주 대비 18% 감소
• 특히 점심 시간대(11~14시) 주문이 25% 줄었어요
• 경쟁사 분석: 반경 1km 내 신규 가게 2곳 오픈

⭐ 리뷰 현황:
• 최근 7일 평균 별점 3.8 (이전 4.3에서 하락)
• "배달 느림" 키워드 리뷰 3건 감지

📢 광고 현황:
• 배민 울트라콜 CTR 2.1% → 1.4% 하락

💡 이렇게 하면 어때요? (예산 20만원 기준)
① 부정 리뷰 3건 답글 지금 바로 작성해드릴게요 (무료)
② 점심 타임세일 광고 10만원 — 반경 2km 직장인 타겟
③ 배민 소개글 SEO 개선 (무료)
④ 인스타 신메뉴 홍보 10만원

예상 효과: 신규 방문 약 25~35명 증가

진행할까요? [YES] [수정할게요]
```

---

## 7. 기술 제약 및 고려사항

- **Lovable AI Gateway 사용 금지** — 모든 AI는 GEMINI_API_KEY 직접 호출
- 네이버/Meta 광고 API는 공식 파트너 인증 필요 (Phase 5)
- 리뷰 자동 게시는 각 플랫폼 정책 확인 필요
- 이미지 생성은 Gemini Image 모델 활용 (GEMINI_API_KEY)
