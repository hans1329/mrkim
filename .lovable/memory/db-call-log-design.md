# Memory: db/call-log-design
Updated: 2026-01-31

## AI 통화 기록 테이블 설계

### 통화 기록 테이블 (ai_call_logs)
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- contact_id: UUID (FK → contacts) -- 연락처 참조
- contact_name: TEXT -- 수신자 이름 (스냅샷)
- contact_phone: TEXT -- 수신자 번호 (스냅샷)
- call_type: ENUM (reservation, payment, delivery, reminder, custom)
- message_text: TEXT -- TTS로 전달한 메시지 원본
- status: ENUM (pending, calling, connected, completed, no_answer, busy, failed)
- duration_seconds: INTEGER -- 통화 시간 (초)
- twilio_call_sid: TEXT -- Twilio 통화 ID
- error_message: TEXT -- 실패 시 오류 메시지
- scheduled_at: TIMESTAMPTZ -- 예약 발신 시간 (NULL이면 즉시)
- called_at: TIMESTAMPTZ -- 실제 발신 시간
- completed_at: TIMESTAMPTZ -- 통화 종료 시간
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 연락처 테이블 (contacts)
```sql
- id: UUID (PK)
- user_id: UUID (FK → auth.users)
- name: TEXT -- 이름
- phone: TEXT -- 전화번호
- company: TEXT -- 회사/상호명
- type: ENUM (customer, vendor, employee, other)
- notes: TEXT -- 메모
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### 인덱스
- ai_call_logs: (user_id, created_at DESC)
- ai_call_logs: (user_id, status)
- ai_call_logs: (scheduled_at) WHERE status = 'pending'
- contacts: (user_id, name)
- contacts: (user_id, phone)

### RLS 정책
- 사용자는 자신의 통화 기록만 조회/수정 가능
- 사용자는 자신의 연락처만 조회/수정 가능
