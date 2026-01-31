# Memory: db/auto-transfer-design
Updated: 2026-01-31

## 자동이체 테이블 설계 요구사항

### 데이터 소스 구조 (하이브리드)
- **자체 DB**: 이체 규칙, 스케줄, 상태 관리
- **코드에프**: 실제 이체 실행 내역 조회
- **오픈뱅킹/하이픈 API**: 이체 실행

### 자동이체 규칙 테이블 (auto_transfer_rules)
- `id`: UUID (PK)
- `user_id`: 사업자 계정 참조 (FK)
- `name`: 이체 규칙 이름 (예: "부가세 적립", "월급 이체")
- `type`: enum (vat_reserve, salary, rent, loan, custom)
- `source_account`: 출금 계좌
- `target_account`: 입금 계좌
- `amount_type`: enum (fixed, percentage)
- `amount_value`: 금액 또는 비율
- `schedule_type`: enum (on_income, daily, weekly, monthly, custom_date)
- `schedule_day`: 실행일 (월별: 1-31, 주별: 1-7)
- `is_active`: 활성화 여부
- `created_at`, `updated_at`: 타임스탬프

### 자동이체 실행 내역 테이블 (auto_transfer_logs)
- `id`: UUID (PK)
- `rule_id`: 규칙 참조 (FK)
- `executed_at`: 실행 시각
- `amount`: 이체 금액
- `status`: enum (pending, completed, failed)
- `error_message`: 실패 시 오류 메시지
- `external_tx_id`: 외부 거래 ID (코드에프/오픈뱅킹)

### 프로그래머블 머니 연동
- **부가세 자동 적립**: type=vat_reserve, schedule_type=on_income, amount_type=percentage, amount_value=10
- **급여 자동 이체**: type=salary, schedule_type=monthly, schedule_day=25
- **임대료/대출 상환**: type=rent/loan, schedule_type=monthly

### 실행 흐름
1. 사용자 규칙 설정 → auto_transfer_rules 저장
2. 트리거 조건 충족 (매출 발생/스케줄 도래)
3. Edge Function이 오픈뱅킹/하이픈 API 호출
4. 결과를 auto_transfer_logs에 기록
5. 대시보드에서 rules + logs 조합하여 현황 표시
