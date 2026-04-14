# Memory: style/layout/overlap-prevention

디자인 시 요소 간 겹침(overlap) 방지 원칙:
1. 절대 위치(absolute/fixed) 요소는 반드시 주변 요소와의 간격을 계산하여 배치할 것. bottom 값은 아래쪽 콘텐츠(입력 필드, 텍스트 등) 높이를 고려해 충분한 여백을 확보.
2. 장식용 애니메이션(파동, 글로우 등)은 텍스트/인터랙티브 요소와 최소 16px 이상 간격 유지.
3. pointer-events-none인 장식 레이어도 시각적 겹침은 가독성을 해치므로 z-index와 위치를 분리할 것.
4. 하단 고정 영역(입력, 버튼 등) 위에 떠있는 요소는 해당 영역의 총 높이를 기준으로 bottom 오프셋을 설정.
