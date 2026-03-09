# Memory: tech/hyphen/baemin-integration
Updated: 2026-03-09

## 배달의민족 연동 구현 완료

### 구조
- **Edge Function**: `hyphen-baemin` - 14개 API 엔드포인트 통합 래퍼
- **커넥터**: `hyphen_baemin` (category: delivery, provider: hyphen)
- **sync-orchestrator**: `syncBaemin` 핸들러 추가
- **DB**: 쿠팡이츠와 `delivery_stores/orders/settlements` 공유 (platform='baemin')

### Hyphen API 엔드포인트 (14개)
| Action | Endpoint | 설명 |
|--------|----------|------|
| verify | /in0022000062 | 계정검증 |
| sales | /in0022000063 | 매출조회 |
| settlement | /in0022000064 | 정산내역 |
| statistics | /in0022000065 | 통계조회 |
| reviews | /in0022000066 | 리뷰내역 |
| store_info | /in0022000067 | 음식점정보 |
| orders | /in0022000083 | 주문내역 |
| account_info | /in0022000668 | 계좌정보 |
| ad_management | /in0022000952 | 광고관리 |
| my_store | /in0022000953 | 내 가게 |
| store_now | /in0022000972 | 우리가게NOW |
| nearby_sales | /in0022000973 | 인근지역매출 |
| menu | /in0022000974 | 메뉴 |
| pg_sales | /in0022000140 | PG매출 |

### 인증
- credentials_meta에 `bm_user_id`, `bm_user_pw` 저장
- `openDrawer("baemin")`으로 연동 시작
