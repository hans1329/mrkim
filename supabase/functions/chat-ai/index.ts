import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// ============ 유틸리티 ============

function safeJsonParse(text: string): any | null {
  try { return JSON.parse(text); } catch { return null; }
}

function parseRetryAfterSeconds(geminiErrorJson: any): number | null {
  const details = geminiErrorJson?.error?.details;
  if (!Array.isArray(details)) return null;
  const retryInfo = details.find((d: any) => typeof d?.["@type"] === "string" && d["@type"].includes("RetryInfo"));
  const retryDelay = retryInfo?.retryDelay;
  if (typeof retryDelay !== "string") return null;
  const m = retryDelay.match(/^(\d+(?:\.\d+)?)s$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.max(0, Math.ceil(n)) : null;
}

function buildGemini429Message(geminiErrorJson: any): { message: string; retryAfterSeconds: number | null } {
  const retryAfterSeconds = parseRetryAfterSeconds(geminiErrorJson);
  const raw = geminiErrorJson?.error?.message;
  const rawLower = (typeof raw === "string" ? raw : "").toLowerCase();
  const statusStr = typeof geminiErrorJson?.error?.status === "string" ? geminiErrorJson.error.status : "";
  const details = geminiErrorJson?.error?.details;
  const hasQuotaFailure = Array.isArray(details) && details.some((d: any) => typeof d?.["@type"] === "string" && d["@type"].includes("QuotaFailure"));
  const isQuota = statusStr === "RESOURCE_EXHAUSTED" || hasQuotaFailure || rawLower.includes("quota exceeded") || rawLower.includes("resource exhausted");
  const base = isQuota
    ? "Gemini API 리소스(Quota)가 소진되었습니다. Google 프로젝트의 Billing/Quota를 확인해주세요."
    : "Gemini API 요청이 일시적으로 제한되었습니다(429). 잠시 후 다시 시도해주세요.";
  const suffix = retryAfterSeconds != null ? ` (재시도: 약 ${retryAfterSeconds}초 후)` : "";
  return { message: base + suffix, retryAfterSeconds };
}

// ============ 공통 Gemini 호출 ============

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

const GENERATION_CONFIG = { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024 };

async function callGemini(apiKey: string, contents: any[], options?: { tools?: any[]; toolConfig?: any }): Promise<any> {
  const body: any = { contents, generationConfig: GENERATION_CONFIG, safetySettings: SAFETY_SETTINGS };
  if (options?.tools) body.tools = options.tools;
  if (options?.toolConfig) body.toolConfig = options.toolConfig;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
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

interface ConnectionStatus { hometax: boolean; card: boolean; bank: boolean; employee: boolean; }

async function checkConnectionStatus(userId: string, authHeader: string): Promise<ConnectionStatus> {
  const def: ConnectionStatus = { hometax: false, card: false, bank: false, employee: false };
  if (!userId) return def;
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key) return def;
    const sb = createClient(url, key, { global: { headers: { Authorization: authHeader } } });
    const { data, error } = await sb.from("profiles").select("hometax_connected, card_connected, account_connected").eq("user_id", userId).maybeSingle();
    if (error || !data) return def;
    return { hometax: data.hometax_connected ?? false, card: data.card_connected ?? false, bank: data.account_connected ?? false, employee: false };
  } catch { return def; }
}

// ============ 데이터 조회 ============

interface TransactionSummary {
  totalExpense: number; totalIncome: number; expenseCount: number; incomeCount: number;
  topCategories: { category: string; amount: number; count: number }[];
  recentTransactions: { description: string; amount: number; date: string; category: string | null }[];
  periodLabel: string;
}

