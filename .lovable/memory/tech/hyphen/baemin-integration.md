# Memory: tech/hyphen/baemin-integration
Updated: 2026-03-31

## 배달의민족 연동 구현 (14개 API 전체)

### 구조
- **Edge Function**: `hyphen-baemin` - 14개 API 엔드포인트 통합 래퍼
- **커넥터**: `hyphen_baemin` (category: delivery, provider: hyphen)
- **sync-orchestrator**: `syncBaemin` 핸들러 - 14개 API 전체 호출
- **DB**: 기존 테이블 + 6개 신규 마케팅 데이터 테이블

### Hyphen API 엔드포인트 (14개)
| Action | Endpoint | 설명 | 저장 테이블 |
|--------|----------|------|------------|
| verify | /in0022000062 | 계정검증 | (온보딩 시 사용) |
| sales | /in0022000063 | 매출조회 | delivery_orders, transactions |
| settlement | /in0022000064 | 정산내역 | delivery_settlements |
| statistics | /in0022000065 | 통계조회 | delivery_statistics |
| reviews | /in0022000066 | 리뷰내역 | delivery_reviews |
| store_info | /in0022000067 | 음식점정보 | delivery_stores |
| orders | /in0022000083 | 주문내역 | delivery_orders (보강) |
| account_info | /in0022000668 | 계좌정보 | delivery_stores (deposit 보강) |
| ad_management | /in0022000952 | 광고관리 | delivery_ads |
| my_store | /in0022000953 | 내 가게 | delivery_stores (보강) |
| store_now | /in0022000972 | 우리가게NOW | delivery_statistics (realtime) |
| nearby_sales | /in0022000973 | 인근지역매출 | delivery_nearby_sales |
| menu | /in0022000974 | 메뉴 | delivery_menus |
| pg_sales | /in0022000140 | PG매출 | delivery_pg_sales |

### 신규 테이블 (마케팅 데이터)
- `delivery_reviews` - 리뷰 (평점, 내용, 답글, 메뉴)
- `delivery_statistics` - 통계 (일별/실시간, 주문수, 신규/재방문)
- `delivery_ads` - 광고 (예산, 소진, 노출, 클릭, 전환)
- `delivery_menus` - 메뉴 (가격, 상태, 주문수)
- `delivery_pg_sales` - PG매출 (카드사별, 수수료)
- `delivery_nearby_sales` - 인근매출 (지역, 순위, 평균)

### 인증
- credentials_meta에 `bm_user_id`, `bm_user_pw` 저장
- `openDrawer("baemin")`으로 연동 시작
