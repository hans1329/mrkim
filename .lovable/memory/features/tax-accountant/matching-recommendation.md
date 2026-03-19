# Memory: features/tax-accountant/matching-recommendation
Updated: now

## 매칭 알고리즘 (멀티팩터 스코어링)
- 업종 매칭: 40점 (business_type ↔ industry_types)
- 전문분야 다양성: 최대 15점 (specialties 수 × 5)
- 가격 투명성: 10점 (pricing_info 존재)
- 지역 정보: 5점
- 소개글: 5점
- 프로필 이미지: 5점
- 소속 사무소: 5점
- 40점 이상 → "추천" 배지 표시

## AI 세무 상담 의도 감지 (Flow 2)
- chat-ai 엣지 함수에서 세무 전문 상담 키워드 패턴 13개 감지
- 감지 시 tax_consultations 테이블에 자동 생성 (1시간 중복 방지)
- 담당 세무사가 있으면 accountant_id 자동 연결
- AI 응답에 "세무사 탭에서 확인 가능" 안내 포함
- 프론트엔드에서 toast로 상담 생성 알림 + 세무사 탭 이동 액션

## 신고 탭 (Flow 3)
- FilingTab 컴포넌트: D-day 표시, 데이터 준비 체크리스트(4항목), Progress bar
- prepared_data JSON 내 sales_ready/purchase_ready/invoice_ready/card_ready 플래그 기반
- 세무사 검토 노트(review_notes) 표시 지원