function calculateDateRange(tp?: { type: string; startDate?: string; endDate?: string }) {
  const now = new Date();
  const t = tp?.type || "month";
  switch (t) {
    case "today": { const d = now.toISOString().split('T')[0]; return { startDate: d, endDate: d, label: "오늘" }; }
    case "yesterday": { const y = new Date(now); y.setDate(y.getDate()-1); const d = y.toISOString().split('T')[0]; return { startDate: d, endDate: d, label: "어제" }; }
    case "week": { const s = new Date(now); const day = s.getDay(); s.setDate(s.getDate() - day + (day === 0 ? -6 : 1)); const e = new Date(s); e.setDate(e.getDate()+6); return { startDate: s.toISOString().split('T')[0], endDate: e.toISOString().split('T')[0], label: "이번 주" }; }
    case "last_month": { const s = new Date(now.getFullYear(), now.getMonth()-1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { startDate: s.toISOString().split('T')[0], endDate: e.toISOString().split('T')[0], label: "지난달" }; }
    case "quarter": { const q = Math.floor(now.getMonth()/3); const s = new Date(now.getFullYear(), q*3, 1); const e = new Date(now.getFullYear(), q*3+3, 0); return { startDate: s.toISOString().split('T')[0], endDate: e.toISOString().split('T')[0], label: "이번 분기" }; }
    case "year": { return { startDate: new Date(now.getFullYear(),0,1).toISOString().split('T')[0], endDate: new Date(now.getFullYear(),11,31).toISOString().split('T')[0], label: "올해" }; }
    case "custom": { if (tp?.startDate && tp?.endDate) return { startDate: tp.startDate, endDate: tp.endDate, label: `${tp.startDate} ~ ${tp.endDate}` }; }
    default: { const s = new Date(now.getFullYear(), now.getMonth(), 1); const e = new Date(now.getFullYear(), now.getMonth()+1, 0); return { startDate: s.toISOString().split('T')[0], endDate: e.toISOString().split('T')[0], label: "이번 달" }; }
  }
}

async function fetchTransactionData(userId: string, authHeader: string, timePeriod?: { type: string; startDate?: string; endDate?: string }): Promise<TransactionSummary | null> {
  try {
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key || !userId) return null;
    const sb = createClient(url, key, { global: { headers: { Authorization: authHeader } } });
    const { startDate, endDate, label: periodLabel } = calculateDateRange(timePeriod);
    console.log(`Fetching transactions: ${startDate} ~ ${endDate} (${periodLabel})`);
    const { data: txs, error } = await sb.from("transactions").select("id, amount, type, category, description, transaction_date").eq("user_id", userId).gte("transaction_date", startDate).lte("transaction_date", endDate).order("transaction_date", { ascending: false });
    if (error || !txs) return null;
    console.log(`Found ${txs.length} transactions for ${periodLabel}`);
    let totalExpense = 0, totalIncome = 0, expenseCount = 0, incomeCount = 0;
    const catMap = new Map<string, { amount: number; count: number }>();
    for (const tx of txs) {
      if (tx.type === "expense") { totalExpense += tx.amount; expenseCount++; }
      else if (tx.type === "income") { totalIncome += tx.amount; incomeCount++; }
      const c = tx.category || "미분류";
      const e = catMap.get(c) || { amount: 0, count: 0 };
      catMap.set(c, { amount: e.amount + tx.amount, count: e.count + 1 });
    }
    return {
      totalExpense, totalIncome, expenseCount, incomeCount, periodLabel,
      topCategories: Array.from(catMap.entries()).map(([category, d]) => ({ category, ...d })).sort((a, b) => b.amount - a.amount).slice(0, 5),
      recentTransactions: txs.slice(0, 5).map(tx => ({ description: tx.description, amount: tx.amount, date: tx.transaction_date, category: tx.category })),
    };
  } catch (e) { console.error("fetchTransactionData error:", e); return null; }
}

function formatDataForPrompt(data: TransactionSummary, periodLabel: string): string {
  const f = (n: number) => n.toLocaleString("ko-KR");
  let p = `\n\n## 📊 실시간 데이터 (${periodLabel} 기준)\n`;
  p += `- **총 지출**: ${f(data.totalExpense)}원 (${data.expenseCount}건)\n- **총 수입**: ${f(data.totalIncome)}원 (${data.incomeCount}건)\n`;
  if (data.expenseCount === 0 && data.incomeCount === 0) p += `- 해당 기간에 거래 내역이 없습니다.\n`;
  if (data.topCategories.length > 0) { p += `\n### 카테고리별 지출\n`; for (const c of data.topCategories) p += `- ${c.category}: ${f(c.amount)}원 (${c.count}건)\n`; }
  if (data.recentTransactions.length > 0) { p += `\n### 최근 거래\n`; for (const tx of data.recentTransactions) p += `- ${tx.date}: ${tx.description} - ${f(tx.amount)}원 (${tx.category || "미분류"})\n`; }
  p += `\n위 데이터를 기반으로 정확하게 답변하세요. 데이터가 0건이면 "해당 기간에 기록이 없습니다"라고 안내하세요.`;
  return p;
}

