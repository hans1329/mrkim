# Memory: tech/hyphen/coupangeats-integration
Updated: 2026-03-09

## 쿠팡이츠 연동 구현 완료

### 구조
- **Edge Function**: `hyphen-coupangeats` - 9개 API 엔드포인트 통합 래퍼
- **DB 테이블**: `delivery_stores`, `delivery_orders`, `delivery_settlements` (RLS 적용)
- **커넥터**: `hyphen_coupangeats` (category: delivery, provider: hyphen)
- **sync-orchestrator**: `syncCoupangeats` 핸들러 추가, 6시간 주기 자동 동기화

### Hyphen API 엔드포인트 (9개)
| Action | Endpoint | 설명 |
|--------|----------|------|
| verify | /in0024000079 | 계정검증 |
| sales | /in0024000080 | 매출조회 |
| settlement | /in0024000081 | 정산내역 |
| store_info | /in0024000082 | 음식점정보 |
| orders | /in0024000086 | 주문내역 |
| account_info | /in0024000722 | 계좌정보 |
| reviews | /in0024000800 | 리뷰내역 |
| my_store | /in0024000955 | 내 가게 |
| menu | /in0024000976 | 메뉴 |

### 인증
- Headers: `user-id` (HYPHEN_USER_ID), `Hkey` (HYPHEN_HKEY)
- Body: `userId`/`userPw` (쿠팡이츠 사장님 계정)
- credentials_meta에 `ce_user_id`, `ce_user_pw` 저장

### 동기화 흐름
1. 가게 정보 → `delivery_stores` upsert
2. 매출(주문) → `delivery_orders` upsert + `transactions` (source_type: delivery) upsert
3. 정산 내역 → `delivery_settlements` upsert

### UI
- `CoupangeatsConnectionFlow` 컴포넌트
- `ConnectionDrawer`에 `coupangeats` 타입 추가
- `openDrawer("coupangeats")`로 호출
