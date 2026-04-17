// V2 메인 음성 인텐트 라우터
// UI 전환이 필요한 의도만 클라이언트에서 분기 처리하고,
// 그 외는 chat-ai (Gemini 툴콜링)로 위임한다.

export type VoiceIntent =
  | { kind: "dismiss" } // 그만/끊어/나중에/닫아 → 대화 UI 닫기
  | { kind: "employee_register" }
  | { kind: "onboarding_connect"; target?: "card" | "bank" | "hometax" | "delivery" }
  | { kind: "settings"; target?: "secretary" | "alert" | "profile" }
  | { kind: "system_toggle"; feature: "phone_alert" | "briefing"; enable: boolean }
  | { kind: "tax_consultation" }
  | { kind: "chat" }; // 기본값: AI 채팅으로 위임

const norm = (s: string) => s.toLowerCase().replace(/\s/g, "");
const has = (n: string, words: string[]) => words.some((w) => n.includes(norm(w)));

export function detectVoiceIntent(text: string): VoiceIntent {
  const n = norm(text);

  // 0) 종료/취소 (짧은 발화에서만 적용해 오탐 방지)
  if (n.length <= 12 && has(n, [
    "그만", "그만해", "그만하자", "끊어", "끊어줘", "꺼줘", "닫아", "닫아줘",
    "나중에", "나중에다시", "다음에", "됐어", "됬어", "괜찮아", "취소",
    "종료", "스톱", "정지", "중지", "마쳐"
  ])) {
    return { kind: "dismiss" };
  }

  // 1) 직원 등록
  if (has(n, ["직원 등록", "직원 추가", "사람 등록", "알바 등록", "알바 추가"])) {
    return { kind: "employee_register" };
  }

  // 2) 연동 / 온보딩
  if (has(n, ["연동", "연결", "등록할게", "붙여줘"])) {
    if (has(n, ["카드"])) return { kind: "onboarding_connect", target: "card" };
    if (has(n, ["은행", "계좌", "통장"])) return { kind: "onboarding_connect", target: "bank" };
    if (has(n, ["홈택스", "국세청", "세금계산서"])) return { kind: "onboarding_connect", target: "hometax" };
    if (has(n, ["배민", "배달", "쿠팡", "요기요"])) return { kind: "onboarding_connect", target: "delivery" };
    return { kind: "onboarding_connect" };
  }

  // 3) 시스템 설정
  if (has(n, ["비서 이름", "비서 목소리", "비서 설정", "보이스 변경"])) {
    return { kind: "settings", target: "secretary" };
  }
  if (has(n, ["알림 설정", "푸시 설정", "전화 알림"])) {
    return { kind: "settings", target: "alert" };
  }
  if (has(n, ["프로필 변경", "내 정보", "비밀번호 변경"])) {
    return { kind: "settings", target: "profile" };
  }

  // 4) 세무사 상담
  if (has(n, ["세무사한테", "세무사에게", "상담 요청", "세무 상담"])) {
    return { kind: "tax_consultation" };
  }

  // 5) 그 외: AI 채팅 (chat-ai 툴콜링이 매출/매입/배달 등 처리)
  return { kind: "chat" };
}