// ============ Tool Calling 스키마 (ANY 모드 - 항상 호출) ============

const processMessageTool = {
  functionDeclarations: [{
    name: "process_message",
    description: "사용자 메시지를 처리합니다. 데이터 조회가 필요하면 needs_data=true로, 아니면 response_text에 응답을 포함합니다.",
    parameters: {
      type: "object",
      properties: {
        needs_data: {
          type: "boolean",
          description: "실제 거래/매출/지출 데이터 조회가 필요한지. 인사, 일상대화, 일반 조언은 false. 매출/지출/세금/급여/브리핑 질문은 true."
        },
        response_text: {
          type: "string",
          description: "needs_data가 false일 때 사용자에게 보낼 응답 텍스트. 마크다운 형식. needs_data가 true이면 빈 문자열."
        },
        data_sources: {
          type: "array",
          items: { type: "string", enum: ["card", "bank", "hometax", "employee"] },
          description: "needs_data가 true일 때 필요한 데이터 소스 목록"
        },
        time_period: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["today", "yesterday", "week", "month", "last_month", "quarter", "year", "custom"] },
            start_date: { type: "string" },
            end_date: { type: "string" }
          },
          description: "needs_data가 true일 때 조회 기간"
        }
      },
      required: ["needs_data", "response_text"]
    }
  }]
};

// ============ 연동/범위 외 응답 ============

function buildConnectionRequiredResponse(secretaryName: string, missingSources: string[], intent: string): string {
  const sourceList = missingSources.join(", ");
  return `사장님, **요청하신 정보**를 확인하려면 먼저 데이터 연동이 필요합니다.\n\n📋 **필요한 연동 항목**: ${sourceList}\n\n연동 방법:\n1. **설정 > 데이터 연결**로 이동\n2. 필요한 서비스 선택 후 인증 진행\n3. 연동 완료 후 실시간 데이터 확인 가능\n\n💡 연동은 약 1분이면 완료됩니다.`;
}

function getMissingDataSources(sources: string[], cs: ConnectionStatus): string[] {
  const m: string[] = [];
  for (const s of sources) {
    if (s === "hometax" && !cs.hometax) m.push("홈택스");
    if (s === "card" && !cs.card) m.push("카드사");
    if (s === "bank" && !cs.bank) m.push("은행 계좌");
    if (s === "employee" && !cs.employee) m.push("직원 정보");
  }
  return m;
}

