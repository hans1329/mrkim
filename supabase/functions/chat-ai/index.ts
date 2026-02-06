import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ============ 유틸리티 함수들 ============

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseRetryAfterSeconds(geminiErrorJson: any): number | null {
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

function buildGemini429Message(geminiErrorJson: any): { message: string; retryAfterSeconds: number | null } {
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

// ============ 연동 상태 확인 ============

interface ConnectionStatus {
  hometax: boolean;
  card: boolean;
  bank: boolean;
  employee: boolean;
}

async function checkConnectionStatus(userId: string, authHeader: string): Promise<ConnectionStatus> {
  const defaultStatus: ConnectionStatus = {
    hometax: false,
    card: false,
    bank: false,
    employee: false
  };

  if (!userId) return defaultStatus;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase credentials");
      return defaultStatus;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("hometax_connected, card_connected, account_connected")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !profile) {
      console.error("Failed to fetch profile:", error);
      return defaultStatus;
    }

    return {
      hometax: profile.hometax_connected ?? false,
      card: profile.card_connected ?? false,
      bank: profile.account_connected ?? false,
      employee: false
    };
  } catch (error) {
    console.error("checkConnectionStatus error:", error);
    return defaultStatus;
  }
}

// ============ 데이터 조회 함수들 ============

interface TransactionSummary {
  totalExpense: number;
  totalIncome: number;
  expenseCount: number;
  incomeCount: number;
  topCategories: { category: string; amount: number; count: number }[];
  recentTransactions: { description: string; amount: number; date: string; category: string | null }[];
  periodLabel: string;
}

function calculateDateRange(timePeriod?: { type: string; startDate?: string; endDate?: string }): {
  startDate: string;
  endDate: string;
  label: string;
} {
  const now = new Date();
  const periodType = timePeriod?.type || "month";

  switch (periodType) {
    case "today": {
      const today = now.toISOString().split('T')[0];
      return { startDate: today, endDate: today, label: "오늘" };
    }
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().split('T')[0];
      return { startDate: yStr, endDate: yStr, label: "어제" };
    }
    case "week": {
      const startOfWeek = new Date(now);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
        label: "이번 주"
      };
    }
    case "last_month": {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: lastMonth.toISOString().split('T')[0],
        endDate: lastMonthEnd.toISOString().split('T')[0],
        label: "지난달"
      };
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), q * 3, 1);
      const endOfQuarter = new Date(now.getFullYear(), q * 3 + 3, 0);
      return {
        startDate: startOfQuarter.toISOString().split('T')[0],
        endDate: endOfQuarter.toISOString().split('T')[0],
        label: "이번 분기"
      };
    }
    case "year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      return {
        startDate: startOfYear.toISOString().split('T')[0],
        endDate: endOfYear.toISOString().split('T')[0],
        label: "올해"
      };
    }
    case "custom": {
      if (timePeriod?.startDate && timePeriod?.endDate) {
        return {
          startDate: timePeriod.startDate,
          endDate: timePeriod.endDate,
          label: `${timePeriod.startDate} ~ ${timePeriod.endDate}`
        };
      }
      // fallback to this month
    }
    case "month":
    default: {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        endDate: endOfMonth.toISOString().split('T')[0],
        label: "이번 달"
      };
    }
  }
}

