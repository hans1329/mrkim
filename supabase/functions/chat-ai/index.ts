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
    statusStr === "RESOURCE_EXHAUSTED" || hasQuotaFailure ||
    rawLower.includes("quota exceeded") || rawLower.includes("current quota") ||
    rawLower.includes("resource exhausted") || rawLower.includes("limit: 0");
  const base = isQuotaZeroOrExceeded
    ? "Gemini API 리소스(Quota)가 소진되었거나 0으로 설정되어 있습니다. 이 API 키가 속한 Google 프로젝트의 Billing/Quota/Rate limit을 확인해주세요."
    : "Gemini API 요청이 일시적으로 제한되었습니다(429). 잠시 후 다시 시도해주세요.";
  const suffix = retryAfterSeconds != null ? ` (재시도 권장: 약 ${retryAfterSeconds}초 후)` : "";
  return { message: base + suffix, retryAfterSeconds };
}

// ============ 공통 Gemini 호출 헬퍼 ============

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

const GENERATION_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

async function callGemini(
  geminiApiKey: string,
  contents: any[],
  options?: { tools?: any[]; toolConfig?: any }
): Promise<any> {
  const body: any = {
    contents,
    generationConfig: GENERATION_CONFIG,
    safetySettings: SAFETY_SETTINGS,
  };
  if (options?.tools) body.tools = options.tools;
  if (options?.toolConfig) body.toolConfig = options.toolConfig;

  const response = await fetch(`${GEMINI_API_URL}?key=${geminiApiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw { status: response.status, body: errorText };
  }

  return response.json();
}

// ============ 연동 상태 확인 ============

interface ConnectionStatus {
  hometax: boolean;
  card: boolean;
  bank: boolean;
  employee: boolean;
}

async function checkConnectionStatus(userId: string, authHeader: string): Promise<ConnectionStatus> {
  const defaultStatus: ConnectionStatus = { hometax: false, card: false, bank: false, employee: false };
  if (!userId) return defaultStatus;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey) return defaultStatus;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("hometax_connected, card_connected, account_connected")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !profile) return defaultStatus;

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
  startDate: string; endDate: string; label: string;
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
      return { startDate: startOfWeek.toISOString().split('T')[0], endDate: endOfWeek.toISOString().split('T')[0], label: "이번 주" };
    }
    case "last_month": {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: lastMonth.toISOString().split('T')[0], endDate: lastMonthEnd.toISOString().split('T')[0], label: "지난달" };
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), q * 3, 1);
      const endOfQuarter = new Date(now.getFullYear(), q * 3 + 3, 0);
      return { startDate: startOfQuarter.toISOString().split('T')[0], endDate: endOfQuarter.toISOString().split('T')[0], label: "이번 분기" };
    }
    case "year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31);
      return { startDate: startOfYear.toISOString().split('T')[0], endDate: endOfYear.toISOString().split('T')[0], label: "올해" };
    }
    case "custom": {
      if (timePeriod?.startDate && timePeriod?.endDate) {
        return { startDate: timePeriod.startDate, endDate: timePeriod.endDate, label: `${timePeriod.startDate} ~ ${timePeriod.endDate}` };
      }
      // fallback to this month
    }
    case "month":
    default: {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { startDate: startOfMonth.toISOString().split('T')[0], endDate: endOfMonth.toISOString().split('T')[0], label: "이번 달" };
    }
  }
}

async function fetchTransactionData(
  userId: string, authHeader: string,
  timePeriod?: { type: string; startDate?: string; endDate?: string }
): Promise<TransactionSummary | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !supabaseAnonKey || !userId) return null;

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

    if (error || !transactions) return null;

    console.log(`Found ${transactions.length} transactions for period ${periodLabel}`);

    let totalExpense = 0, totalIncome = 0, expenseCount = 0, incomeCount = 0;
    const categoryMap = new Map<string, { amount: number; count: number }>();

    for (const tx of transactions) {
      if (tx.type === "expense") { totalExpense += tx.amount; expenseCount++; }
      else if (tx.type === "income") { totalIncome += tx.amount; incomeCount++; }
      const cat = tx.category || "미분류";
      const existing = categoryMap.get(cat) || { amount: 0, count: 0 };
      categoryMap.set(cat, { amount: existing.amount + tx.amount, count: existing.count + 1 });
    }

    return {
      totalExpense, totalIncome, expenseCount, incomeCount,
      topCategories: Array.from(categoryMap.entries()).map(([category, data]) => ({ category, ...data })).sort((a, b) => b.amount - a.amount).slice(0, 5),
      recentTransactions: transactions.slice(0, 5).map(tx => ({ description: tx.description, amount: tx.amount, date: tx.transaction_date, category: tx.category })),
      periodLabel
    };
  } catch (error) {
    console.error("fetchTransactionData error:", error);
    return null;
  }
}

function formatDataForPrompt(data: TransactionSummary, periodLabel: string): string {
  const fmt = (n: number) => n.toLocaleString("ko-KR");
  let p = `\n\n## 📊 실시간 데이터 (${periodLabel} 기준)\n`;
  p += `- **총 지출**: ${fmt(data.totalExpense)}원 (${data.expenseCount}건)\n`;
  p += `- **총 수입**: ${fmt(data.totalIncome)}원 (${data.incomeCount}건)\n`;
  if (data.expenseCount === 0 && data.incomeCount === 0) p += `- 해당 기간에 거래 내역이 없습니다.\n`;
  if (data.topCategories.length > 0) {
    p += `\n### 카테고리별 지출\n`;
    for (const cat of data.topCategories) p += `- ${cat.category}: ${fmt(cat.amount)}원 (${cat.count}건)\n`;
  }
  if (data.recentTransactions.length > 0) {
    p += `\n### 최근 거래\n`;
    for (const tx of data.recentTransactions) p += `- ${tx.date}: ${tx.description} - ${fmt(tx.amount)}원 (${tx.category || "미분류"})\n`;
  }
  p += `\n위 데이터를 기반으로 사장님의 질문에 정확하게 답변하세요. 숫자는 실제 데이터입니다.`;
  p += `\n만약 데이터가 0건이면 해당 기간에 기록이 없다고 안내하세요. "연동이 필요합니다"라고 말하지 마세요.`;
  return p;
}

// ============ Tool Calling 스키마 (데이터 필요 시에만 호출됨) ============

const requestDataTool = {
  functionDeclarations: [{
    name: "request_data",
    description: "사용자의 질문에 답하기 위해 실제 거래/매출/지출 데이터 조회가 필요할 때만 호출합니다. 인사, 일상대화, 일반 조언 등에는 호출하지 마세요.",
    parameters: {
      type: "object",
      properties: {
        data_sources: {
          type: "array",
          items: { type: "string", enum: ["card", "bank", "hometax", "employee"] },
          description: "필요한 데이터 소스 목록"
        },
        time_period: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["today", "yesterday", "week", "month", "last_month", "quarter", "year", "custom"] },
            start_date: { type: "string", description: "YYYY-MM-DD" },
            end_date: { type: "string", description: "YYYY-MM-DD" }
          },
          description: "조회 기간"
        }
      },
      required: ["data_sources"]
    }
  }]
};

