# Memory: tech/onboarding/unified-connection-hub
Updated: now

## 통합 연동 허브 (ConnectionHub)

온보딩이 분산되어 있던 3곳(OnboardingWizard, ConnectionDrawer, Onboarding page)을 **체크리스트 형태의 통합 모달**로 일원화함.

### 구조
- `ConnectionHub.tsx`: 5개 서비스(홈택스/카드/계좌/배민/쿠팡이츠)를 필수/배달 카테고리로 나누어 체크리스트 표시
- 각 항목 클릭 → 모달 내에서 해당 연동 플로우 진입 (뒤로가기로 허브 복귀)
- `ConnectionDrawerContext`가 허브를 관리: `openDrawer()` 호출 시 허브 오픈, `openDrawer("card")` 시 해당 서비스로 바로 진입

### 데이터 소스별 역할
- **여신금융협회(카드)**: 모든 카드사 가맹점 매출 통합 조회
- **홈택스**: 세금계산서, 부가세, 종소세
- **은행 계좌**: 입출금 내역, 잔액, 현금매출, 자금흐름 (선택사항이지만 유지)
- **배민/쿠팡이츠**: 배달앱 매출, 정산, 리뷰

### 호출 경로
- 대시보드 IntegratedConnectionCard → `openDrawer()` (허브 전체)
- 각 카드의 동기화/재연동 → `openDrawer("hometax")` (특정 서비스)
- `/onboarding` 페이지 → 상태 요약 + 허브 오픈 버튼