async function fetchTransactionData(
  userId: string,
  authHeader: string,
  timePeriod?: { type: string; startDate?: string; endDate?: string }
): Promise<TransactionSummary | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !userId) {
      return null;
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { startDate, endDate, label: periodLabel } = calculateDateRange(timePeriod);

    console.log(`Fetching transactions: ${startDate} ~ ${endDate} (${periodLabel})`);

    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("id, amount, type, category, description, transaction_date")
      .eq("user_id", userId)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate)
      .order("transaction_date", { ascending: false });

    if (error || !transactions) {
      console.error("Failed to fetch transactions:", error);
      return null;
    }

    console.log(`Found ${transactions.length} transactions for period ${periodLabel}`);

    let totalExpense = 0;
    let totalIncome = 0;
    let expenseCount = 0;
    let incomeCount = 0;
    const categoryMap = new Map<string, { amount: number; count: number }>();

    for (const tx of transactions) {
      if (tx.type === "expense") {
        totalExpense += tx.amount;
        expenseCount++;
      } else if (tx.type === "income") {
        totalIncome += tx.amount;
        incomeCount++;
      }

      const cat = tx.category || "미분류";
      const existing = categoryMap.get(cat) || { amount: 0, count: 0 };
      categoryMap.set(cat, {
        amount: existing.amount + tx.amount,
        count: existing.count + 1
      });
    }

    const topCategories = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const recentTransactions = transactions.slice(0, 5).map(tx => ({
      description: tx.description,
      amount: tx.amount,
      date: tx.transaction_date,
      category: tx.category
    }));

    return {
      totalExpense,
      totalIncome,
      expenseCount,
      incomeCount,
      topCategories,
      recentTransactions,
      periodLabel
    };
  } catch (error) {
    console.error("fetchTransactionData error:", error);
    return null;
  }
}

function formatDataForPrompt(data: TransactionSummary, periodLabel: string): string {
  const formatAmount = (n: number) => n.toLocaleString("ko-KR");

  let prompt = `\n\n## 📊 실시간 데이터 (${periodLabel} 기준)\n`;

  prompt += `- **총 지출**: ${formatAmount(data.totalExpense)}원 (${data.expenseCount}건)\n`;
  prompt += `- **총 수입**: ${formatAmount(data.totalIncome)}원 (${data.incomeCount}건)\n`;

  if (data.expenseCount === 0 && data.incomeCount === 0) {
    prompt += `- 해당 기간에 거래 내역이 없습니다.\n`;
  }

  if (data.topCategories.length > 0) {
    prompt += `\n### 카테고리별 지출\n`;
    for (const cat of data.topCategories) {
      prompt += `- ${cat.category}: ${formatAmount(cat.amount)}원 (${cat.count}건)\n`;
    }
  }

  if (data.recentTransactions.length > 0) {
    prompt += `\n### 최근 거래\n`;
    for (const tx of data.recentTransactions) {
      prompt += `- ${tx.date}: ${tx.description} - ${formatAmount(tx.amount)}원 (${tx.category || "미분류"})\n`;
    }
  }

  prompt += `\n위 데이터를 기반으로 사장님의 질문에 정확하게 답변하세요. 숫자는 실제 데이터입니다.`;
  prompt += `\n만약 데이터가 0건이면 해당 기간에 기록이 없다고 안내하세요. "연동이 필요합니다"라고 말하지 마세요.`;

  return prompt;
}

// ============ 통합 분류+응답 (1회 호출) ============

const classifyAndRespondTool = {
  functionDeclarations: [{
    name: "classify_and_respond",
    description: "사용자 메시지의 의도를 분류하고 필요한 데이터 소스와 기간을 결정합니다",
    parameters: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          enum: [
            "sales_inquiry", "expense_inquiry", "tax_question",
            "payroll_inquiry", "employee_management", "transaction_classify",
            "daily_briefing", "alert_check", "setting_change",
            "general_advice", "service_help", "self_introduction",
            "casual_chat", "out_of_scope"
          ],
          description: "분류된 사용자 의도"
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
            type: { type: "string", enum: ["today", "yesterday", "week", "month", "last_month", "quarter", "year", "custom"] },
            start_date: { type: "string", description: "YYYY-MM-DD 형식" },
            end_date: { type: "string", description: "YYYY-MM-DD 형식" }
          },
          description: "조회 기간"
        }
      },
      required: ["intent", "requires_data", "data_sources"]
    }
  }]
};

interface IntentResult {
  intent: string;
  requiresData: boolean;
  dataSources: string[];
  timePeriod?: { type: string; startDate?: string; endDate?: string };
}

