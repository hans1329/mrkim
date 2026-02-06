# Memory: employee-sync-deduplication
Updated: 2026-02-06

## 직원 데이터 중복 처리 전략

홈택스 동기화 시 기존 수동 등록 직원과의 중복을 다음 로직으로 처리함:

### 중복 감지 기준
1. **external_id 일치**: 이미 연동된 직원으로 간주, 스킵
2. **이름 일치 + 재직 상태**: 사용자 확인 필요 (머지 다이얼로그 표시)
3. **일치 없음**: 자동으로 새 직원 추가

### 사용자 선택지
- **"같은 사람입니다"**: 기존 레코드에 홈택스 데이터 병합, `source: 'hometax'`로 변경
- **"다른 사람입니다"**: 동명이인으로 별도 레코드 생성
- **"건너뛰기"**: 이번 동기화에서 처리하지 않음

### 병합 시 데이터 우선순위
- `external_id`: 홈택스 값으로 설정 (필수)
- `source`: 'hometax'로 변경
- `monthly_salary`, `start_date`: 홈택스 값이 있으면 업데이트
- 기존 수동 입력 정보(department, memo 등): 유지

### 관련 컴포넌트
- `EmployeeMergeDialog.tsx`: 중복 확인 모달 UI
- `useEmployeeSync.ts`: 동기화 + 중복 처리 로직
- `useEmployees.ts`: `useMergeEmployee`, `useAddHometaxEmployee` 훅 추가