// ============ 메인 핸들러 ============

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { messages, secretaryName = "김비서", secretaryTone = "polite", secretaryGender = "female", userId } = await req.json();
    if (!messages || messages.length === 0) throw new Error("Messages array is required");

    const toneMap: Record<string, string> = {
      polite: "존댓말을 사용하고 정중하게 응답하세요.",
      friendly: "친근하고 편안한 말투로 응답하세요.",
      cute: "귀엽고 애교있는 말투로 응답하세요.",
    };
    const genderDesc = secretaryGender === "male" ? "남성" : "여성";
    const toneInst = toneMap[secretaryTone] || toneMap.polite;

    const systemPrompt = `당신은 ${secretaryName}입니다. 소상공인의 AI 경영 비서입니다.
성별: ${genderDesc}

${toneInst}

## 성격
- 따뜻하고 친근한 비서, 사장님을 진심으로 응원
- 가끔 이모지를 적절히 사용, 딱딱하게 거절하지 않음

## 도구 호출 규칙 (매우 중요!)
반드시 process_message 도구를 호출하세요.

### needs_data = true (데이터 조회 필요):
- "매출 얼마야?", "지출 현황", "세금 얼마?", "급여 현황", "브리핑 해줘", "지난달 지출" 등
- 구체적인 금액/숫자가 필요한 모든 질문
- response_text는 빈 문자열("")로 설정

### needs_data = false (직접 응답):
- 인사: "안녕", "넌 누구야?"
- 일상대화: "심심해", "힘들다"
- 일반 조언: "세금 신고 언제야?", "사업 어떻게 해?"
- 서비스 안내: "뭘 할 수 있어?"
- response_text에 마크다운 형식의 전체 응답을 작성

## 주의사항
- 가짜 숫자를 절대 만들지 마세요
- 불법/위험 요청만 정중히 거절`;

    const geminiMessages = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const lastMsg = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    console.log("Processing message:", lastMsg.substring(0, 50));

    // ━━━ 1단계: ANY 모드 Tool Calling (항상 1회, 확실하게 분류) ━━━
    const result = await callGemini(
      GEMINI_API_KEY,
      [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: `네, 알겠습니다. 모든 메시지에 process_message 도구를 호출하겠습니다.` }] },
        ...geminiMessages,
      ],
      {
        tools: [processMessageTool],
        toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["process_message"] } }
      }
    );

    const fnCall = result.candidates?.[0]?.content?.parts?.[0]?.functionCall;
    if (!fnCall || fnCall.name !== "process_message") {
      // Tool calling 실패 → 텍스트 폴백
      const fallbackText = result.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다, 응답을 생성하지 못했습니다.";
      console.log("Tool calling failed, using text fallback");
      return new Response(JSON.stringify({ response: fallbackText }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const args = fnCall.args || {};
    const needsData = args.needs_data ?? false;
    const responseText = args.response_text || "";

    // ━━━ Case 1: 데이터 불필요 → response_text를 바로 반환 (1회 호출 완료!) ━━━
    if (!needsData) {
      console.log("Direct response via tool (1 API call)");
      return new Response(
        JSON.stringify({ response: responseText || "무엇을 도와드릴까요?", intent: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ━━━ Case 2: 데이터 필요 → 연동 확인 + 데이터 조회 + 2번째 호출 ━━━
    const dataSources: string[] = args.data_sources || [];
    const timePeriod = args.time_period ? { type: args.time_period.type || "month", startDate: args.time_period.start_date, endDate: args.time_period.end_date } : undefined;
    console.log("Data needed:", { dataSources, timePeriod });

    const authHeader = req.headers.get("Authorization") || "";
    const connStatus = await checkConnectionStatus(userId, authHeader);
    const missing = getMissingDataSources(dataSources, connStatus);

    if (missing.length > 0) {
      return new Response(
        JSON.stringify({ response: buildConnectionRequiredResponse(secretaryName, missing, "data_inquiry"), requiresConnection: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 데이터 조회
    const txData = await fetchTransactionData(userId, authHeader, timePeriod);

    if (txData) {
      console.log("Data found:", { expense: txData.totalExpense, income: txData.totalIncome, count: txData.expenseCount, period: txData.periodLabel });
      const dataContext = formatDataForPrompt(txData, txData.periodLabel);
      const dataPrompt = `당신은 ${secretaryName}입니다. 소상공인의 AI 경영 비서입니다.\n성별: ${genderDesc}\n\n${toneInst}\n\n## 중요\n- 아래 실제 데이터를 기반으로 정확한 숫자로 답변\n- 데이터에 없는 정보는 추측 금지\n- 0건이면 "기록이 없습니다" 안내\n- "연동이 필요합니다" 금지 (이미 연동됨)\n- 간결하고 친근하게 핵심 전달${dataContext}`;

      const dataResult = await callGemini(GEMINI_API_KEY, [
        { role: "user", parts: [{ text: dataPrompt }] },
        { role: "model", parts: [{ text: `네, 실제 데이터를 기반으로 정확하게 답변하겠습니다.` }] },
        ...geminiMessages,
      ]);

      const dataResponse = dataResult.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다, 응답을 생성하지 못했습니다.";
      console.log("Data response generated (2 API calls total)");
      return new Response(JSON.stringify({ response: dataResponse, hasData: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 데이터 조회 실패
    const fbResult = await callGemini(GEMINI_API_KEY, [
      { role: "user", parts: [{ text: systemPrompt + "\n\n참고: 데이터를 조회했으나 해당 기간에 기록이 없습니다." }] },
      { role: "model", parts: [{ text: `네, 알겠습니다.` }] },
      ...geminiMessages,
    ]);
    const fbResponse = fbResult.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다, 응답을 생성하지 못했습니다.";
    return new Response(JSON.stringify({ response: fbResponse }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("=== Gemini Error ===", error?.status, error?.body);
    if (error?.status === 429) {
      const errorJson = safeJsonParse(error.body || "");
      const { message, retryAfterSeconds } = buildGemini429Message(errorJson);
      return new Response(JSON.stringify({ error: message, code: "GEMINI_RATE_LIMIT", retry_after_seconds: retryAfterSeconds }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...(retryAfterSeconds != null ? { "Retry-After": String(retryAfterSeconds) } : {}) }
      });
    }
    console.error("chat-ai error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
