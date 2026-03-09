/**
 * 김비서 응답 엔진 공통 모듈
 * 텍스트 채팅, 음성 대화, 서비스 안내에서 공통으로 사용
 */

// ============ 타입 정의 ============

export interface IntentResult {
  intent: string;
  confidence: number;
  requiresData: boolean;
  dataSources: string[];
  timePeriod?: {
    type: string;
    startDate?: string;
    endDate?: string;
  };
  rejectionReason?: string;
}

export interface ConnectionStatus {
  hometax: boolean;
  card: boolean;
  bank: boolean;
  employee: boolean;
}

export interface ResponseContext {
  userId?: string;
  secretaryName: string;
  secretaryTone: "polite" | "friendly" | "cute";
  channel: "text" | "voice" | "service";
}

// ============ 유틸리티 함수 ============

export function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function parseRetryAfterSeconds(geminiErrorJson: any): number | null {
  const details = geminiErrorJson?.error?.details;
  if (!Array.isArray(details)) return null;

  const retryInfo = details.find((d: any) =>
    typeof d?.["@type"] === "string" && d["@type"].includes("RetryInfo")
  );
  const retryDelay = retryInfo?.retryDelay;
  if (typeof retryDelay !== "string") return null;

  const m = retryDelay.match(/^(\d+(?:\.\d+)?)s$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.ceil(n));
}

// ============ 의도 분류 Tool Calling 스키마 ============

export const classifyIntentTool = {
  functionDeclarations: [{
    name: "classify_intent",
    description: "사용자 메시지의 의도를 분류하고 필요한 데이터를 판단합니다",
    parameters: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          enum: [
            "sales_inquiry",        // 매출 조회
            "expense_inquiry",      // 지출 조회
            "tax_question",         // 세금 관련
            "payroll_inquiry",      // 급여/인사 조회
            "employee_management",  // 인사 관리
            "transaction_classify", // 거래 분류
            "daily_briefing",       // 경영 브리핑
            "alert_check",          // 알림 확인
            "setting_change",       // 설정 변경
            "general_advice",       // 일반 조언 (데이터 불필요)
            "service_help",         // 서비스 사용법
            "self_introduction",    // 자기소개/인사
            "casual_chat",          // 일상 대화 (맛집, 날씨, 상식 등 모든 주제)
          ],
          description: "분류된 사용자 의도"
        },
        confidence: {
          type: "number",
          description: "의도 분류 신뢰도 (0.0 ~ 1.0)"
        },
        requires_data: {
          type: "boolean",
          description: "외부 데이터(카드/계좌/홈택스) 조회가 필요한지 여부"
        },
        data_sources: {
          type: "array",
          items: {
            type: "string",
            enum: ["card", "bank", "hometax", "employee", "none"]
          },
          description: "필요한 데이터 소스 목록"
        },
        time_period: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["today", "week", "month", "quarter", "year", "custom"] },
            start_date: { type: "string" },
            end_date: { type: "string" }
          },
          description: "조회 기간"
        },
      },
      required: ["intent", "confidence", "requires_data", "data_sources"]
    }
  }]
};

// ============ 말투 설정 ============

export const toneInstructions: Record<string, string> = {
  polite: `존댓말(합쇼체)을 사용하세요. "~입니다", "~습니다", "~하시겠습니까?" 형태의 격식체. 예: "오늘 매출은 234만원입니다." 정중하고 프로페셔널한 톤 유지.`,
  friendly: `친근한 해요체를 사용하세요. "~이에요", "~해요", "~할게요" 형태의 부드러운 말투. 예: "오늘 매출 234만원이에요!" 가까운 동료처럼 편안하지만 존중하는 톤.`,
  cute: `귀엽고 애교있는 말투를 사용하세요. "~이에용", "~했어용", "~해드릴게용~" 형태의 귀여운 어미. 예: "오늘 매출 234만원이에용~ 🎉" 밝고 귀여운 에너지로 응원하는 톤, 이모지 적극 활용.`,
};

