# Memory: style/button-text-guide
Updated: 2026-02-13

## 버튼 텍스트 크기 가이드

모바일(18px 기본 폰트) 환경에서 버튼 텍스트가 과도하게 크게 표시되는 것을 방지하기 위해, `buttonVariants` (src/components/ui/button.tsx) 베이스에 반응형 텍스트 크기를 적용함.

### 규칙
- **Base**: `text-xs md:text-sm` (모바일 13.5px / 데스크톱 14px 기준)
- 이 설정은 `buttonVariants` CVA에 기본 내장되어 있으므로, 개별 Button에 `text-sm`이나 `text-xs`를 별도로 지정할 필요 없음
- 버튼에 더 큰/작은 텍스트가 필요한 경우에만 className으로 오버라이드

### 적용 범위
- shadcn Button 컴포넌트를 사용하는 모든 버튼에 자동 적용
- 커스텀 버튼(`<button>`)은 수동으로 `text-xs md:text-sm` 적용 필요

### 주의사항
- 아이콘 전용 버튼(size="icon")은 텍스트가 없으므로 영향 없음
- 입력 필드(Input)의 텍스트 크기는 별도 가이드 참조
