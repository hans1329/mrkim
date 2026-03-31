# Memory: tech/hyphen/delivery-fee-split
Updated: 2026-03-31

## 배달앱 수수료 expense 분리 저장

### 변경 사항
sync-orchestrator에서 배민/쿠팡이츠 주문 동기화 시, 매출(income)과 함께 수수료를 개별 expense 트랜잭션으로 분리 저장.

### 분리되는 수수료 항목
| key | 라벨 | category | icon |
|-----|------|----------|------|
| orderFee | 주문중개수수료 | 지급수수료 | 📋 |
| cardFee | 카드결제수수료 | 지급수수료 | 💳 |
| adFee | 광고비 | 광고선전비 | 📢 |
| deliveryAmt | 배달대행료 | 운반비 | 🏍️ |

### external_tx_id 규칙
- 매출: `{ce|bm}_{orderNo}`
- 수수료: `{ce|bm}_{orderNo}_{feeKey}` (예: `bm_12345_orderFee`)

### 매출 금액 변경
- 기존: `settleAmt`(정산금액) 기준 → 수수료 차감 후 금액
- 변경: `totalAmt`(총 주문금액) 기준 → 원래 매출 + 수수료가 각각 독립 기록
- 이유: 총매출과 비용을 별도로 관리해야 정확한 손익 파악 가능
