# Memory: tech/codef/cert-type-pfx-standard
Updated: now

CODEF 공동인증서 연동 시 `certType` 파라미터가 핵심. PFX/P12 통합 파일 사용 시 반드시 `certType: "pfx"`를 명시해야 함. 미지정 시 CODEF는 DER+KEY 분리 파일(signCert.der + signPri.key)을 기대하여 "reqCertFile 또는 reqKeyFile 입력값 미입력" 에러 발생. 또한 인증서 비밀번호 필드명은 `password`로 통일 (certPassword가 아님). 홈택스/카드/은행 모두 동일 패턴 적용 완료.
