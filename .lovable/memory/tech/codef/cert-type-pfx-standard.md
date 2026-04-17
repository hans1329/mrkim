# Memory: tech/codef/cert-type-pfx-standard
Updated: now

CODEF 공동인증서 연동 시 `certType` 파라미터 규격:
- **PFX/P12 통합 파일**: `certFile` + `certType: "pfx"` 명시 필수
- **DER+KEY 분리 파일**: `derFile` + `keyFile` 전송, `certType` **생략** (필드 자체를 보내지 않음)

⚠️ DER+KEY 모드에서 `certType: "1"`을 명시하면 법인(clientType: B) 연동 시 CF-04000/CF-00007 "요청 파라미터가 올바르지 않습니다" 에러 발생함. 은행/카드/홈택스 모든 함수에서 동일하게 certType 생략 처리 필수. 인증서 비밀번호 필드명은 `password`로 통일.
