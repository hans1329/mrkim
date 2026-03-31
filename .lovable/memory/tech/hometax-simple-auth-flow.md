# Memory: tech/hometax-simple-auth-flow
Updated: now

## 홈택스 간편인증 연동 구조

### 이전 문제
- 세금계산서 API를 `loginType: "3"` (공개 사업자번호 조회)로 호출하여 항상 0건 반환
- connectedId 없이 공개 API만 사용하여 실제 세금계산서 데이터 조회 불가

### 현재 구조 (간편인증 기반)
1. **사업자 조회**: `codef-hometax` → `action: undefined` → 사업자 상태 확인
2. **간편인증 등록**: `codef-hometax` → `action: "register"` → CODEF `/v1/account/create` 호출 (businessType: "NT", loginType: "5")
3. **2-way 인증 확인**: `codef-hometax` → `action: "confirm2Way"` → connectedId 발급
4. **세금계산서 동기화**: `sync-orchestrator` → `callCodefTaxInvoice()` → connectedId 기반 조회

### 간편인증 수단 (loginTypeLevel)
- 1: 카카오, 2: 삼성패스, 3: PASS (통신사), 4: 네이버, 5: 토스

### 온보딩 UI 플로우
`HometaxConnectionFlow.tsx` 7단계:
1. `input` → 사업자번호 입력
2. `verifying` → 조회 중
3. `confirmed` → 사업자 정보 확인 + "간편인증으로 세금계산서 연동" 또는 "건너뛰기"
4. `auth_select` → 간편인증 수단 선택 (카카오/네이버/PASS/토스)
5. `auth_waiting` → 2분 타이머 + "인증 완료 확인" 버튼
6. `auth_complete` → 인증 성공
7. connectedId를 `connectService(connectorId, connectedId)`로 저장