async function classifyAndRespond(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  secretaryName: string,
  geminiApiKey: string,
  dataContext?: string
): Promise<{ intent: IntentResult | null; response: string }> {
  // 시스템 프롬프트 + 데이터 컨텍스트 결합
  const fullSystemPrompt = dataContext
    ? systemPrompt + dataContext
    : systemPrompt;

  const geminiMessages = messages.map((msg) => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }],
  }));

  // 첫 번째 시도: Tool calling으로 의도 분류 + 자연어 응답을 한 번에 시도
  // 데이터 컨텍스트가 이미 있으면 Tool calling 없이 바로 응답
  if (dataContext) {
    // 이미 데이터가 있으면 바로 응답 생성
    const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: fullSystemPrompt }] },
          { role: "model", parts: [{ text: `네, 알겠습니다. 저는 ${secretaryName}입니다. 사장님의 사업을 도와드리겠습니다.` }] },
          ...geminiMessages,
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw { status: response.status, body: errorText };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다, 응답을 생성하지 못했습니다.";
    return { intent: null, response: text };
  }

  // 데이터가 없으면: Tool calling으로 의도 분류 시도
  const classificationPrompt = `## 역할
당신은 사용자 메시지의 의도를 분류하는 분석기입니다. classify_and_respond 도구를 호출해주세요.

## 의도 분류 기준
- sales_inquiry: 매출, 수입, 판매 관련 질문
- expense_inquiry: 지출, 비용 관련 질문
- tax_question: 세금 관련 질문
- payroll_inquiry: 급여, 인건비 조회
- employee_management: 직원 등록/관리
- transaction_classify: 거래 분류 요청
- daily_briefing: 경영 현황 요약 (예: "오늘 현황 알려줘", "브리핑 해줘")
- alert_check: 할 일, 알림 확인
- setting_change: 설정 변경
- general_advice: 일반 사업 조언
- service_help: 서비스 사용법
- self_introduction: 자기소개/인사 (예: "넌 누구야?", "안녕")
- casual_chat: 일상 대화 (예: "심심해", "힘들다")
- out_of_scope: 위험/부적절 요청만

## time_period 기준
- today: 오늘 / yesterday: 어제 / week: 이번 주
- month: 이번 달(기본) / last_month: 지난달 / quarter: 이번 분기 / year: 올해

## requires_data가 true인 의도
sales_inquiry, expense_inquiry, tax_question, payroll_inquiry, daily_briefing`;

  const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: classificationPrompt }] },
        { role: "model", parts: [{ text: "네, 사용자 메시지를 분석하여 classify_and_respond 도구를 호출하겠습니다." }] },
        ...geminiMessages,
      ],
      tools: [classifyAndRespondTool],
      toolConfig: {
        functionCallingConfig: {
          mode: "ANY",
          allowedFunctionNames: ["classify_and_respond"]
        }
      }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw { status: response.status, body: errorText };
  }

  const data = await response.json();
  const functionCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;

  if (functionCall?.name === "classify_and_respond") {
    const args = functionCall.args;
    const intent: IntentResult = {
      intent: args.intent || "general_advice",
      requiresData: args.requires_data ?? false,
      dataSources: args.data_sources || ["none"],
      timePeriod: args.time_period ? {
        type: args.time_period.type || "month",
        startDate: args.time_period.start_date,
        endDate: args.time_period.end_date
      } : undefined
    };

    // 데이터가 필요없는 의도면 바로 응답 생성 (같은 호출에서)
    if (!intent.requiresData) {
      // 별도 호출로 응답 생성
      const responseResult = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: fullSystemPrompt }] },
            { role: "model", parts: [{ text: `네, 알겠습니다. 저는 ${secretaryName}입니다. 사장님의 사업을 도와드리겠습니다.` }] },
            ...geminiMessages,
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          ],
        }),
      });

      if (!responseResult.ok) {
        const errorText = await responseResult.text();
        throw { status: responseResult.status, body: errorText };
      }

      const responseData = await responseResult.json();
      const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다, 응답을 생성하지 못했습니다.";
      return { intent, response: text };
    }

    // 데이터가 필요한 의도면 intent만 반환 (데이터 조회 후 재호출)
    return { intent, response: "" };
  }

  // Tool calling 실패 시 일반 응답으로 폴백
  const textPart = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (textPart) {
    return { intent: null, response: textPart };
  }

  return {
    intent: { intent: "general_advice", requiresData: false, dataSources: ["none"] },
    response: ""
  };
}

