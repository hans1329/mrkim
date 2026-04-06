# Memory: ui/onboarding/joint-certificate-ux-v2
Updated: now

공동인증서 업로드는 두 가지 방식을 지원함:
1. **PFX/P12 통합 파일**: 단일 파일 업로드, `certType: 'pfx'` 파라미터 사용
2. **DER+KEY 분리 파일**: signCert.der 파일 업로드 시 자동으로 signPri.key 업로드 영역이 나타남. 이 경우 `certType` 파라미터를 생략하고 `certFile`(der)과 `keyFile`(key)을 별도로 전송

은행/카드/홈택스 3개 연동 플로우 모두 동일 패턴 적용. 엣지 함수(codef-bank, codef-card, codef-hometax)에서 `keyFile` 존재 여부로 DER/PFX 모드를 자동 판별함.

UI는 certFile 선택 후 확장자가 .der이면 key 파일 업로드 영역이 조건부 렌더링되며, PFX 선택 시 key 파일 상태가 초기화됨. 파일이 등록되기 전에는 비밀번호 입력창을 비활성화하여 오입력을 방지함.
