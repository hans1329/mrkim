# Memory: tech/codef/joint-certificate-technical-spec
Updated: now

공동인증서 연동 시 CODEF API 규격에 따른 정밀한 필드 매핑을 적용함.

## 인증서 파일 형식
1) PFX 방식은 `certType: pfx`와 `certFile` 필드를 사용함.
2) 개별 파일 방식은 `certType: 1`과 함께 `reqCertFile/reqKeyFile` 필드를 사용하며, 은행 계좌 생성(`account/create`) 시에는 `derFile/keyFile` 필드를 사용함.

## clientType (개인/법인 분기)
- `clientType: "P"` — 개인사업자 (기본값)
- `clientType: "B"` — 법인사업자
- API 경로도 분기됨: `/v1/kr/bank/p/...` vs `/v1/kr/bank/b/...`, `/v1/kr/card/p/...` vs `/v1/kr/card/b/...`
- 프론트엔드 훅(`useAccountConnection`, `useCardConnection`)에서 `clientType` 파라미터를 받아 Edge Function에 전달함

## loginType
- 카드/홈택스는 `loginType: 0` (인증서), 은행은 `loginType: 0` (인증서) 또는 `loginType: 1` (ID/PW)

## 암호화
- 은행 연동은 `/v1/common/public-key` 엔드포인트에서 동적으로 공개키를 가져오며, RSA PKCS#1 v1.5 암호화 시 UTF-8 바이트 인코딩을 적용함.
- 홈택스 연동 시 빈 `id/password` 필드도 반드시 암호화하여 전송하며, 전화번호는 호출 전 국내 로컬 형식(010...)으로 변환함.
