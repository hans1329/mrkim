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

const fmt = (n: number) => n.toLocaleString("ko-KR");

// ============ 공통 Gemini 호출 ============

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

const GENERATION_CONFIG = { temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 2048 };

async function callGemini(apiKey: string, contents: any[]): Promise<any> {
  const body: any = { contents, generationConfig: GENERATION_CONFIG, safetySettings: SAFETY_SETTINGS };
  const MAX_RETRIES = 3;
  let lastError: any = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = Math.min(1000 * Math.pow(2, attempt) + Math.random() * 500, 8000);
      console.log(`Retry attempt ${attempt}/${MAX_RETRIES}, waiting ${Math.round(delayMs)}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return response.json();
    const errorText = await response.text();
    lastError = { status: response.status, body: errorText };
    if (response.status !== 429 && response.status !== 503) throw lastError;
    console.warn(`Gemini API returned ${response.status}, attempt ${attempt + 1}/${MAX_RETRIES}`);
  }
  throw lastError;
}

// ============ Supabase 클라이언트 생성 ============

function createSupabaseClient(authHeader: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { global: { headers: { Authorization: authHeader } } });
}

// ============ 연동 상태 확인 ============

interface ConnectionStatus { hometax: boolean; card: boolean; bank: boolean; }

async function checkConnectionStatus(userId: string, authHeader: string): Promise<ConnectionStatus> {
  const def: ConnectionStatus = { hometax: false, card: false, bank: false };
  if (!userId) return def;
  try {
    const sb = createSupabaseClient(authHeader);
    if (!sb) return def;
    const { data, error } = await sb.from("profiles").select("hometax_connected, card_connected, account_connected").eq("user_id", userId).maybeSingle();
    if (error || !data) return def;
    return { hometax: data.hometax_connected ?? false, card: data.card_connected ?? false, bank: data.account_connected ?? false };
  } catch { return def; }
}

// ============ 기간 계산 ============

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

// ============ 데이터 조회 함수들 ============

// --- 거래내역 (transactions) ---
async function fetchTransactionData(userId: string, authHeader: string, timePeriod?: any) {
  try {
    const sb = createSupabaseClient(authHeader);
    if (!sb || !userId) return null;
    const { startDate, endDate, label: periodLabel } = calculateDateRange(timePeriod);
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
    const topCategories = Array.from(catMap.entries()).map(([category, d]) => ({ category, ...d })).sort((a, b) => b.amount - a.amount).slice(0, 5);
    const recentTransactions = txs.slice(0, 5).map(tx => ({ description: tx.description, amount: tx.amount, date: tx.transaction_date, category: tx.category }));
    return { totalExpense, totalIncome, expenseCount, incomeCount, periodLabel, topCategories, recentTransactions };
  } catch (e) { console.error("fetchTransactionData error:", e); return null; }
}

function formatTransactionPrompt(data: any): string {
  let p = `\n\n## 📊 거래 데이터 (${data.periodLabel} 기준)\n`;
  p += `- **총 지출**: ${fmt(data.totalExpense)}원 (${data.expenseCount}건)\n- **총 수입**: ${fmt(data.totalIncome)}원 (${data.incomeCount}건)\n`;
  if (data.expenseCount === 0 && data.incomeCount === 0) p += `- 해당 기간에 거래 내역이 없습니다.\n`;
  if (data.topCategories.length > 0) { p += `\n### 카테고리별 지출\n`; for (const c of data.topCategories) p += `- ${c.category}: ${fmt(c.amount)}원 (${c.count}건)\n`; }
  if (data.recentTransactions.length > 0) { p += `\n### 최근 거래\n`; for (const tx of data.recentTransactions) p += `- ${tx.date}: ${tx.description} - ${fmt(tx.amount)}원 (${tx.category || "미분류"})\n`; }
  p += `\n위 데이터를 기반으로 정확하게 답변하세요. 데이터가 0건이면 "해당 기간에 기록이 없습니다"라고 안내하세요.`;
  return p;
}

// --- 직원 급여 (employees) ---
async function fetchEmployeeData(userId: string, authHeader: string) {
  try {
    const sb = createSupabaseClient(authHeader);
    if (!sb || !userId) return null;
    const { data: emps, error } = await sb.from("employees")
      .select("name, employee_type, monthly_salary, hourly_rate, weekly_hours, position, status, insurance_national_pension, insurance_health, insurance_employment, insurance_industrial")
      .eq("user_id", userId).eq("status", "재직");
    if (error || !emps) return null;
    console.log(`Found ${emps.length} active employees`);
    let totalSalary = 0;
    const employees = emps.map(emp => {
      let salary = 0;
      if (emp.monthly_salary) { salary = emp.monthly_salary; }
      else if (emp.hourly_rate && emp.weekly_hours) { salary = Math.round(emp.hourly_rate * emp.weekly_hours * 4.345); }
      totalSalary += salary;
      return { name: emp.name, type: emp.employee_type, salary, position: emp.position };
    });
    return { totalSalary, employees, count: emps.length };
  } catch (e) { console.error("fetchEmployeeData error:", e); return null; }
}

function formatEmployeePrompt(data: any): string {
  let p = `\n\n## 📊 직원 급여 현황\n`;
  p += `- **재직 중인 직원**: ${data.count}명\n- **이번 달 예상 총 급여**: ${fmt(data.totalSalary)}원\n`;
  if (data.employees.length > 0) {
    p += `\n### 직원별 급여\n`;
    for (const emp of data.employees) p += `- ${emp.name} (${emp.type}${emp.position ? `, ${emp.position}` : ""}): ${fmt(emp.salary)}원/월\n`;
  }
  p += `\n이 달에 **지급 예정인 금액**으로 안내하세요. 과거형("지출된", "사용된")이 아닌 미래/현재형("지급 예정", "나가야 할")으로 표현하세요.`;
  return p;
}

// --- 세금계산서 (tax_invoices) ---
async function fetchTaxInvoiceData(userId: string, authHeader: string, timePeriod?: any) {
  try {
    const sb = createSupabaseClient(authHeader);
    if (!sb || !userId) return null;
    const { startDate, endDate, label: periodLabel } = calculateDateRange(timePeriod);
    const { data: invoices, error } = await sb.from("tax_invoices")
      .select("invoice_type, supply_amount, tax_amount, total_amount, supplier_name, buyer_name, item_name, invoice_date")
      .eq("user_id", userId).gte("invoice_date", startDate).lte("invoice_date", endDate)
      .order("invoice_date", { ascending: false });
    if (error || !invoices) return null;
    console.log(`Found ${invoices.length} tax invoices for ${periodLabel}`);
    let salesTotal = 0, salesTax = 0, salesCount = 0;
    let purchaseTotal = 0, purchaseTax = 0, purchaseCount = 0;
    for (const inv of invoices) {
      if (inv.invoice_type === "매출") { salesTotal += inv.supply_amount; salesTax += inv.tax_amount; salesCount++; }
      else { purchaseTotal += inv.supply_amount; purchaseTax += inv.tax_amount; purchaseCount++; }
    }
    const vatPayable = salesTax - purchaseTax;
    return { salesTotal, salesTax, salesCount, purchaseTotal, purchaseTax, purchaseCount, vatPayable, periodLabel, recentInvoices: invoices.slice(0, 5) };
  } catch (e) { console.error("fetchTaxInvoiceData error:", e); return null; }
}

function formatTaxInvoicePrompt(data: any): string {
  let p = `\n\n## 📊 세금계산서 현황 (${data.periodLabel})\n`;
  p += `- **매출 세금계산서**: ${data.salesCount}건, 공급가액 ${fmt(data.salesTotal)}원, 부가세 ${fmt(data.salesTax)}원\n`;
  p += `- **매입 세금계산서**: ${data.purchaseCount}건, 공급가액 ${fmt(data.purchaseTotal)}원, 부가세 ${fmt(data.purchaseTax)}원\n`;
  p += `- **예상 부가세 ${data.vatPayable >= 0 ? "납부" : "환급"}액**: ${fmt(Math.abs(data.vatPayable))}원\n`;
  if (data.recentInvoices.length > 0) {
    p += `\n### 최근 세금계산서\n`;
    for (const inv of data.recentInvoices) {
      const counterpart = inv.invoice_type === "매출" ? inv.buyer_name : inv.supplier_name;
      p += `- ${inv.invoice_date} [${inv.invoice_type}] ${counterpart || "미상"}: ${fmt(inv.total_amount)}원${inv.item_name ? ` (${inv.item_name})` : ""}\n`;
    }
  }
  p += `\n위 데이터는 홈택스에서 동기화된 세금계산서 기준입니다. 정확한 숫자로 답변하세요.`;
  return p;
}

// --- 예치금 (deposits) ---
async function fetchDepositData(userId: string, authHeader: string) {
  try {
    const sb = createSupabaseClient(authHeader);
    if (!sb || !userId) return null;
    const { data: deposits, error } = await sb.from("deposits")
      .select("name, type, amount, target_amount, due_date, is_active")
      .eq("user_id", userId).eq("is_active", true);
    if (error || !deposits) return null;
    console.log(`Found ${deposits.length} active deposits`);
    let totalAmount = 0, totalTarget = 0;
    for (const d of deposits) { totalAmount += d.amount; if (d.target_amount) totalTarget += d.target_amount; }
    return { deposits, count: deposits.length, totalAmount, totalTarget };
  } catch (e) { console.error("fetchDepositData error:", e); return null; }
}

function formatDepositPrompt(data: any): string {
  let p = `\n\n## 📊 예치금 현황\n`;
  p += `- **활성 예치금**: ${data.count}건\n- **총 적립 금액**: ${fmt(data.totalAmount)}원\n`;
  if (data.totalTarget > 0) p += `- **총 목표 금액**: ${fmt(data.totalTarget)}원 (달성률: ${Math.round(data.totalAmount / data.totalTarget * 100)}%)\n`;
  if (data.deposits.length > 0) {
    p += `\n### 예치금 목록\n`;
    for (const d of data.deposits) {
      p += `- ${d.name} (${d.type}): ${fmt(d.amount)}원`;
      if (d.target_amount) p += ` / 목표 ${fmt(d.target_amount)}원`;
      if (d.due_date) p += ` (기한: ${d.due_date})`;
      p += `\n`;
    }
  }
  p += `\n위 데이터를 기반으로 정확하게 답변하세요.`;
  return p;
}

// --- 저축 계좌 (savings_accounts) ---
async function fetchSavingsData(userId: string, authHeader: string) {
  try {
    const sb = createSupabaseClient(authHeader);
    if (!sb || !userId) return null;
    const { data: accounts, error } = await sb.from("savings_accounts")
      .select("name, type, bank_name, amount, interest_rate, is_active")
      .eq("user_id", userId).eq("is_active", true);
    if (error || !accounts) return null;
    console.log(`Found ${accounts.length} savings accounts`);
    let totalAmount = 0, totalMonthlyInterest = 0;
    for (const a of accounts) {
      totalAmount += a.amount;
      totalMonthlyInterest += Math.round(a.amount * (a.interest_rate / 100) / 12);
    }
    return { accounts, count: accounts.length, totalAmount, totalMonthlyInterest };
  } catch (e) { console.error("fetchSavingsData error:", e); return null; }
}

function formatSavingsPrompt(data: any): string {
  let p = `\n\n## 📊 저축/투자 현황\n`;
  p += `- **등록 계좌**: ${data.count}개\n- **총 잔액**: ${fmt(data.totalAmount)}원\n- **이번 달 예상 이자**: ${fmt(data.totalMonthlyInterest)}원\n`;
  if (data.accounts.length > 0) {
    p += `\n### 계좌별 현황\n`;
    for (const a of data.accounts) {
      p += `- ${a.name}${a.bank_name ? ` (${a.bank_name})` : ""} [${a.type}]: ${fmt(a.amount)}원, 연 ${a.interest_rate}%\n`;
    }
  }
  p += `\n위 데이터는 사용자가 직접 등록한 저축/투자 정보입니다. 정확한 숫자로 답변하세요.`;
  return p;
}

// --- 자동이체 (auto_transfers) ---
async function fetchAutoTransferData(userId: string, authHeader: string) {
  try {
    const sb = createSupabaseClient(authHeader);
    if (!sb || !userId) return null;
    const { data: transfers, error } = await sb.from("auto_transfers")
      .select("name, amount, recipient, condition, is_active, status, next_execution_at, last_executed_at")
      .eq("user_id", userId);
    if (error || !transfers) return null;
    console.log(`Found ${transfers.length} auto transfers`);
    const active = transfers.filter(t => t.is_active);
    let totalMonthly = 0;
    for (const t of active) totalMonthly += t.amount;
    return { transfers, activeCount: active.length, totalCount: transfers.length, totalMonthly };
  } catch (e) { console.error("fetchAutoTransferData error:", e); return null; }
}

function formatAutoTransferPrompt(data: any): string {
  let p = `\n\n## 📊 자동이체 현황\n`;
  p += `- **활성 자동이체**: ${data.activeCount}건 / 전체 ${data.totalCount}건\n`;
  p += `- **월 총 이체 금액**: ${fmt(data.totalMonthly)}원\n`;
  if (data.transfers.length > 0) {
    p += `\n### 이체 목록\n`;
    for (const t of data.transfers) {
      p += `- ${t.name}: ${fmt(t.amount)}원 → ${t.recipient} (${t.is_active ? "활성" : "비활성"}, ${t.condition})\n`;
    }
  }
  p += `\n위 데이터는 등록된 자동이체 규칙입니다. 정확한 숫자로 답변하세요.`;
  return p;
}

// ============ 키워드 기반 의도 분류 ============

type DataSource = "transaction" | "employee" | "tax_invoice" | "deposit" | "savings" | "auto_transfer";

interface ClassifiedIntent {
  needsData: boolean;
  dataSource: DataSource | null;
  requiresConnection: string | null; // null = 내부 데이터, 연동 불필요
  timePeriod?: { type: string; startDate?: string; endDate?: string };
}

function classifyByKeyword(text: string): ClassifiedIntent {
  const t = text.toLowerCase().trim();

  // 기간 감지
  let timePeriod: { type: string } | undefined;
  if (/오늘/.test(t)) timePeriod = { type: "today" };
  else if (/어제/.test(t)) timePeriod = { type: "yesterday" };
  else if (/이번\s*주|금주/.test(t)) timePeriod = { type: "week" };
  else if (/지난\s*달|저번\s*달|전월/.test(t)) timePeriod = { type: "last_month" };
  else if (/이번\s*달|이달|당월/.test(t)) timePeriod = { type: "month" };
  else if (/분기/.test(t)) timePeriod = { type: "quarter" };
  else if (/올해|금년/.test(t)) timePeriod = { type: "year" };

  // 순서 중요: 구체적인 패턴을 먼저 매칭

  // 자동이체
  if (/자동\s*이체|자동\s*송금|이체\s*규칙|이체\s*설정/.test(t)) {
    return { needsData: true, dataSource: "auto_transfer", requiresConnection: null, timePeriod };
  }

  // 저축/투자
  if (/적금|예금|파킹\s*통장|저축|이자.*얼마|굴리|투자.*현황/.test(t)) {
    return { needsData: true, dataSource: "savings", requiresConnection: null, timePeriod };
  }

  // 예치금/비상금
  if (/예치금|비상금|퇴직금.*적립|부가세.*예치|목표.*금액|적립.*현황/.test(t)) {
    return { needsData: true, dataSource: "deposit", requiresConnection: null, timePeriod };
  }

  // 세금계산서 (일반 세금 질문보다 먼저)
  if (/세금\s*계산서|계산서.*발행|계산서.*현황|매입.*계산서|매출.*계산서/.test(t)) {
    return { needsData: true, dataSource: "tax_invoice", requiresConnection: "hometax", timePeriod };
  }

  // 직원/급여
  if (/급여|월급|임금|직원.*급|인건비|4대.*보험|직원.*몇/.test(t)) {
    return { needsData: true, dataSource: "employee", requiresConnection: null, timePeriod };
  }

  // 세금 일반 (부가세, 종소세 등 - 세금계산서 데이터 기반)
  if (/세금|부가세|종소세|종합소득|세무|신고|납부|홈택스/.test(t)) {
    return { needsData: true, dataSource: "tax_invoice", requiresConnection: "hometax", timePeriod };
  }

  // 매출/지출/거래내역
  if (/매출|수입|수익|지출|비용|결제|소비|얼마|현황|내역|카드.*사용|총액|합계|브리핑|요약|정리/.test(t)) {
    return { needsData: true, dataSource: "transaction", requiresConnection: "card_or_bank", timePeriod };
  }

  // 기간 키워드 + 조회 동사
  if (timePeriod && /얼마|얼만큼|어때|어떻게|알려|보여|확인/.test(t)) {
    return { needsData: true, dataSource: "transaction", requiresConnection: "card_or_bank", timePeriod };
  }

  return { needsData: false, dataSource: null, requiresConnection: null };
}

// ============ 연동 확인 ============

function checkConnectionForSource(source: string | null, conn: ConnectionStatus): string | null {
  if (!source) return null;
  if (source === "hometax" && !conn.hometax) return "홈택스";
  if (source === "card_or_bank" && !conn.card && !conn.bank) return "카드사 또는 은행 계좌";
  return null; // 연동 완료 또는 내부 데이터
}

function buildConnectionRequiredResponse(missingSources: string, voiceMode: boolean): string {
  if (voiceMode) {
    return `사장님, 요청하신 정보를 확인하려면 먼저 ${missingSources} 연동이 필요해요. 설정 메뉴에서 데이터 연결을 진행해주시면 바로 확인해드릴게요.`;
  }
  return `사장님, **요청하신 정보**를 확인하려면 먼저 데이터 연동이 필요합니다.\n\n📋 **필요한 연동 항목**: ${missingSources}\n\n연동 방법:\n1. **설정 > 데이터 연결**로 이동\n2. 필요한 서비스 선택 후 인증 진행\n3. 연동 완료 후 실시간 데이터 확인 가능\n\n💡 연동은 약 1분이면 완료됩니다.`;
}

// ============ 데이터 조회 + 프롬프트 통합 ============

async function fetchAndFormatData(
  dataSource: DataSource,
  userId: string,
  authHeader: string,
  timePeriod?: any
): Promise<{ data: any; prompt: string; emptyMessage: string } | null> {
  switch (dataSource) {
    case "transaction": {
      const data = await fetchTransactionData(userId, authHeader, timePeriod);
      if (!data) return null;
      return { data, prompt: formatTransactionPrompt(data), emptyMessage: "해당 기간에 거래 기록이 없습니다." };
    }
    case "employee": {
      const data = await fetchEmployeeData(userId, authHeader);
      if (!data) return null;
      return { data, prompt: formatEmployeePrompt(data), emptyMessage: "현재 등록된 재직 직원이 없습니다. 직원 관리 메뉴에서 직원을 등록해주세요." };
    }
    case "tax_invoice": {
      const data = await fetchTaxInvoiceData(userId, authHeader, timePeriod);
      if (!data) return null;
      return { data, prompt: formatTaxInvoicePrompt(data), emptyMessage: "해당 기간에 세금계산서 기록이 없습니다." };
    }
    case "deposit": {
      const data = await fetchDepositData(userId, authHeader);
      if (!data) return null;
      return { data, prompt: formatDepositPrompt(data), emptyMessage: "등록된 예치금이 없습니다. 자금관리 메뉴에서 예치금을 등록해보세요." };
    }
    case "savings": {
      const data = await fetchSavingsData(userId, authHeader);
      if (!data) return null;
      return { data, prompt: formatSavingsPrompt(data), emptyMessage: "등록된 저축/투자 계좌가 없습니다. 자금관리 메뉴에서 계좌를 등록해보세요." };
    }
    case "auto_transfer": {
      const data = await fetchAutoTransferData(userId, authHeader);
      if (!data) return null;
      return { data, prompt: formatAutoTransferPrompt(data), emptyMessage: "등록된 자동이체 규칙이 없습니다. 자금관리 메뉴에서 자동이체를 설정해보세요." };
    }
    default: return null;
  }
}

function hasActualData(dataSource: DataSource, data: any): boolean {
  switch (dataSource) {
    case "transaction": return data.expenseCount > 0 || data.incomeCount > 0;
    case "employee": return data.count > 0;
    case "tax_invoice": return data.salesCount > 0 || data.purchaseCount > 0;
    case "deposit": return data.count > 0;
    case "savings": return data.count > 0;
    case "auto_transfer": return data.totalCount > 0;
    default: return false;
  }
}

// ============ 시각화 데이터 구성 ============

interface VisStat { label: string; value: number; format: "currency" | "count" | "percent"; color?: string; }
interface VisChartItem { label: string; value: number; }
interface Visualization {
  stats: VisStat[];
  chart?: { type: "bar"; data: VisChartItem[]; title: string };
}

function buildVisualization(dataSource: DataSource, data: any): Visualization | null {
  switch (dataSource) {
    case "transaction": {
      const stats: VisStat[] = [
        { label: "총 수입", value: data.totalIncome, format: "currency", color: "blue" },
        { label: "총 지출", value: data.totalExpense, format: "currency", color: "red" },
        { label: "순이익", value: data.totalIncome - data.totalExpense, format: "currency", color: "green" },
      ];
      const chart = data.topCategories?.length > 0 ? {
        type: "bar" as const,
        title: "카테고리별 지출",
        data: data.topCategories.slice(0, 5).map((c: any) => ({ label: c.category, value: c.amount })),
      } : undefined;
      return { stats, chart };
    }
    case "employee": {
      return {
        stats: [
          { label: "재직 직원", value: data.count, format: "count" },
          { label: "월 총 급여", value: data.totalSalary, format: "currency", color: "blue" },
        ],
      };
    }
    case "tax_invoice": {
      return {
        stats: [
          { label: "매출 세금계산서", value: data.salesTotal, format: "currency", color: "blue" },
          { label: "매입 세금계산서", value: data.purchaseTotal, format: "currency", color: "red" },
          { label: `부가세 ${data.vatPayable >= 0 ? "납부" : "환급"}`, value: Math.abs(data.vatPayable), format: "currency", color: data.vatPayable >= 0 ? "orange" : "green" },
        ],
      };
    }
    case "deposit": {
      const stats: VisStat[] = [
        { label: "예치금 수", value: data.count, format: "count" },
        { label: "총 적립액", value: data.totalAmount, format: "currency", color: "blue" },
      ];
      if (data.totalTarget > 0) stats.push({ label: "달성률", value: Math.round(data.totalAmount / data.totalTarget * 100), format: "percent", color: "green" });
      return { stats };
    }
    case "savings": {
      return {
        stats: [
          { label: "총 잔액", value: data.totalAmount, format: "currency", color: "blue" },
          { label: "월 예상 이자", value: data.totalMonthlyInterest, format: "currency", color: "green" },
        ],
      };
    }
    case "auto_transfer": {
      return {
        stats: [
          { label: "활성 이체", value: data.activeCount, format: "count" },
          { label: "월 총액", value: data.totalMonthly, format: "currency", color: "blue" },
        ],
      };
    }
    default: return null;
  }
}

// ============ 메인 핸들러 ============

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const { messages, secretaryName = "김비서", secretaryTone = "polite", secretaryGender = "female", userId, voiceMode = false } = await req.json();
    if (!messages || messages.length === 0) throw new Error("Messages array is required");

    const toneMap: Record<string, string> = {
      polite: `존댓말(합쇼체)을 사용하세요.
- "~입니다", "~습니다", "~하시겠습니까?" 형태의 격식체
- 예시: "오늘 매출은 234만원입니다.", "확인해 드리겠습니다.", "궁금하신 점이 있으시면 말씀해 주십시오."
- 정중하고 프로페셔널한 톤 유지`,
      friendly: `친근한 해요체를 사용하세요.
- "~이에요", "~해요", "~할게요" 형태의 부드러운 말투
- 예시: "오늘 매출 234만원이에요!", "제가 확인해 볼게요~", "궁금한 거 있으면 편하게 물어보세요!"
- 가까운 동료처럼 편안하지만 존중하는 톤`,
      cute: `귀엽고 애교 있는 말투를 사용하세요.
- "~이에용", "~했어용", "~해드릴게용~" 형태의 귀여운 어미
- 예시: "오늘 매출 234만원이에용~ 🎉", "앗 그건 제가 확인해볼게용!", "사장님 최고에용~! ✨"
- 밝고 귀여운 에너지로 응원하는 톤, 이모지 적극 활용`,
    };
    const genderDesc = secretaryGender === "male" ? "남성" : "여성";
    const toneInst = toneMap[secretaryTone] || toneMap.polite;

    const followUpInst = voiceMode
      ? `\n- 답변 마지막에 자연스럽게 후속 질문을 유도하세요. 예: "혹시 지출 내역도 확인해볼까요?", "더 궁금한 거 있으세요?"`
      : `\n- 답변 마지막에 자연스럽게 후속 질문을 유도하세요.`;
    const voiceInst = voiceMode ? `\n\n## 🔊 음성 모드\n- 구어체로 자연스럽게 2~3문장\n- 마크다운 금지${secretaryTone === "cute" ? "" : ", 이모지 금지"}\n- 숫자는 한글로 읽기 쉽게\n- "사장님~" 호칭 사용${followUpInst}` : "";
    const voiceDataInst = voiceMode ? `\n- 구어체로 짧게 2~3문장으로 핵심만 답변\n- 마크다운 사용 금지${secretaryTone === "cute" ? "" : ", 이모지 사용 금지"}\n- 숫자는 읽기 쉽게 한글로 표현${followUpInst}` : "";

    const geminiMessages = messages.map((msg: any) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const lastMsg = messages.filter((m: any) => m.role === "user").pop()?.content || "";
    console.log("Processing:", lastMsg.substring(0, 50));
    console.log("Persona:", { secretaryName, secretaryTone, secretaryGender, voiceMode });

    // ━━━ 키워드 분류 ━━━
    const classified = classifyByKeyword(lastMsg);
    console.log("Classification:", { needsData: classified.needsData, source: classified.dataSource, period: classified.timePeriod?.type });

    // ━━━ Case 1: 데이터 불필요 → 단순 대화 ━━━
    if (!classified.needsData || !classified.dataSource) {
      const systemPrompt = `당신은 "${secretaryName}"입니다. 소상공인의 AI 경영 비서입니다.\n성별: ${genderDesc}\n\n## 말투 규칙 (반드시 준수!)\n${toneInst}\n\n위 말투 규칙의 어미를 모든 문장에 일관되게 적용하세요.${voiceInst}\n\n## 자기소개 규칙\n- "이름이 뭐야?", "넌 누구야?", "너 이름은?" 같은 질문에는 반드시 "${secretaryName}"이라고 대답하세요.\n- 자기소개: "${secretaryName}이에요! 사장님의 AI 경영 비서예요."\n\n## 성격\n- 따뜻하고 친근한 비서, 사장님을 진심으로 응원${voiceMode ? "\n- 이모지 대신 말투로 감정 표현" : "\n- 가끔 이모지를 적절히 사용"}\n\n## 주의사항\n- 가짜 숫자를 절대 만들지 마세요\n- 불법/위험 요청만 정중히 거절`;
      const result = await callGemini(GEMINI_API_KEY, [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "네, 알겠습니다." }] },
        ...geminiMessages,
      ]);
      const response = result.candidates?.[0]?.content?.parts?.[0]?.text || "무엇을 도와드릴까요?";
      console.log("Direct response (no data)");
      return new Response(JSON.stringify({ response }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ━━━ Case 2: 데이터 필요 → 연동 확인 + 조회 ━━━
    const authHeader = req.headers.get("Authorization") || "";

    // 연동 확인 (내부 데이터는 스킵)
    if (classified.requiresConnection) {
      const connStatus = await checkConnectionStatus(userId, authHeader);
      const missingSource = checkConnectionForSource(classified.requiresConnection, connStatus);
      if (missingSource) {
        return new Response(
          JSON.stringify({ response: buildConnectionRequiredResponse(missingSource, voiceMode), requiresConnection: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 데이터 조회
    const result = await fetchAndFormatData(classified.dataSource, userId, authHeader, classified.timePeriod);

    if (result && hasActualData(classified.dataSource, result.data)) {
      const visualization = buildVisualization(classified.dataSource, result.data);
      const dataPrompt = `당신은 "${secretaryName}"입니다. 소상공인의 AI 경영 비서입니다.\n성별: ${genderDesc}\n\n## 말투 규칙 (반드시 준수!)\n${toneInst}\n\n위 말투 규칙의 어미를 모든 문장에 일관되게 적용하세요.\n\n## 중요\n- 아래 실제 데이터를 기반으로 정확한 숫자로 답변\n- 데이터에 없는 정보는 추측 금지\n- "연동이 필요합니다" 금지 (이미 연동됨)\n- 간결하고 친근하게 핵심 전달${voiceDataInst}${result.prompt}`;
      const geminiResult = await callGemini(GEMINI_API_KEY, [
        { role: "user", parts: [{ text: dataPrompt }] },
        { role: "model", parts: [{ text: "네, 실제 데이터를 기반으로 정확하게 답변하겠습니다." }] },
        ...geminiMessages,
      ]);
      const response = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다, 응답을 생성하지 못했습니다.";
      console.log(`${classified.dataSource} data response (1 API call)`);
    }

    // 데이터 없음
    const emptyMsg = result?.emptyMessage || "해당 데이터를 찾을 수 없습니다.";
    const noDataPrompt = `당신은 "${secretaryName}"입니다. 소상공인의 AI 경영 비서입니다.\n성별: ${genderDesc}\n\n## 말투 규칙 (반드시 준수!)\n${toneInst}\n\n위 말투 규칙의 어미를 모든 문장에 일관되게 적용하세요.\n\n참고: ${emptyMsg} 사용자에게 친절하게 안내하세요.${voiceDataInst}`;
    const geminiResult = await callGemini(GEMINI_API_KEY, [
      { role: "user", parts: [{ text: noDataPrompt }] },
      { role: "model", parts: [{ text: "네, 알겠습니다." }] },
      ...geminiMessages,
    ]);
    const response = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다, 응답을 생성하지 못했습니다.";
    return new Response(JSON.stringify({ response }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