// ============ 채널별 시스템 프롬프트 ============

export function buildSystemPrompt(context: ResponseContext): string {
  const { secretaryName, secretaryTone, channel } = context;
  const toneInstruction = toneInstructions[secretaryTone] || toneInstructions.polite;

  const basePrompt = `당신은 ${secretaryName}입니다. 소상공인의 AI 비서입니다.

${toneInstruction}

## 호칭 규칙 (필수)
- 상대방을 항상 **"대표님"**이라고 부르세요
- "고객님", "이용자님", "회원님", "사장님" 등의 호칭은 절대 사용하지 마세요

## 성격
- 따뜻하고 친근한 비서
- 대표님을 진심으로 응원하는 마음
- 가끔 이모지를 적절히 사용해서 친근함 표현

## 자기소개 (self_introduction 의도일 때)
"안녕하세요!" 또는 "넌 누구야?" 같은 질문에는:
- 자연스럽게 자기소개 ("안녕하세요, ${secretaryName}예요! 대표님의 비서로 일하고 있어요 😊")
- 할 수 있는 일 간단히 소개 (매출 확인, 세금 안내, 직원 관리, 일상 대화 등)

## 대화 범위
- 대표님이 물어보는 모든 질문에 성실하게 답변하세요
- 경영, 세금, 일상 잡담, 맛집 추천, 건강, 고민 상담, 일반 상식 등 자유롭게 답변

## 금액 표현 규칙
- 금액은 만원 단위까지만 표현하세요 (예: 1,234,567원 → "약 123만원", 56,789,000원 → "약 5,679만원")
- 1만원 미만은 "약 X천원"으로 표현 (예: 8,500원 → "약 9천원")
- 정확한 원단위 숫자는 사용하지 마세요

## 주의사항
- 구체적인 금액(매출, 지출, 세금 등)을 묻는 질문에는 가짜 숫자를 만들지 마세요
- 실제 데이터가 필요한 경우 "데이터 연동이 필요합니다"라고 안내하세요
- 불법 행위 조장, 혐오 표현만 정중히 거절`;

  // 채널별 추가 지침
  if (channel === "voice") {
    return `${basePrompt}

## 음성 대화 특별 지침
- 짧고 명확하게 응답 (2-3문장 권장)
- 복잡한 숫자는 읽기 쉽게 표현 ("백이십삼만원" → "약 123만원")
- 마크다운 문법 사용 금지 (음성으로 읽히므로)
- 목록 대신 자연스러운 문장으로 표현`;
  }

  if (channel === "service") {
    return `${basePrompt}

## 서비스 안내 특별 지침
- 김비서 서비스에 대한 설명에 집중
- 가입/연동 방법 상세히 안내
- 요금제, 기능 소개 등 서비스 관련 질문에 응답
- 개인 사업 데이터 관련 질문은 "로그인 후 이용 가능"으로 안내`;
  }

  // 기본 텍스트 채널
  return `${basePrompt}

응답은 마크다운 형식으로 간결하게 작성하세요.`;
}

// ============ 연동 상태 확인 ============

export async function checkConnectionStatus(
  userId: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  authHeader: string
): Promise<ConnectionStatus> {
  const defaultStatus: ConnectionStatus = {
    hometax: false,
    card: false,
    bank: false,
    employee: false
  };

  if (!userId || !supabaseUrl || !supabaseAnonKey) {
    return defaultStatus;
  }

  try {
    // Supabase client는 Deno 환경에서 import 필요하므로 동적으로 생성
    // 호출하는 edge function에서 profile 데이터를 전달받는 방식으로 변경
    // 이 함수는 이제 deprecated - edge function에서 직접 조회하도록 수정됨
    return defaultStatus;
  } catch (error) {
    console.error("checkConnectionStatus error:", error);
    return defaultStatus;
  }
}