// ============ 연동 필요 응답 ============

function buildConnectionRequiredResponse(
  secretaryName: string,
  missingSources: string[],
  intent: string
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
  
  return `사장님, **${dataType}**를 확인하려면 먼저 데이터 연동이 필요합니다.

📋 **필요한 연동 항목**: ${sourceList}

연동 방법:
1. **설정 > 데이터 연결**로 이동
2. 필요한 서비스 선택 후 인증 진행
3. 연동 완료 후 실시간 데이터 확인 가능

💡 연동은 약 1분이면 완료됩니다. 지금 바로 진행하시겠어요?`;
}

function getMissingDataSources(
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

// ============ 메인 핸들러 ============

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { messages, secretaryName = "김비서", secretaryTone = "polite", secretaryGender = "female", userId } = await req.json();

    if (!messages || messages.length === 0) {
      throw new Error("Messages array is required");
    }

    // 말투 설정
    const toneInstructions: Record<string, string> = {
      polite: "존댓말을 사용하고 정중하게 응답하세요.",
      friendly: "친근하고 편안한 말투로 응답하세요. 반말을 사용해도 됩니다.",
      cute: "귀엽고 애교있는 말투로 응답하세요. '~요', '~해요' 등의 부드러운 어미를 사용하세요.",
    };

    const genderDescription = secretaryGender === "male" ? "남성" : "여성";

    const systemPrompt = `당신은 ${secretaryName}입니다. 소상공인의 AI 경영 비서입니다.
성별: ${genderDescription}

${toneInstructions[secretaryTone] || toneInstructions.polite}

## 성격
- 따뜻하고 친근한 비서
- 사장님을 진심으로 응원하는 마음
- 가끔 이모지를 적절히 사용해서 친근함 표현
- 딱딱하게 거절하지 않고 부드럽게 대화
- ${genderDescription} 비서로서 자연스럽게 행동

## 자기소개 (self_introduction 의도일 때)
"안녕하세요!" 또는 "넌 누구야?" 같은 질문에는:
- 자연스럽게 자기소개 ("안녕하세요, ${secretaryName}예요! 사장님의 경영 비서로 일하고 있어요 😊")
- 할 수 있는 일 간단히 소개 (매출 확인, 세금 안내, 직원 관리 등)
- 성별에 맞는 어투와 표현 사용

## 일상 대화 (casual_chat 의도일 때)
"심심해", "힘들다", "오늘 어때?", "맛집 추천해줘" 같은 일상 대화에는:
- 공감하며 친근하게 대화
- 자연스럽게 업무 관련 도움 제안
- 너무 딱딱하게 "업무 외"라고 거절하지 않기

## 답변 가능한 범위
- 세금 신고 일정, 부가세/종합소득세 일반 안내
- 인사/노무 관련 일반 질문
- 사업 운영 조언
- 서비스 사용법 안내
- 일상적인 가벼운 대화

## 주의사항
- 구체적인 금액을 묻는 질문에는 가짜 숫자를 만들지 마세요
- 불법적이거나 위험한 요청만 정중히 거절

응답은 마크다운 형식으로 간결하게 작성하세요.`;

    // 1단계: 의도 분류 (1회 호출)
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    console.log("Processing message:", lastUserMessage.substring(0, 50));

    const { intent, response: directResponse } = await classifyAndRespond(
      messages, systemPrompt, secretaryName, GEMINI_API_KEY
    );

    console.log("Intent result:", intent);

    // 의도 분류 실패 또는 데이터 불필요 → 바로 응답 반환
    if (!intent || !intent.requiresData) {
      // out_of_scope 처리
      if (intent?.intent === "out_of_scope") {
        const outOfScopeResponse = `사장님, 그건 제가 도와드리기 어려운 부분이에요 😅

혹시 다른 업무 관련해서 도움이 필요하시면 편하게 말씀해주세요! 
매출 확인, 세금 안내, 직원 관리 등 경영에 필요한 건 뭐든 도와드릴게요. 💼`;
        
        return new Response(
          JSON.stringify({ response: outOfScopeResponse, intent }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ response: directResponse, intent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2단계: 데이터 필요 → 연동 상태 확인 + 데이터 조회 + 응답 생성 (1회 추가 호출)
    const authHeader = req.headers.get("Authorization") || "";
    
    const connectionStatus = await checkConnectionStatus(userId, authHeader);
    const missingSources = getMissingDataSources(intent.dataSources, connectionStatus);
    
    if (missingSources.length > 0) {
      const connectionResponse = buildConnectionRequiredResponse(
        secretaryName,
        missingSources,
        intent.intent
      );
      
      return new Response(
        JSON.stringify({ response: connectionResponse, intent, requiresConnection: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 데이터 조회
    console.log("Fetching data for intent:", intent.intent, "period:", intent.timePeriod);
    const transactionData = await fetchTransactionData(userId, authHeader, intent.timePeriod);

    if (transactionData) {
      console.log("Transaction data:", {
        totalExpense: transactionData.totalExpense,
        totalIncome: transactionData.totalIncome,
        expenseCount: transactionData.expenseCount,
        periodLabel: transactionData.periodLabel
      });

      const dataContext = formatDataForPrompt(transactionData, transactionData.periodLabel);

      // 데이터를 포함한 시스템 프롬프트로 1회 응답 생성
      const dataSystemPrompt = `당신은 ${secretaryName}입니다. 소상공인의 AI 경영 비서입니다.
성별: ${genderDescription}

${toneInstructions[secretaryTone] || toneInstructions.polite}

## 중요 지침
- 아래 제공된 실제 데이터를 기반으로 정확한 숫자를 사용해 답변하세요.
- 데이터에 없는 정보는 추측하지 마세요.
- 데이터가 0건이면 "해당 기간에 기록이 없습니다"라고 안내하세요.
- "연동이 필요합니다" 또는 "데이터 연동"이라는 말을 하지 마세요 (이미 연동된 상태입니다).
- 친근하고 간결하게 핵심을 전달하세요.
- 필요시 개선 조언도 함께 제공하세요.`;

      const { response: dataResponse } = await classifyAndRespond(
        messages, dataSystemPrompt, secretaryName, GEMINI_API_KEY, dataContext
      );
      
      return new Response(
        JSON.stringify({ response: dataResponse, intent, hasData: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 데이터 조회 실패 시 일반 응답
    const { response: fallbackResponse } = await classifyAndRespond(
      messages, systemPrompt, secretaryName, GEMINI_API_KEY
    );

    return new Response(
      JSON.stringify({ response: fallbackResponse, intent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    // 429 에러 특별 처리
    if (error?.status === 429) {
      const errorJson = safeJsonParse(error.body || "");
      const { message, retryAfterSeconds } = buildGemini429Message(errorJson);
      return new Response(
        JSON.stringify({
          error: message,
          code: "GEMINI_RATE_LIMIT",
          retry_after_seconds: retryAfterSeconds,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            ...(retryAfterSeconds != null ? { "Retry-After": String(retryAfterSeconds) } : {}),
          },
        }
      );
    }

    console.error("chat-ai error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
