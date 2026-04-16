---
name: CODEF Joint Certificate Technical Spec
description: CODEF API 공동인증서 연동 시 기관 공통 규격 (loginType, 파일 필드, 암호화)
type: feature
---

## CODEF 계정 생성 공통 규격 (은행/카드/홈택스 동일)

### loginType
- `"0"` = 공동인증서 (은행/카드/홈택스 **모두 동일**)
- `"1"` = ID/PW (은행 전용)
- 인증서 로그인 시 `id` 필드 불필요

### 인증서 파일 필드 (기관 공통)
1) PFX 방식: `certFile` + `certType: "pfx"`
2) DER+KEY 방식: `derFile` + `keyFile` + `certType: "1"`

### clientType
- `"P"` = 개인사업자 (기본값)
- `"B"` = 법인사업자

### RSA 암호화
- 공개키는 `/v1/common/public-key` API에서 **동적으로** 조회 (실패 시 env 폴백)
- `TextEncoder().encode()` 기반 UTF-8 바이트 변환 후 PKCS#1 v1.5 암호화
- 모든 비밀번호 필드는 암호화 필수

### businessType별 organization
- `"BK"` (은행): 기관별 코드 (0004, 0088 등)
- `"CD"` (카드): 기관별 코드
- `"NT"` (홈택스): `"0002"` (전자세금계산서)
