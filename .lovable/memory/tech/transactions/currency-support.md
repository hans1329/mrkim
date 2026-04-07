# Memory: tech/transactions/currency-support
Updated: now

`transactions` 테이블의 통화 처리 전략:
- `amount`: 항상 **원화(KRW) 청구 금액** 저장 (카드사가 환전 후 확정한 금액). 대시보드 합산, 리포트, 세무 신고 모두 이 값 기준.
- `currency`: 해외 결제 구분용 (`KRW` 기본, `USD` 등). CODEF API의 `resOverseasFlag`, `resCurrencyCode`, 또는 영문 가맹점 패턴으로 자동 판별.
- `local_amount`: 해외 결제 시 **현지 통화 원금** (예: $19.99). CODEF의 `resOverseasAmount`에서 추출. 참고 표시용.
- UI: `formatCurrency(amount)`로 항상 원화 표시하고, `currency === 'USD' && local_amount > 0`인 경우 아래에 `$19.99` 참고 표시.
- 요약/합산: 모든 금액은 KRW 기준으로 통일 계산.
