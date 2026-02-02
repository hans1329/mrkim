import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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

  // examples: "18s", "18.736829758s"
  const m = retryDelay.match(/^(\d+(?:\.\d+)?)s$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  // 사용자 UX를 위해 올림 처리
  return Math.max(0, Math.ceil(n));
}

function buildGemini429Message(geminiErrorJson: any): { message: string; retryAfterSeconds: number | null } {
  const retryAfterSeconds = parseRetryAfterSeconds(geminiErrorJson);

  // Gemini는 429에 "요청 많음"뿐 아니라 Quota/Billing 이슈를 함께 반환할 수 있음.
  const raw = geminiErrorJson?.error?.message;
  const rawMsg = typeof raw === "string" ? raw : "";
  const rawLower = rawMsg.toLowerCase();

  const status = geminiErrorJson?.error?.status;
  const statusStr = typeof status === "string" ? status : "";

  const details = geminiErrorJson?.error?.details;
  const hasQuotaFailure = Array.isArray(details)
    ? details.some((d: any) => typeof d?.["@type"] === "string" && d["@type"].includes("QuotaFailure"))
    : false;

  // 로그에서 확인된 케이스: free tier limit 자체가 0인 상태
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const { messages, secretaryName = "김비서", secretaryTone = "polite" } = await req.json();

    // 말투 설정
    const toneInstructions = {
      polite: "존댓말을 사용하고 정중하게 응답하세요.",
      friendly: "친근하고 편안한 말투로 응답하세요. 반말을 사용해도 됩니다.",
      cute: "귀엽고 애교있는 말투로 응답하세요. '~요', '~해요' 등의 부드러운 어미를 사용하세요.",
    };

    const systemPrompt = `당신은 ${secretaryName}입니다. 소상공인의 AI 경영 비서입니다.

${toneInstructions[secretaryTone as keyof typeof toneInstructions] || toneInstructions.polite}

## 중요: 데이터 연동 상태
현재 사용자의 데이터(홈택스, 카드, 계좌)가 연동되어 있지 않습니다.

**매출, 지출, 세금, 급여 등 실제 데이터가 필요한 질문을 받으면:**
1. 절대로 가짜 숫자나 시뮬레이션 데이터를 제시하지 마세요
2. 대신 다음과 같이 안내하세요:
   - "정확한 [매출/지출/세금 등] 정보를 확인하려면 먼저 데이터 연동이 필요합니다."
   - "설정 > 데이터 연결에서 홈택스, 카드사, 은행 계좌를 연동해주시면 실시간으로 확인해드릴게요."
   - "연동은 1분이면 완료됩니다. 도와드릴까요?"

## 답변 가능한 범위 (데이터 연동 없이도 가능)
- 세금 신고 일정, 부가세/종합소득세 일반 안내
- 인사/노무 관련 일반 질문
- 사업 운영 조언
- 서비스 사용법 안내

## 범위 외 질문
음식점 추천, 개인 상담, 일반 지식 등은 정중히 거절하고 업무 관련 도움을 제안하세요.

응답은 마크다운 형식으로 간결하게 작성하세요.`;

    // Gemini API 포맷으로 변환
    const geminiMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: systemPrompt }] },
          { role: "model", parts: [{ text: "네, 알겠습니다. 저는 " + secretaryName + "입니다. 사장님의 사업을 도와드리겠습니다." }] },
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
      console.error("Gemini API error:", response.status, errorText);
      const errorJson = safeJsonParse(errorText);
      
      if (response.status === 429) {
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
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "죄송합니다, 응답을 생성하지 못했습니다.";

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("chat-ai error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