export function getMissingDataSources(
  requiredSources: string[],
  connectionStatus: ConnectionStatus
): string[] {
  const missing: string[] = [];
  
  for (const source of requiredSources) {
    if (source === "none") continue;
    
    if (source === "hometax" && !connectionStatus.hometax) missing.push("홈택스");
    if (source === "card" && !connectionStatus.card) missing.push("카드사");
    if (source === "bank" && !connectionStatus.bank) missing.push("은행 계좌");
    if (source === "employee" && !connectionStatus.employee) missing.push("직원 정보");
  }
  
  return missing;
}

// ============ 연동 필요 응답 생성 ============

export function buildConnectionRequiredResponse(
  secretaryName: string,
  missingSources: string[],
  intent: string,
  channel: "text" | "voice" | "service"
): string {
  const sourceList = missingSources.join(", ");
  
  const intentDescriptions: Record<string, string> = {
    sales_inquiry: "매출 정보",
    expense_inquiry: "지출 현황",
    tax_question: "세금 관련 정확한 금액",
    payroll_inquiry: "급여 현황",
    daily_briefing: "경영 현황 브리핑"
  };
  
  const dataType = intentDescriptions[intent] || "요청하신 정보";

  // 음성 채널용 짧은 응답
  if (channel === "voice") {
    return `사장님, ${dataType}를 확인하려면 먼저 ${sourceList} 연동이 필요해요. 설정 메뉴에서 데이터 연결을 진행해주세요.`;
  }
  
  // 텍스트 채널용 상세 응답
  return `사장님, **${dataType}**를 확인하려면 먼저 데이터 연동이 필요합니다.

📋 **필요한 연동 항목**: ${sourceList}

연동 방법:
1. **설정 > 데이터 연결**로 이동
2. 필요한 서비스 선택 후 인증 진행
3. 연동 완료 후 실시간 데이터 확인 가능

💡 연동은 약 1분이면 완료됩니다. 지금 바로 진행하시겠어요?`;
}

// ============ 범위 외 응답 생성 (불법/혐오만 해당) ============

export function buildOutOfScopeResponse(channel: "text" | "voice" | "service"): string {
  if (channel === "voice") {
    return "사장님, 그 부분은 제가 도움을 드리기 어려워요. 다른 궁금한 거 있으시면 편하게 말씀해주세요!";
  }

  return `사장님, 그 부분은 제가 도움을 드리기 어려워요 😅

다른 궁금한 점이 있으시면 편하게 말씀해주세요! 💬`;
}

// ============ 429 에러 처리 ============

export function buildGemini429Message(geminiErrorJson: any): { message: string; retryAfterSeconds: number | null } {
  const retryAfterSeconds = parseRetryAfterSeconds(geminiErrorJson);

  const raw = geminiErrorJson?.error?.message;
  const rawMsg = typeof raw === "string" ? raw : "";
  const rawLower = rawMsg.toLowerCase();

  const status = geminiErrorJson?.error?.status;
  const statusStr = typeof status === "string" ? status : "";

  const details = geminiErrorJson?.error?.details;
  const hasQuotaFailure = Array.isArray(details)
    ? details.some((d: any) => typeof d?.["@type"] === "string" && d["@type"].includes("QuotaFailure"))
    : false;

  const isQuotaZeroOrExceeded =
    statusStr === "RESOURCE_EXHAUSTED" ||
    hasQuotaFailure ||
    rawLower.includes("quota exceeded") ||
    rawLower.includes("current quota") ||
    rawLower.includes("resource exhausted") ||
    rawLower.includes("limit: 0");

  const base = isQuotaZeroOrExceeded
    ? "Gemini API 리소스(Quota)가 소진되었거나 0으로 설정되어 있습니다. 이 API 키가 속한 Google 프로젝트의 Billing/Quota/Rate limit을 확인해주세요."
    : "Gemini API 요청이 일시적으로 제한되었습니다(429). 잠시 후 다시 시도해주세요.";

  const suffix = retryAfterSeconds != null ? ` (재시도 권장: 약 ${retryAfterSeconds}초 후)` : "";
  return { message: base + suffix, retryAfterSeconds };
}