// ============ 연동 필요 응답 / 범위 외 응답 ============

function buildConnectionRequiredResponse(secretaryName: string, missingSources: string[], intent: string): string {
  const sourceList = missingSources.join(", ");
  const intentDescriptions: Record<string, string> = {
    sales_inquiry: "매출 정보", expense_inquiry: "지출 현황",
    tax_question: "세금 관련 정확한 금액", payroll_inquiry: "급여 현황",
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

function getMissingDataSources(requiredSources: string[], connectionStatus: ConnectionStatus): string[] {
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
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { messages, secretaryName = "김비서", secretaryTone = "polite", secretaryGender = "female", userId } = await req.json();
    if (!messages || messages.length === 0) throw new Error("Messages array is required");

    // 말투 설정
    const toneInstructions: Record<string, string> = {
      polite: "존댓말을 사용하고 정중하게 응답하세요.",
      friendly: "친근하고 편안한 말투로 응답하세요. 반말을 사용해도 됩니다.",
      cute: "귀엽고 애교있는 말투로 응답하세요. '~요', '~해요' 등의 부드러운 어미를 사용하세요.",
    };
    const genderDescription = secretaryGender === "male" ? "남성" : "여성";
    const toneInstruction = toneInstructions[secretaryTone] || toneInstructions.polite;

    const systemPrompt = `당신은 ${secretaryName}입니다. 소상공인의 AI 경영 비서입니다.
성별: ${genderDescription}

${toneInstruction}

## 성격
- 따뜻하고 친근한 비서
- 사장님을 진심으로 응원하는 마음
- 가끔 이모지를 적절히 사용해서 친근함 표현
- 딱딱하게 거절하지 않고 부드럽게 대화
- ${genderDescription} 비서로서 자연스럽게 행동

## 자기소개
"안녕하세요!" 또는 "넌 누구야?" 같은 질문에는:
- 자연스럽게 자기소개 ("안녕하세요, ${secretaryName}예요! 사장님의 경영 비서로 일하고 있어요 😊")
- 할 수 있는 일 간단히 소개 (매출 확인, 세금 안내, 직원 관리 등)
- 성별에 맞는 어투와 표현 사용

## 일상 대화
"심심해", "힘들다", "오늘 어때?", "맛집 추천해줘" 같은 일상 대화에는:
- 공감하며 친근하게 대화
- 자연스럽게 업무 관련 도움 제안
- 너무 딱딱하게 "업무 외"라고 거절하지 않기

## 답변 가능한 범위
- 세금 신고 일정, 부가세/종합소득세 일반 안내
- 인사/노무 관련 일반 질문, 사업 운영 조언, 서비스 사용법 안내
- 일상적인 가벼운 대화

## 주의사항
- 구체적인 금액을 묻는 질문에는 가짜 숫자를 만들지 마세요
- 실제 데이터가 필요하면 request_data 도구를 호출하세요
- 불법적이거나 위험한 요청만 정중히 거절

## 도구 사용 규칙
- 매출/지출/세금/급여/브리핑 등 실제 숫자가 필요한 질문 → request_data 도구 호출
- 인사, 일상대화, 일반 조언, 서비스 안내 → 도구 호출 없이 직접 텍스트로 응답

응답은 마크다운 형식으로 간결하게 작성하세요.`;

    const geminiMessages = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    console.log("Processing message:", lastUserMessage.substring(0, 50));

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 핵심 최적화: AUTO 모드로 1회 호출
    // - 데이터 불필요 → 모델이 텍스트로 직접 응답 (1회 호출 완료)
    // - 데이터 필요 → 모델이 request_data 도구 호출 (+ 데이터 조회 후 1회 추가)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const firstResult = await callGemini(
      GEMINI_API_KEY,
      [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: `네, 알겠습니다. 저는 ${secretaryName}입니다. 사장님의 사업을 도와드리겠습니다. 실제 데이터가 필요한 질문에는 request_data 도구를 호출하겠습니다.` }] },
        ...geminiMessages,
      ],
      {
        tools: [requestDataTool],
        toolConfig: { functionCallingConfig: { mode: "AUTO" } }
      }
    );

    const candidate = firstResult.candidates?.[0]?.content;
    const parts = candidate?.parts || [];

    // 도구 호출이 있는지 확인
    const functionCallPart = parts.find((p: any) => p.functionCall);
    const textPart = parts.find((p: any) => p.text);

    // ─── Case 1: 도구 호출 없음 → 텍스트 응답을 바로 반환 (1회 호출 완료!) ───
    if (!functionCallPart) {
      const responseText = textPart?.text || "죄송합니다, 응답을 생성하지 못했습니다.";
      console.log("Direct response (1 API call), no data needed");

      return new Response(
        JSON.stringify({ response: responseText, intent: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Case 2: request_data 도구 호출됨 → 데이터 조회 필요 ───
    const toolArgs = functionCallPart.functionCall.args || {};
    const dataSources: string[] = toolArgs.data_sources || [];
    const timePeriod = toolArgs.time_period ? {
      type: toolArgs.time_period.type || "month",
      startDate: toolArgs.time_period.start_date,
      endDate: toolArgs.time_period.end_date,
    } : undefined;

    console.log("Data requested (tool call):", { dataSources, timePeriod });

    // 연동 상태 확인
    const authHeader = req.headers.get("Authorization") || "";
    const connectionStatus = await checkConnectionStatus(userId, authHeader);
    const missingSources = getMissingDataSources(dataSources, connectionStatus);

    if (missingSources.length > 0) {
      const connectionResponse = buildConnectionRequiredResponse(secretaryName, missingSources, "data_inquiry");
      return new Response(
        JSON.stringify({ response: connectionResponse, intent: { dataSources, timePeriod }, requiresConnection: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 데이터 조회
    console.log("Fetching data, period:", timePeriod);
    const transactionData = await fetchTransactionData(userId, authHeader, timePeriod);

    if (transactionData) {
      console.log("Transaction data:", {
        totalExpense: transactionData.totalExpense,
        totalIncome: transactionData.totalIncome,
        expenseCount: transactionData.expenseCount,
        periodLabel: transactionData.periodLabel
      });

      const dataContext = formatDataForPrompt(transactionData, transactionData.periodLabel);

      // 데이터 포함하여 2번째 호출 (도구 호출 없이 응답 생성만)
      const dataSystemPrompt = `당신은 ${secretaryName}입니다. 소상공인의 AI 경영 비서입니다.
성별: ${genderDescription}

${toneInstruction}

## 중요 지침
- 아래 제공된 실제 데이터를 기반으로 정확한 숫자를 사용해 답변하세요.
- 데이터에 없는 정보는 추측하지 마세요.
- 데이터가 0건이면 "해당 기간에 기록이 없습니다"라고 안내하세요.
- "연동이 필요합니다" 또는 "데이터 연동"이라는 말을 하지 마세요 (이미 연동된 상태입니다).
- 친근하고 간결하게 핵심을 전달하세요.
- 필요시 개선 조언도 함께 제공하세요.${dataContext}`;

      const dataResult = await callGemini(GEMINI_API_KEY, [
        { role: "user", parts: [{ text: dataSystemPrompt }] },
        { role: "model", parts: [{ text: `네, 실제 데이터를 기반으로 정확하게 답변하겠습니다.` }] },
        ...geminiMessages,
      ]);

      const dataResponse = dataResult.candidates?.[0]?.content?.parts?.[0]?.text
        || "죄송합니다, 응답을 생성하지 못했습니다.";

      console.log("Data response generated (2 API calls total)");

      return new Response(
        JSON.stringify({ response: dataResponse, intent: { dataSources, timePeriod }, hasData: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 데이터 조회 실패 시 → 데이터 없이 응답 (도구 호출 없이)
    const fallbackResult = await callGemini(GEMINI_API_KEY, [
      { role: "user", parts: [{ text: systemPrompt + "\n\n참고: 현재 거래 데이터를 조회했으나 해당 기간에 기록이 없습니다. 이를 사용자에게 안내해주세요." }] },
      { role: "model", parts: [{ text: `네, 알겠습니다.` }] },
      ...geminiMessages,
    ]);

    const fallbackResponse = fallbackResult.candidates?.[0]?.content?.parts?.[0]?.text
      || "죄송합니다, 응답을 생성하지 못했습니다.";

    return new Response(
      JSON.stringify({ response: fallbackResponse, intent: { dataSources, timePeriod } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("=== Gemini API Error Detail ===");
    console.error("Status:", error?.status);
    console.error("Raw body:", error?.body);

    if (error?.status === 429) {
      const errorJson = safeJsonParse(error.body || "");
      console.error("Parsed 429 JSON:", JSON.stringify(errorJson, null, 2));
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
