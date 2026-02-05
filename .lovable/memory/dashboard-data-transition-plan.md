# Memory: dashboard/data-transition-plan
Updated: 2026-02-05

## 대시보드 상태별 데이터 표시 구조

대시보드는 3가지 상태에 따라 다르게 표시됨:
1. **로그아웃 상태**: 전체 목업 UI로 서비스 전 기능 미리보기 제공
2. **로그인 + 미연동 상태**: 오늘의 요약(연동 CTA) + 연동 카드만 표시
3. **연동 상태**: 연동된 항목에 따라 실데이터 기반 UI 단계적 표시

---

## 각 카드별 데이터 전환 조건 및 구현 계획

### 1. TodaySummarySection (오늘의 요약)
- **현재 상태**: 구현 완료 ✅
- **전환 조건**: `isLoggedOut` prop, `isAnyConnected` (hometax/card/account)
- **데이터 소스**: `transactions` 테이블 (오늘/월간 매출/지출 집계)
- **목업 데이터**: 오늘 매출 ₩1,250,000 / 지출 ₩320,000 / 월 지출 ₩4,850,000 / 순이익 ₩8,750,000

### 2. WeeklyChart (주간 매출/지출 현황)
- **현재 상태**: 구현 완료 ✅
- **전환 조건**: `isLoggedIn` + `card_connected || account_connected`
- **데이터 소스**: `transactions` 테이블 (최근 7일 요일별 집계)
- **Sample 워터마크**: 로그아웃 상태에서만 표시

### 3. RecentTransactionsCard (최근 거래 내역)
- **현재 상태**: 구현 완료 ✅
- **전환 조건**: `isLoggedIn` + `card_connected || account_connected`
- **데이터 소스**: `transactions` 테이블 (최근 5건)
- **Sample 워터마크**: 로그아웃 상태에서만 표시

### 4. TodayActionsCard (오늘의 할 일)
- **현재 상태**: 구현 완료 ✅
- **전환 조건**: `isLoggedOut` prop, `isAnyConnected`
- **데이터 소스**: 
  - 부가세 신고 일정: 시스템 계산 (1/4/7/10월 25일)
  - 매출 비교: `transactions` 테이블 (전월 대비)
  - 미분류 거래: `transactions` 테이블 (category IS NULL)
- **목업 데이터**: 부가세 신고 D-7, 미분류 거래 12건

### 5. HometaxSummaryCard (홈택스 현황)
- **현재 상태**: 구현 완료 ✅
- **전환 조건**: `isLoggedOut` prop, `hometax_connected`
- **데이터 소스**: `tax_invoices` 테이블, `hometax_sync_status` 테이블
- **목업 데이터**: 매출 ₩2.5억 (42건) / 매입 ₩1.2억 (28건) / 부가세 ₩1,300만

### 6. EmployeeSummaryCard (직원 현황)
- **현재 상태**: 목업 UI 완료, 실데이터 미구현 ⏳
- **전환 조건**: `isLoggedOut` prop, 향후 `employees` 테이블 존재 여부
- **필요 테이블**: `employees` (id, user_id, name, position, salary, status, created_at)
- **목업 데이터**: 전체 5명, 출근 4명, 급여 예정 ₩12,500,000
- **구현 시점**: 직원 관리 기능 개발 시

### 7. DepositCard (예치금 현황)
- **현재 상태**: 목업 UI 완료, 실데이터 미구현 ⏳
- **전환 조건**: `isLoggedOut` prop, 향후 `deposits` 또는 `savings_goals` 테이블
- **필요 테이블**: `deposits` (id, user_id, type, amount, target_amount, created_at)
- **목업 데이터**: 총 ₩3,250,000 (부가세 80%, 급여 52%)
- **구현 시점**: 자동 적립 기능 개발 시

### 8. AutoTransferCard (자동이체 현황)
- **현재 상태**: 목업 UI 완료, 실데이터 미구현 ⏳
- **전환 조건**: `isLoggedOut` prop, 향후 `auto_transfers` 테이블
- **필요 테이블**: `auto_transfers` (id, user_id, name, amount, schedule, status, last_executed_at)
- **목업 데이터**: 부가세 적립 ₩130,000 (완료), 급여 이체 ₩12,500,000 (대기)
- **구현 시점**: 자동이체 기능 개발 시

### 9. AlertCard (최근 알림)
- **현재 상태**: 목업 UI 완료, 실데이터 미구현 ⏳
- **전환 조건**: `isLoggedOut` prop, 향후 `notifications` 테이블
- **필요 테이블**: `notifications` (id, user_id, type, title, message, is_read, created_at)
- **목업 데이터**: 부가세 D-7, 매출 15% 증가, 미분류 거래 12건
- **구현 시점**: 알림 시스템 개발 시

---

## 구현 우선순위 및 의존성

1. **이미 완료된 기능** (실데이터 연동 가능):
   - 오늘의 요약, 주간 차트, 최근 거래 → `transactions` 테이블 ✅
   - 홈택스 현황 → `tax_invoices`, `hometax_sync_status` 테이블 ✅
   - 오늘의 할 일 → 부분적 실데이터 (부가세 일정, 미분류 거래) ✅

2. **다음 구현 예정**:
   - 직원 현황 → `employees` 테이블 생성 필요
   - 알림 → `notifications` 테이블 생성 필요

3. **향후 구현**:
   - 예치금 현황 → `deposits` 테이블 + 자동 적립 로직
   - 자동이체 → `auto_transfers` 테이블 + 스케줄러 (Cron Edge Function)

---

## 코드 패턴

각 카드 컴포넌트는 `isLoggedOut` prop을 받아 조건부 렌더링:

```tsx
interface CardProps {
  isLoggedOut?: boolean;
}

export function ExampleCard({ isLoggedOut = false }: CardProps) {
  // 로그아웃: 목업 UI
  if (isLoggedOut) {
    return <MockupUI />;
  }

  // 로그인 + 미연동: 빈 상태 또는 연동 유도
  if (!isConnected) {
    return <EmptyState />;
  }

  // 연동됨: 실데이터 UI
  return <RealDataUI data={fetchedData} />;
}
```

Dashboard.tsx에서 상태 전달:
```tsx
const isLoggedOut = isLoggedIn === false;

{isLoggedOut && (
  <EmployeeSummaryCard isLoggedOut />
  <DepositCard isLoggedOut />
  // ...
)}
```
