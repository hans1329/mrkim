# Memory: tech/onboarding/crefia-auth-strategy
Updated: now

여신금융협회(0090) 연동은 Codef에 해당 상품이 존재하지 않아 사용 불가. UI에서 숨김 처리 완료. 카드매출 수집은 개별 카드사 API + 공동인증서(loginType: "2") 방식으로 전환함. 각 카드사(신한, 삼성, KB 등)별로 인증서 등록 후 승인내역을 조회하는 구조.
