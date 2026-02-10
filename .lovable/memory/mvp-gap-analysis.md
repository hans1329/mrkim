# Memory: mvp/gap-analysis
Updated: 2026-02-10

## MVP 기능 구현 현황 분석

### 🟢 구현 완료

#### A. 계정/온보딩
- [x] 회원가입/로그인 (Supabase Auth)
- [x] 온보딩 위저드 (환영→국세청→카드→계좌→완료)
- [x] 연동 진행률 표시 (상태 인식 라벨: "연동 시작하기"/"이어서 연동하기")
- [x] 사업자번호 자동 추출 (홈택스 연동 시 CODEF 응답에서 파싱)

#### B. 데이터 연동 플랫폼
- [x] B0-1. 커넥터 레지스트리 (connectors + connector_instances 테이블)
- [x] B0-3. 상태 모델 (pending/connected/failed/expired/disconnected)
- [x] B0-4. 수집 잡 (sync_jobs 테이블 + pg_cron 6시간 주기)
- [x] B0-5. 원천 데이터 저장 (transactions, tax_invoices 테이블 정규화)
- [x] B0-6. 수집/에러 로그 (sync_logs 테이블)
- [x] B1-1. 홈택스 세금계산서 조회 (codef-tax-invoice)
- [x] B1-3. 은행 계좌 거래내역 (codef-bank)
- [x] B1-6. 카드 사용 내역 (codef-card)
- [x] 동기화 오케스트레이터 (sync-orchestrator Edge Function)
- [x] pg_cron 자동 스케줄링 (6시간 주기)
- [x] 연동 완료 시 즉시 동기화 트리거 (connectService → sync-orchestrator 호출)

#### C. 대시보드
- [x] 오늘/이번 주 요약 카드 (실데이터 기반)
- [x] 리마인더 (오늘의 할 일 카드)
- [x] 긴급 알림 배너
- [x] 연동 부족 시 안내 UX (목업 데이터 + 연동 유도 CTA)
- [x] 상태별 점진적 실데이터 노출

#### D. AI Chat
- [x] 웹 채팅 UI (PC 사이드패널 + 모바일)
- [x] 서비스 안내 챗봇 (비로그인, service-chat)
- [x] 6대 데이터 소스 실시간 조회
- [x] 키워드 기반 의도 분류기 (classifyByKeyword)
- [x] 기간 인식 (오늘/이번주/이번달/지난달 등)
- [x] 음성 대화 (Scribe STT → chat-ai → ElevenLabs TTS)
- [x] 대화 히스토리 저장 (chat_messages)
- [x] voiceMode 구어체 응답

#### E. 모바일
- [x] Capacitor 설정
- [x] 하단 네비게이션 + safe-area
- [x] 음성 UI (VoiceOverlay)
- [x] 알림 페이지

#### F. AI 엔진 모듈
- [x] 거래 자동 분류기 (60개+ 키워드 → 12개 카테고리)
- [x] 실데이터 기반 알림 생성기 (세금 D-day, 미분류 거래, 지출 증감)
- [x] 종합소득세 간이 계산기 (8단계 세율표)
- [x] AI 인사이트 리포트 (Gemini 2.5 Flash, 24시간 캐싱)
- [x] 직원 평판 관리 (칭찬하기)
- [x] 공유 응답 엔진 (_shared/response-engine.ts)

#### G. 리포트
- [x] 매출/지출/직원/세금계산서/AI 분석 5개 탭
- [x] URL 딥링크 (?tab=...)
- [x] 실데이터 기반 차트/통계

#### H. 관리자
- [x] 관리자 콘솔 (사용자/연동/로그 조회)
- [x] 공지사항 관리
- [x] FAQ 관리
- [x] 피드백 관리
- [x] API 사용량 모니터링
- [x] 푸시 캠페인 관리
- [x] 사이트 설정

---

### 🟡 부분 구현 (확장 필요)

#### B. 데이터 연동
- [ ] B1-2. 홈택스 현금영수증 조회
- [ ] 추가 커넥터: 인터넷지로, 여신금융협회, 쇼핑몰, 배달앱, PG사

#### C. 대시보드
- [ ] 데이터 신뢰 표시 (출처/갱신시각 라벨)

#### D. AI Chat
- [ ] 질문 카탈로그 확장 (현재 4개 퀵프롬프트)
- [ ] 답변 근거 표시 (기간/데이터 출처/갱신시각)

#### E. 모바일
- [ ] 알림 센터 기능 강화 (읽음 처리, 그룹핑)

#### F. 보안
- [ ] 2FA 구현 (현재 UI 스위치만 존재)
- [ ] 토큰 암호화/마스킹 강화

---

### 🔴 핵심 미구현

#### B. 데이터 연동
- [ ] Codef 정식 전환 (실 ConnectedId 생성 API)
- [ ] B1-4. 인터넷지로 (고지서 조회/납부)
- [ ] B1-5. 여신금융협회 (카드 매출)
- [ ] B1-7. 쇼핑몰/올라 (매출)
- [ ] B1-8. 배달앱 (배민/쿠팡이츠/요기요)
- [ ] B1-9. PG사 (매출)

#### E. 모바일
- [ ] 푸시 알림 (디바이스 토큰 등록)

#### F. 자금 집행
- [ ] 하이픈 연동 (자동이체 자금 집행)
- [ ] 하이픈 급여 자동 집행

#### G. 운영
- [ ] Dev/Prod 환경 분리
- [ ] 일일 경영 브리핑 (자동 발송)
- [ ] 전화 알림 (Twilio)

---

## Edge Functions 현황 (13개 활성)

| 함수명 | 역할 | 상태 |
|--------|------|------|
| chat-ai | 메인 AI 채팅 + 6대 데이터 소스 | ✅ 완료 |
| service-chat | 서비스 안내 (비로그인) | ✅ 완료 |
| generate-insights | AI 인사이트 리포트 | ✅ 완료 |
| elevenlabs-scribe-token | STT 토큰 발급 | ✅ 완료 |
| elevenlabs-tts | TTS 변환 | ✅ 완료 |
| elevenlabs-conversation-token | Conversational AI (예비) | 🔵 예비 |
| codef-auth | Codef 인증 토큰 | ✅ 완료 |
| codef-bank | 은행 거래내역 | ✅ 완료 |
| codef-card | 카드 거래내역 | ✅ 완료 |
| codef-hometax | 홈택스 연동 | ✅ 완료 |
| codef-tax-invoice | 세금계산서 동기화 | ✅ 완료 |
| sync-orchestrator | 자동 동기화 (pg_cron 6h) | ✅ 완료 |
| _shared/response-engine.ts | 공유 모듈 | ✅ 완료 |

---

## 구현 우선순위 제안

### Phase 1 (다음 단계)
1. Codef 정식 전환 (실 ConnectedId)
2. 하이픈 연동 (자동이체 집행)
3. 푸시 알림 구현

### Phase 2
1. 데이터 신뢰 표시 (출처/갱신시각)
2. 답변 근거 표시
3. 일일 경영 브리핑

### Phase 3
1. 추가 커넥터 (배달앱, PG사, 쇼핑몰)
2. 전화 알림 (Twilio)
3. 2FA 구현
