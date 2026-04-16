import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Vary": "Accept-Encoding",
};

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

type ChatRole = "user" | "assistant" | "tool";
interface ClientMessage {
  role: ChatRole;
  content: string;
  toolName?: string;
}

interface OnboardingState {
  name?: string | null;
  business_type?: string | null;
  business_number?: string | null;
  hometax_connected?: boolean;
  card_connected?: boolean;
  account_connected?: boolean;
  delivery_connected?: boolean;
}

const TOOLS = [
  {
    name: "save_user_name",
    description:
      "대표님의 호칭(이름)을 추출해 저장합니다. '한석이라고 불러' -> name='한석'",
    parameters: {
      type: "OBJECT",
      properties: { name: { type: "STRING", description: "조사·어미를 제거한 순수 이름" } },
      required: ["name"],
    },
  },
  {
    name: "save_business_type",
    description: "업종을 저장합니다. '치킨집해'→치킨집, '카페해요'→카페.",
    parameters: {
      type: "OBJECT",
      properties: { business_type: { type: "STRING" } },
      required: ["business_type"],
    },
  },
  {
    name: "save_business_number",
    description: "사업자등록번호 10자리를 숫자만 추출해 저장.",
    parameters: {
      type: "OBJECT",
      properties: { business_number: { type: "STRING", description: "하이픈 제거 10자리" } },
      required: ["business_number"],
    },
  },
  {
    name: "start_connection",
    description: "특정 서비스 연동 화면을 엽니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        service: { type: "STRING", enum: ["hometax", "card", "account", "baemin", "coupangeats"] },
      },
      required: ["service"],
    },
  },
  {
    name: "skip_step",
    description: "현재 단계 또는 특정 연동을 건너뜁니다.",
    parameters: {
      type: "OBJECT",
      properties: {
        target: { type: "STRING", enum: ["hometax", "card", "account", "delivery", "current"] },
      },
      required: ["target"],
    },
  },
  {
    name: "finish_onboarding",
    description: "기본 정보가 모두 수집되고 사용자가 더 이상 연동을 원치 않을 때 종료.",
    parameters: { type: "OBJECT", properties: {} },
  },
];

function buildSystemPrompt(state: OnboardingState): string {
  return `당신은 '김비서'라는 이름의 AI 온보딩 비서입니다. 사장님(=대표님)이 처음 사용할 수 있게 안내합니다.

# 절대 규칙
- 사용자를 반드시 "대표님"이라 호칭. '사장님', '고객님', '회원님' 금지.
- 모든 응답은 (1) 직전 입력에 대한 짧은 반응 + (2) 다음 단계 한 가지만. 두 줄 이내, 매우 간결.
- 한 번에 한 가지만 묻고, 이미 수집된 정보는 다시 묻지 않습니다.
- 이모지는 한 응답에 최대 1개. 친근한 ~해요체. JSON·마크다운·코드블록 금지.

# 도구 호출 의무 (텍스트와 함께 같은 턴에 발행)
- 사용자 발화에서 추출 가능하면 같은 응답에서 즉시 functionCall도 함께 발행하세요.
  · 이름/호칭 → save_user_name
  · 업종 → save_business_type
  · 10자리 숫자(사업자번호) → save_business_number
  · 연동 동의 → start_connection
  · 스킵/나중에 → skip_step
  · 모두 끝나면 → finish_onboarding
- 도구 호출 없이 "저장했어요"라고 말하지 마세요. 실제 저장이 안 됩니다.
- 추출한 도구 호출과 함께 반드시 다음 안내 텍스트도 한 번에 출력하세요. (한 라운드에 모든 것 처리)

# 진행 순서 (이미 수집된 항목 건너뛰기)
1. 이름 → 2. 업종(음식점/카페/소매·유통/기타) → 3. 사업자등록번호 10자리
4. 연동 안내 — 홈택스 → 카드 → 계좌 → 배달앱, 한 번에 하나만 권유
5. 모두 끝나면 finish_onboarding

# 현재 수집 상태 (이미 채워진 값은 다시 묻지 말 것)
- 이름: ${state.name || "(미수집)"}
- 업종: ${state.business_type || "(미수집)"}
- 사업자번호: ${state.business_number || "(미수집)"}
- 홈택스: ${state.hometax_connected ? "완료" : "미완료"}
- 카드: ${state.card_connected ? "완료" : "미완료"}
- 계좌: ${state.account_connected ? "완료" : "미완료"}
- 배달앱: ${state.delivery_connected ? "완료" : "미완료"}
`;
}

function toGeminiContents(messages: ClientMessage[]) {
  const out: any[] = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", parts: [{ text: m.content }] });
    } else if (m.role === "assistant") {
      out.push({ role: "model", parts: [{ text: m.content }] });
    } else if (m.role === "tool") {
      out.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: m.toolName || "tool",
            response: { result: m.content },
          },
        }],
      });
    }
  }
  return out;
}

function acceptsGzip(req: Request): boolean {
  const ae = req.headers.get("accept-encoding") || "";
  return ae.toLowerCase().includes("gzip");
}

async function gzipBody(text: string): Promise<Uint8Array> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = await new Response(stream).arrayBuffer();
  return new Uint8Array(buf);
}

async function jsonResponse(req: Request, obj: unknown, status = 200): Promise<Response> {
  const text = JSON.stringify(obj);
  const baseHeaders: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
  if (acceptsGzip(req) && text.length > 512) {
    const gz = await gzipBody(text);
    return new Response(gz, { status, headers: { ...baseHeaders, "Content-Encoding": "gzip" } });
  }
  return new Response(text, { status, headers: baseHeaders });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const body = await req.json().catch(() => ({}));

    // 워밍업 핑: 비싼 작업 없이 바로 OK
    if (body?.warmup === true) {
      return await jsonResponse(req, { ok: true, warmed: true });
    }

    const messages: ClientMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const state: OnboardingState = body?.state || {};

    const systemPrompt = buildSystemPrompt(state);

    // 단일 패스: 텍스트 + functionCall을 한 번에 받기 (mode AUTO)
    const payload = {
      systemInstruction: { role: "system", parts: [{ text: systemPrompt }] },
      contents: toGeminiContents(messages),
      tools: [{ functionDeclarations: TOOLS }],
      toolConfig: { functionCallingConfig: { mode: "AUTO" } },
      generationConfig: { temperature: 0.3, maxOutputTokens: 350 },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    let response: Response;
    try {
      response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini error:", response.status, t);
      return await jsonResponse(req, {
        reply: "잠시 후 다시 말씀해주시겠어요?",
        toolCalls: [],
        done: false,
        error: `gemini_${response.status}`,
      });
    }

    const data = await response.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];

    let replyText = "";
    const toolCalls: { name: string; args: Record<string, unknown> }[] = [];
    for (const p of parts) {
      if (typeof p.text === "string" && p.text.trim()) {
        replyText += (replyText ? "\n" : "") + p.text.trim();
      }
      if (p.functionCall?.name) {
        toolCalls.push({ name: p.functionCall.name, args: p.functionCall.args || {} });
      }
    }

    const done = toolCalls.some((c) => c.name === "finish_onboarding");
    return await jsonResponse(req, { reply: replyText || "", toolCalls, done });
  } catch (e) {
    console.error("onboarding-agent error:", e);
    return await jsonResponse(req, {
      reply: "지금 잠깐 신호가 약하네요. 한 번만 다시 말씀해주시겠어요?",
      toolCalls: [],
      done: false,
      error: e instanceof Error ? e.message : "unknown",
    });
  }
});
