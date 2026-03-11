# Memory: features/tax-accountant/integration-architecture
Updated: now

## DB 스키마
4개 테이블 생성 완료:
1. `tax_accountants` - 세무사 마스터 (이름, 이메일, 전문분야, 업종, 지역)
2. `tax_accountant_assignments` - 사장님↔세무사 배정 (user_id+accountant_id unique)
3. `tax_consultations` - 비정기 상담 (질문, AI 사전답변, 데이터패키지, 세무사 응답)
4. `tax_filing_tasks` - 정기 신고 (신고유형, 기간, 마감일, 준비데이터, 검토노트)

## 프론트엔드
- `/tax-accountant` 페이지: 매칭/상담/신고 3탭 구성
- `useTaxAccountant` 훅: 세무사 목록, 배정, 상담, 신고 CRUD
- 더보기 메뉴에 "세무사" 항목 추가

## 이메일 전달 (MVP)
- Resend를 사용하여 세무사에게 정리된 재무 데이터 이메일 발송
- `send-tax-consultation` Edge Function으로 데이터 패키징 + 발송
- 데이터 패키지: 사업 정보, 매출/매입 요약, 세금계산서, 거래 분류, 배달앱, 직원 현황

## AI 연동 (Flow 2)
- response-engine에서 '전문 상담 필요' 판단 시 tax_consultations 생성
- 관련 데이터 자동 수집하여 data_package에 JSON으로 저장
- Edge Function이 data_package를 이메일 본문으로 변환하여 세무사에게 전달
